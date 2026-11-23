import { assert, test } from "vitest";
import { tlAbilities } from "../src/data/abilities";
import { LEARN_CARDS, LEARN_GROUPS, TIMELINE_CARDS } from "../src/data/questions";
import { TIMELINE } from "../src/data/timeline";
import { sec } from "../src/time";
import type { Slot } from "../src/types";
import { readingMs } from "../src/util";

const ALL = [...LEARN_CARDS, ...TIMELINE_CARDS];
const SLOTS: Slot[] = ["H1", "H2"];

test("every question has one correct answer and no repeated options", () => {
  for (const item of ALL)
    for (const s of SLOTS) {
      const q = item.build(s);
      assert.equal(q.options.filter((o) => o.ok).length, 1, item.id);
      assert.equal(new Set(q.options.map((o) => o.t)).size, q.options.length, item.id);
      assert.ok(q.prompt && q.why && q.rule, item.id);
    }
});

test("pressure reading time: about 4 words a second, at least 2 seconds", () => {
  assert.equal(readingMs(["one two three"]), 2000);
  assert.equal(readingMs(["one two three four five six", "seven eight nine ten"]), 2500);
  for (const item of ALL) {
    const q = item.build("H1"),
      ms = readingMs([q.prompt, ...q.options.map((o) => o.t)]);
    assert.isAtMost(ms, 30000, `${item.id} takes ${ms} ms to read`);
  }
});

test("question ids are unique", () => {
  const ids = ALL.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the timeline runs in time order", () => {
  for (let i = 1; i < TIMELINE.length; i++) assert.isAbove(sec(TIMELINE[i].t), sec(TIMELINE[i - 1].t), TIMELINE[i].n);
});

test("a next-mechanic card never offers a second time before the first time", () => {
  const pointsBack = [
    ["Raw Steel Trophy (the other weapon)", "Raw Steel Trophy (axe or scythe)"],
    ["Assault Evolved (second set)", "Trophy Weapons, then Assault Evolved"],
    ["Void Stardust (second time)", "Trophy Weapons and Void Stardust"],
  ];
  for (const [later, first] of pointsBack) {
    const firstAt = TIMELINE.findIndex((e) => e.n === first);
    assert.isAtLeast(firstAt, 0, first);
    for (let i = 0; i < firstAt; i++) {
      const item = TIMELINE_CARDS.find((x) => x.id === `n-${i}`);
      // The incorrect answers are random, so build each card many times.
      for (let k = 0; k < 50; k++) {
        const options = item?.build("H1").options.map((o) => o.t) ?? [];
        assert.notInclude(options, later, `n-${i}`);
      }
    }
  }
});

test("next-raidwide questions ask for the name, not the exact time", () => {
  const raidwide = TIMELINE_CARDS.filter((x) => x.id.startsWith("r-"));
  assert.isAbove(raidwide.length, 0);
  for (const item of raidwide) {
    const q = item.build("H1");
    for (const o of q.options) assert.notMatch(o.t, /\d+:\d\d/, `${item.id}: ${o.t}`);
    // The correct answer is a row named for raid damage in the fight list. When it is the same
    // raidwide as the one that just happened, it ends with " again".
    const correct = (q.options.find((o) => o.ok)?.t ?? "").replace(/ again$/, "");
    assert.ok(
      TIMELINE.some((e, i) => tlAbilities(i)[0]?.cats.includes("raid") && e.n === correct),
      item.id,
    );
  }
});

test("every Learn card is in exactly one mechanic chip", () => {
  const grouped = LEARN_GROUPS.flatMap((g) => g.ids);
  assert.sameMembers(
    grouped,
    LEARN_CARDS.map((q) => q.id),
    "the chips cover each Learn card",
  );
  assert.equal(new Set(grouped).size, grouped.length, "no card is in two chips");
});
