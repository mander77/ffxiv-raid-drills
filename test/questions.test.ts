import { test, assert } from "vitest";
import { MECH, DEATH, NEXT_ITEMS } from "../src/data/questions";
import { JOB } from "../src/data/jobs";
import { TL } from "../src/data/timeline";
import type { Slot } from "../src/types";

const ALL = [...MECH, ...DEATH, ...NEXT_ITEMS, ...JOB];
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
    assert.ok(TL.some(e => e.k === "raidwide" && e.n === q.options.find(o => o.ok)?.t), item.id);
  }
});

test("Someone died questions say the time now, and the countdowns add up", () => {
  let checked = 0;
  for(const d of DEATH){
    if(d.time === "Any time") continue;
    assert.match(d.time, /^Now \d+:\d\d$/, d.id);
    const now = d.time.slice(4), prompt = d.build("H1").prompt;
    assert.ok(prompt.startsWith("It is " + now), d.id);
    for(const [, at, secs] of prompt.matchAll(/(\d+:\d\d)(?:,| \() ?(\d+) seconds from now/g)){
      assert.equal(Number(secs), toSec(at) - toSec(now), d.id + ": " + at);
      checked++;
    }
  }
  assert.isAtLeast(checked, 10, "only " + checked + " countdowns found");
});
