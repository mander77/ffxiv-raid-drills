import { test } from "node:test";
import assert from "node:assert/strict";
import { MECH, DEATH, NEXT_ITEMS } from "../js/data/questions.js";
import { JOB } from "../js/data/jobs.js";
import { TL } from "../js/data/timeline.js";

const ALL = [...MECH, ...DEATH, ...NEXT_ITEMS, ...JOB];
const toSec = t => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };

test("every question has one right answer and no repeated options", () => {
  for(const item of ALL) for(const s of ["H1", "H2"]){
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
  for(let i = 1; i < TL.length; i++) assert.ok(toSec(TL[i].t) > toSec(TL[i - 1].t), TL[i].n);
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
  assert.ok(checked >= 10, "only " + checked + " countdowns found");
});
