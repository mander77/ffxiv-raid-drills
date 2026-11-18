import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS, buildAssault, buildOrbital, nextPuddle } from "../js/data/drills.js";
import { inZone } from "../js/geometry.js";

const RUNS = 300;
const SLOTS = ["H1", "H2"];

test("every map drill builds for both slots and every variant", () => {
  for(const m of MAPS) for(const s of SLOTS) for(const v of m.variants || [null]){
    const sc = m.build(s, v);
    assert.ok(sc.steps.length > 0, m.id);
    for(const st of sc.steps) assert.ok(st.z || st.zf, m.id + ": step without a zone");
    assert.ok(sc.setup && sc.rule, m.id);
  }
});

test("Assault Evolved: the faced weapon goes first, then clockwise", () => {
  for(let i = 0; i < RUNS; i++){
    const A = buildAssault("H1");
    const a = A.W.map(w => w.a);
    const d1 = (a[1] - a[0] + 360) % 360, d2 = (a[2] - a[0] + 360) % 360;
    assert.ok(d1 > 0 && d1 < d2, "order " + a.join(","));
    assert.equal(A.states[0].f, a[0], "the boss faces the first weapon");
    assert.deepEqual(new Set(A.W.map(w => w.type)), new Set(["axe", "sword", "scythe"]));
  }
});

test("Assault Evolved: H1 stands at the scythe butt, H2 at the blade end", () => {
  for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    const A = buildAssault(s);
    const k = A.W.findIndex(w => w.type === "scythe");
    const g = A.overlays.find(o => o.t === "scythe");
    const butt = [g.x - g.ux * 10, g.y - g.uy * 10], blade = [g.x + g.ux * 8, g.y + g.uy * 8];
    assert.equal(inZone(butt, A.steps[k].z), s === "H1");
    assert.equal(inZone(blade, A.steps[k].z), s === "H2");
  }
});

test("Assault Evolved: the sword pocket is behind the boss, never on him", () => {
  for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    const A = buildAssault(s);
    const k = A.W.findIndex(w => w.type === "sword");
    const z = A.steps[k].z, boss = A.states[k + 1];
    assert.ok(inZone(z.label, z), "the shown spot is inside the zone");
    assert.ok(!inZone([boss.x, boss.y], z), "the boss's own spot");
  }
});

test("Void Stardust: the next puddle goes just outside the last one, clockwise", () => {
  const z = nextPuddle([{drop:[50, 33]}]);
  assert.ok(inZone([59.5, 36.5], z), "small step clockwise");
  assert.ok(inZone(z.label, z), "the shown spot");
  assert.ok(!inZone([67, 50], z), "far step");
  assert.ok(!inZone([40.5, 36.5], z), "counterclockwise");
  assert.ok(!inZone([52, 35], z), "inside the last puddle");
});

test("Orbital Omen: Hector's dodge is safe for every pattern", () => {
  const spot = (c, r) => [c === 1 ? 38 : 62, r === 1 ? 44 : 56];
  for(let i = 0; i < RUNS; i++){
    const O = buildOrbital(), V = [], H = [];
    for(const o of O.overlays) if(o.t === "portal") (o.vert ? V : H)[o.n - 1] = Math.floor((o.vert ? o.x : o.y) / 25);
    assert.ok([1, 2].includes(V[1]) && [1, 2].includes(H[1]), "the #2 lines cross in a middle square");
    const path = [spot(V[1], H[1]), spot(3 - V[1], H[0]), spot(V[1], H[1])];
    O.steps.forEach((st, k) => assert.ok(inZone(path[k], st.z), "step " + (k + 1)));
    assert.ok(!inZone(path[0], O.steps[1].z), "staying put gets hit by the #2 lines");
  }
});

test("Meteorain: H1 drops inside the boss hitbox, H2 farther out on the SW line", () => {
  const drill = MAPS.find(m => m.id === "m-meteor-2");
  const h1 = drill.build("H1").steps[0].z, h2 = drill.build("H2").steps[0].z;
  assert.ok(inZone([44, 44], h1));
  assert.ok(!inZone([37.5, 38], h1), "just outside the hitbox");
  assert.ok(inZone([26, 74], h2));
  assert.ok(!inZone([43, 57], h2), "on top of the first SW rock");
});
