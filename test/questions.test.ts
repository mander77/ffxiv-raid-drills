import { test, assert } from "vitest";
import { LEARN_CARDS, TIMELINE_CARDS, LEARN_GROUPS } from "../src/data/questions";
import { TIMELINE } from "../src/data/timeline";
import { tlAbilities } from "../src/data/abilities";
import { readingMs } from "../src/util";
import { sec } from "../src/time";
import type { Slot } from "../src/types";

const ALL = [...LEARN_CARDS, ...TIMELINE_CARDS];
const SLOTS: Slot[] = ["H1", "H2"];

test("every question has one right answer and no repeated options", () => {
  for(const item of ALL) for(const s of SLOTS){
    const q = item.build(s);
    assert.equal(q.options.filter(o => o.ok).length, 1, item.id);
    assert.equal(new Set(q.options.map(o => o.t)).size, q.options.length, item.id);
    assert.ok(q.prompt && q.why && q.rule, item.id);
  }
});

test("pressure reading time: about 4 words a second, at least 2 seconds", () => {
  assert.equal(readingMs(["one two three"]), 2000);
  assert.equal(readingMs(["one two three four five six", "seven eight nine ten"]), 2500);
  for(const item of ALL){
    const q = item.build("H1"), ms = readingMs([q.prompt, ...q.options.map(o => o.t)]);
    assert.isAtMost(ms, 30000, item.id + " takes " + ms + " ms to read");
  }
});

test("question ids are unique", () => {
  const ids = ALL.map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the timeline runs in time order", () => {
  for(let i = 1; i < TIMELINE.length; i++) assert.isAbove(sec(TIMELINE[i].t), sec(TIMELINE[i - 1].t), TIMELINE[i].n);
});

test("next-raidwide questions ask for the name, not the exact time", () => {
  const raidwide = TIMELINE_CARDS.filter(x => x.id.startsWith("r-"));
  assert.isAbove(raidwide.length, 0);
  for(const item of raidwide){
    const q = item.build("H1");
    for(const o of q.options) assert.notMatch(o.t, /\d+:\d\d/, item.id + ": " + o.t);
    // The right answer is a row named for raid damage in the fight list. When it is the same
    // raidwide as the one that just happened, it ends with " again".
    const right = (q.options.find(o => o.ok)?.t ?? "").replace(/ again$/, "");
    assert.ok(TIMELINE.some((e, i) => tlAbilities(i)[0]?.cats.includes("raid") && e.n === right), item.id);
  }
});

test("every Learn card is in exactly one mechanic chip", () => {
  const grouped = LEARN_GROUPS.flatMap(g => g.ids);
  assert.sameMembers(grouped, LEARN_CARDS.map(q => q.id), "the chips cover each Learn card");
  assert.equal(new Set(grouped).size, grouped.length, "no card is in two chips");
});
