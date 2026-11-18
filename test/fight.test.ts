import { test, assert } from "vitest";
import { buildFight, sec, clock } from "../src/data/fight";
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
