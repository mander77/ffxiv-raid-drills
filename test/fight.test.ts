import { test, assert } from "vitest";
import { buildFight, sec, clock } from "../src/data/fight";
import { MAPS } from "../src/data/drills";
import { inZone, rotZone, zoneCenter } from "../src/geometry";
import type { Slot, StepResult } from "../src/types";

const RUNS = 200;
const SLOTS: Slot[] = ["H1", "H2"];

test("clock and sec turn fight times both ways", () => {
  assert.equal(sec("1:24"), 84);
  assert.equal(clock(84), "1:24");
  assert.equal(clock(sec("0:05")), "0:05");
});

test("every mechanic has one hit time per step, in order, inside the fight", () => {
  for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    const f = buildFight(s);
    let prevFrom = -1;
    for(const g of f.segs){
      assert.equal(g.due.length, g.scene.steps.length, g.title + ": one hit time per step");
      assert.isAbove(g.from, prevFrom, g.title + ": mechanics in fight order");
      g.due.forEach((d, j) => assert.isAbove(d, j ? g.due[j - 1] : g.from - 0.01, g.title + ": hit times in order"));
      assert.isBelow(g.due[g.due.length - 1], f.end, g.title + ": before the end");
      prevFrom = g.from;
    }
  }
});

test("every click is due on a timeline line, and the lines run in time order", () => {
  for(let i = 0; i < 20; i++){
    const f = buildFight("H1");
    f.events.forEach((e, j) => assert.isAtLeast(e.t, j ? f.events[j - 1].t : 0, e.name));
    for(const g of f.segs) for(const d of g.due)
      assert.ok(f.events.some(e => Math.abs(e.t - d) < 0.05), g.title + ": nothing on the timeline at " + d);
  }
});

test("the boss turns to the first weapon when his cast starts, at least 6 seconds before the hit", () => {
  for(let i = 0; i < 20; i++){
    const f = buildFight("H1");
    const set1 = f.segs.find(g => g.title === "Assault Evolved"), set2 = f.segs.find(g => g.title.startsWith("Void Stardust into"));
    if(!set1?.turn || !set2?.turn) throw new Error("both Assault Evolved sets need a turn time");
    assert.closeTo(set1.turn.at, 42.2, 0.05, "first set: 0:48.2 minus the 6.0 s cast");
    assert.closeTo(set2.turn.at, 86.7, 0.05, "second set: 1:32.7 minus the 6.0 s cast");
    assert.isAtLeast(set1.due[0] - set1.turn.at, 6, "time to react before the first hit");
    assert.isAtLeast(set2.due[5] - set2.turn.at, 6, "time to react before the first weapon of the second set");
    assert.equal(set1.turn.f, set1.scene.bossAt?.(0).f, "he faces the first weapon of the first set");
  }
});

test("the drill list can reach every Phase 1 drill on the fight clock", () => {
  const ids = new Set(MAPS.map(m => m.id)), phase1 = MAPS.find(m => m.id === "m-raw-axe")?.phase;
  for(let i = 0; i < 20; i++){
    const covered = new Set(buildFight("H1").segs.flatMap(g => g.drills));
    for(const id of covered) assert.ok(ids.has(id), "the fight names a drill that does not exist: " + id);
    for(const m of MAPS.filter(x => x.phase === phase1)) assert.ok(covered.has(m.id), m.title + " has no place in the fight");
  }
});

test("the second Raw Steel Trophy and the second Void Stardust go the other way", () => {
  for(let i = 0; i < RUNS; i++){
    const f = buildFight("H1");
    const raw = f.segs.filter(g => g.title.startsWith("Raw Steel Trophy")).map(g => g.title.split(": ")[1]);
    assert.sameMembers(raw, ["axe", "scythe"]);
    const first = f.segs.find(g => g.title.startsWith("Void Stardust into"))?.scene.steps[4].q ?? "";
    const again = f.segs.find(g => g.title === "Void Stardust again")?.scene.steps[3].q ?? "";
    assert.notEqual(/Comet/.test(first), /Comet/.test(again), "one spread and one stack");
  }
});

test("Watch the right moves: the spot it clicks is right for every step", () => {
  for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    for(const g of buildFight(s).segs){
      const results: StepResult[] = [];
      g.scene.steps.forEach((st, j) => {
        const base = st.zf ? st.zf(results) : st.z;
        if(!base) throw new Error(g.title + ": step " + (j + 1) + " has no zone");
        const zone = rotZone(base, g.k), p = zoneCenter(zone);
        assert.ok(inZone(p, zone), g.title + ": step " + (j + 1));
        results.push({p, ok:true, z:zone, drop:st.drop ? p : null});
      });
    }
  }
});
