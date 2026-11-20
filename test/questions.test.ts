import { test, assert } from "vitest";
import { MECH, NEXT_ITEMS } from "../src/data/questions";
import { TL } from "../src/data/timeline";
import { tlAbilities } from "../src/data/abilities";
import { readingMs } from "../src/util";
import type { Slot } from "../src/types";

const ALL = [...MECH, ...NEXT_ITEMS];
const SLOTS: Slot[] = ["H1", "H2"];
const toSec = (t: string): number => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };

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
  for(let i = 1; i < TL.length; i++) assert.isAbove(toSec(TL[i].t), toSec(TL[i - 1].t), TL[i].n);
});

test("next-raidwide questions ask for the name, not the exact time", () => {
  const raidwide = NEXT_ITEMS.filter(x => x.id.startsWith("r-"));
  assert.isAbove(raidwide.length, 0);
  for(const item of raidwide){
    const q = item.build("H1");
    for(const o of q.options) assert.notMatch(o.t, /\d+:\d\d/, item.id + ": " + o.t);
    // The right answer is a row named for raid damage in the fight list.
    assert.ok(TL.some((e, i) => tlAbilities(i)[0]?.cats.includes("raid") && e.n === q.options.find(o => o.ok)?.t), item.id);
  }
});
