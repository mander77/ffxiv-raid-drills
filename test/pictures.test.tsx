import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vitest";
import { WAYMARKS } from "../src/components/arena/Arena";
import { DOT_R } from "../src/components/arena/BossMark";
import { LearnPicture } from "../src/components/arena/LearnPicture";
import { SPLIT_HALF_W } from "../src/data/fights/m11s/attacks";
import { LEARN_PICTURES } from "../src/data/fights/m11s/pictures";
import { LEARN_CARDS } from "../src/data/fights/m11s/questions";
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
/** Whether a label's box reaches into the boss's round dot: the box's nearest point to his middle
    is inside the dot, by more than `pad`. */
const onDot = (b: Box, boss: { x: number; y: number }, pad: number): boolean => {
  const nx = Math.min(Math.max(boss.x, b[0]), b[2]);
  const ny = Math.min(Math.max(boss.y, b[1]), b[3]);
  return Math.hypot(nx - boss.x, ny - boss.y) < DOT_R - pad;
};
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
        const where = `${item.id} ${s} ${view}`;
        boxes.forEach((b, i) => {
          if (WAYMARK_BOXES.some((w) => overlap(b, w, 0.2))) problems.push(`${where}: a label under a waymark`);
          if (f.boss && onDot(b, f.boss, 0.2)) problems.push(`${where}: a label on the boss's dot`);
          // A split arena's platforms reach past 0 and 100.
          const [left, right] = f.split ? [50 - SPLIT_HALF_W, 50 + SPLIT_HALF_W] : [0, 100];
          if (b[0] < left - 0.5 || b[2] > right + 0.5 || b[1] < -0.5 || b[3] > 100.5) problems.push(`${where}: a label off the arena`);
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

test("Ecliptic towers show their soakers: a T on a tank tower, 2 dots on a two-player tower", () => {
  for (const s of SLOTS) {
    const towers = LEARN_PICTURES["k-ecl-prio"]?.(s).overlays.filter((o) => o.t === "tower") ?? [];
    assert.deepEqual(
      towers.map((t) => [t.soak, t.tank ?? false]),
      [
        [1, true],
        [1, true],
        [2, false],
        [2, false],
      ],
      s,
    );
    for (const id of ["k-ecl-center", "k-ecl-tether"]) {
      const tower = LEARN_PICTURES[id]?.(s).overlays.find((o) => o.t === "tower");
      assert.equal(tower?.t === "tower" ? tower.soak : undefined, 2, `${id} ${s}`);
    }
  }
});

test("the Heartbreak Kick tower shows 8 dots: the party can soak it", () => {
  const tower = LEARN_PICTURES["k-hb"]?.("H1").overlays.find((o) => o.t === "tower");
  assert.equal(tower?.t === "tower" ? tower.soak : undefined, 8);
});
