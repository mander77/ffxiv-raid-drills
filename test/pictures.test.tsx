import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vitest";
import { WAYMARKS } from "../src/components/arena/Arena";
import { LearnPicture } from "../src/components/arena/LearnPicture";
import { LEARN_PICTURES } from "../src/data/pictures";
import { LEARN_CARDS } from "../src/data/questions";
import type { Overlay, Picture, Preview, Slot } from "../src/types";

/** A Learn picture as SVG text. */
const figSVG = (f: Picture, answered: boolean, label: string, preview?: Preview): string =>
  renderToStaticMarkup(<LearnPicture fig={f} answered={answered} label={label} preview={preview} />);

const SLOTS: Slot[] = ["H1", "H2"];

test("every Mechanics question has an arena picture for both slots", () => {
  for (const item of LEARN_CARDS) {
    const make = LEARN_PICTURES[item.id];
    if (!make) throw new Error(`${item.id} has no picture`);
    for (const s of SLOTS) {
      const f = make(s),
        before = figSVG(f, false, ""),
        after = figSVG(f, true, "");
      assert.include(before, "<svg", item.id);
      assert.notInclude(before, 'class="zone ok"', `${item.id}: the answer shows before you answer`);
      if (f.answer?.length) assert.include(after, 'class="zone ok"', `${item.id}: the answer does not show after you answer`);
    }
  }
});

test("every answer has a preview, and no preview looks like the correct answer", () => {
  for (const item of LEARN_CARDS)
    for (const s of SLOTS) {
      const make = LEARN_PICTURES[item.id];
      if (!make) continue;
      const f = make(s),
        answers = item.build(s).options;
      assert.equal(f.options?.length, answers.length, `${item.id} ${s}: one preview for each answer`);
      f.options?.forEach((p, k) => {
        const svg = figSVG(f, false, "", p);
        assert.notInclude(svg, 'class="zone ok"', `${item.id} answer ${k + 1}: a preview shows the green answer zone`);
        assert.isAbove(p.pieces.length + (p.zones?.length ?? 0), 0, `${item.id} answer ${k + 1}: the preview draws nothing`);
        if (p.zones?.length) assert.include(svg, 'class="zone pick"', item.id);
      });
    }
});

/* Labels (tags and role marks) as boxes, in arena units: [left, top, right, bottom]. */
type Box = [number, number, number, number];
const boxOf = (o: Overlay): Box | null => {
  if (o.t === "tag") {
    const w = o.s.length * 1.75 + 2.4;
    return [o.x - w / 2, o.y - 1.9, o.x + w / 2, o.y + 1.9];
  }
  if (o.t === "mark") return [o.x - 2.4, o.y - 2.4, o.x + 2.4, o.y + 2.4];
  return null;
};
const overlap = (a: Box, b: Box, pad: number): boolean => a[0] < b[2] - pad && b[0] < a[2] - pad && a[1] < b[3] - pad && b[1] < a[3] - pad;
const WAYMARK_BOXES: Box[] = WAYMARKS.map((w) => {
  const r = w.sq ? 3 : 3.2;
  return [w.x - r, w.y - r, w.x + r, w.y + r];
});

test("no label hides under a waymark or the boss, runs off the arena, or covers another label", () => {
  const problems: string[] = [];
  for (const item of LEARN_CARDS)
    for (const s of SLOTS) {
      const make = LEARN_PICTURES[item.id];
      if (!make) continue;
      const f = make(s);
      const views: Array<[string, Overlay[]]> = [
        ["setup", [...f.overlays, ...(f.before ?? [])]],
        ["after", [...f.overlays, ...(f.after ?? [])]],
        ...(f.options ?? []).map((p, k): [string, Overlay[]] => [`answer ${k + 1}`, [...f.overlays, ...p.pieces]]),
      ];
      for (const [view, pieces] of views) {
        // TS note: flatMap with [] or [b] drops the nulls, and TypeScript knows the result is Box[].
        const boxes = pieces.flatMap((o) => {
          const b = boxOf(o);
          return b ? [b] : [];
        });
        const boss: Box | null = f.boss ? [f.boss.x - 3.4, f.boss.y - 3.4, f.boss.x + 3.4, f.boss.y + 3.4] : null;
        const where = `${item.id} ${s} ${view}`;
        boxes.forEach((b, i) => {
          if (WAYMARK_BOXES.some((w) => overlap(b, w, 0.2))) problems.push(`${where}: a label under a waymark`);
          if (boss && overlap(b, boss, 0.2)) problems.push(`${where}: a label under the boss`);
          if (b[0] < -0.5 || b[2] > 100.5 || b[1] < -0.5 || b[3] > 100.5) problems.push(`${where}: a label off the arena`);
          if (boxes.slice(i + 1).some((c) => overlap(b, c, 0.4))) problems.push(`${where}: two labels on top of each other`);
        });
      }
    }
  assert.deepEqual(problems, []);
});

test("every picture belongs to a Mechanics question", () => {
  const ids = new Set(LEARN_CARDS.map((m) => m.id));
  for (const id of Object.keys(LEARN_PICTURES)) assert.ok(ids.has(id), `${id} is not a Mechanics question`);
});

test("the pictures are the same every time, so the answer cannot move after you pick", () => {
  for (const item of LEARN_CARDS)
    for (const s of SLOTS) {
      const make = LEARN_PICTURES[item.id];
      if (make) assert.equal(figSVG(make(s), true, ""), figSVG(make(s), true, ""), item.id);
    }
});
