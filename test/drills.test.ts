import { test, assert } from "vitest";
import { MAPS, buildAssault, buildAssault2, buildUltimate, buildOrbital, nextPuddle, cometSpread, changes, assaultScene, ultimateScene, facingNext, type Run } from "../src/data/drills";
import { angOf, inZone, zoneCenter } from "../src/geometry";
import type { Point, ScytheOverlay, Slot, StepResult, Zone } from "../src/types";

const RUNS = 300;
const SLOTS: Slot[] = ["H1", "H2"];

/** Narrow a step's zone to the fixed kind, failing the test when it is missing. */
function zoneOf(z: Zone | undefined): Zone {
  if(!z) throw new Error("step has no fixed zone");
  return z;
}

test("every map drill builds for both slots and every variant", () => {
  for(const m of MAPS) for(const s of SLOTS) for(const v of m.variants ?? [null]){
    const sc = m.build(s, v);
    assert.isAbove(sc.steps.length, 0, m.id);
    for(const st of sc.steps) assert.ok(st.z || st.zf, m.id + ": step without a zone");
    assert.ok(sc.setup && sc.rule, m.id);
  }
});

test("drills with no random parts build the same pattern every time", () => {
  // JSON leaves out the zone functions, but keeps every drawn piece and every fixed zone.
  for(const m of MAPS.filter(x => !changes(x))) for(const s of SLOTS){
    const first = JSON.stringify(m.build(s, null));
    for(let i = 0; i < 20; i++) assert.equal(JSON.stringify(m.build(s, null)), first, m.id + " changed between builds, so mark it random");
  }
  assert.equal(MAPS.filter(x => !changes(x)).length, 10, "10 fixed drills");
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

test("Assault Evolved, second set: each weapon faces where he jumps from, the first faces the middle", () => {
  for(let i = 0; i < RUNS; i++){
    const A = buildAssault2("H1");
    assert.isNull(A.states[0].f, "the boss does not point at the first weapon");
    let prev: Point = [50, 50];
    A.W.forEach((w, k) => {
      if(!w.axis) throw new Error("every second-set weapon is turned");
      const l = Math.hypot(w.p[0] - prev[0], w.p[1] - prev[1]), t: Point = [(w.p[0] - prev[0]) / l, (w.p[1] - prev[1]) / l];
      // The long side lies square across his jump into it (the first: across the line to the middle).
      assert.closeTo(w.axis[0] * t[0] + w.axis[1] * t[1], 0, 1e-9, "weapon " + (k + 1) + " is square to his jump");
      // The long side runs from the butt to the tip, so the butt is on his left: u . left < 0.
      assert.isBelow(w.axis[0] * t[1] - w.axis[1] * t[0], 0, "weapon " + (k + 1) + ": the butt is on his left");
      prev = w.p;
    });
    const a = A.W.map(w => w.a), d1 = (a[1] - a[0] + 360) % 360, d2 = (a[2] - a[0] + 360) % 360;
    assert.ok(d1 > 0 && d1 < d2, "clockwise after the first");
  }
});

const RUN_BUILDERS: Record<string, (s: Slot) => Run> = {buildAssault, buildAssault2, buildUltimate};

test("weapon runs: H1 stands at the scythe butt, H2 at the blade end", () => {
  for(const [name, build] of Object.entries(RUN_BUILDERS)) for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    const R = build(s);
    R.W.forEach((w, k) => {
      if(w.type !== "scythe") return;
      // A type predicate: after find, TypeScript knows g is a scythe overlay with ux, uy and so on.
      const g = R.overlays.find((o): o is ScytheOverlay => o.t === "scythe" && o.spawn === k);
      if(!g) throw new Error(name + ": no scythe drawn");
      const butt: Point = [g.x - g.ux * 10, g.y - g.uy * 10], blade: Point = [g.x + g.ux * 8, g.y + g.uy * 8];
      const z = zoneOf(R.steps[k].z);
      assert.equal(inZone(butt, z), s === "H1", name);
      assert.equal(inZone(blade, z), s === "H2", name);
    });
  }
});

test("weapon runs: the sword pocket is behind the boss, never on him", () => {
  for(const [name, build] of Object.entries(RUN_BUILDERS)) for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    const R = build(s);
    R.W.forEach((w, k) => {
      if(w.type !== "sword") return;
      const z = zoneOf(R.steps[k].z), boss = R.states[k + 1];
      if(!("fn" in z)) throw new Error(name + ": the sword zone is a rule zone");
      assert.ok(inZone(z.label, z), name + ": the shown spot is inside the zone");
      assert.notOk(inZone([boss.x, boss.y], z), name + ": the boss's own spot");
      // Relative to the boss, who faces the way he dashed: the pocket is behind him (never
      // relative north), H1 on his left (relative west) and H2 on his right (relative east).
      const f = boss.d;
      if(!f) throw new Error(name + ": the boss has no dash direction at the sword");
      const v = [z.label[0] - boss.x, z.label[1] - boss.y], ahead = v[0] * f[0] + v[1] * f[1], left = v[0] * f[1] - v[1] * f[0];
      assert.isBelow(ahead, 0, name + ": the pocket is behind the boss");
      assert.equal(left > 0, s === "H1", name + ": " + s + " on the boss's " + (s === "H1" ? "left" : "right"));
    });
  }
});

test("weapon runs: the sword's best spot is 2 yalms clear of both arms of the cross", () => {
  for(const [name, build] of Object.entries(RUN_BUILDERS)) for(let i = 0; i < RUNS; i++) for(const s of SLOTS){
    const R = build(s);
    R.W.forEach((w, k) => {
      if(w.type !== "sword") return;
      const st = R.steps[k], boss = R.states[k + 1];
      if(!st.stand) throw new Error(name + ": a sword step has no best spot");
      assert.ok(inZone(st.stand, zoneOf(st.z)), name + ": the best spot is in the pocket");
      // Each arm reaches 12.5 units (5 yalms) from its center line, and the spot is 5 units (2 yalms)
      // past both: 17.5 units along each, so about 24.7 units from him on the diagonal.
      const d = Math.hypot(st.stand[0] - boss.x, st.stand[1] - boss.y);
      assert.ok(d > 24.5 && d < 25, name + ": " + d.toFixed(1) + " units from him, not 2 yalms clear of the arms");
      // Not on the corner: a circle of 4.5 units around the spot is all inside the pocket, so it is
      // clear of both arms of the cross.
      for(let a = 0; a < 360; a += 22.5){
        const r = a * Math.PI / 180, p: Point = [st.stand[0] + 4.5 * Math.cos(r), st.stand[1] + 4.5 * Math.sin(r)];
        assert.ok(inZone(p, zoneOf(st.z)), name + ": the spot is too close to an arm of the cross");
      }
    });
  }
});

test("Ultimate Trophy Weapons: the first spawn sets the direction, and the last is north", () => {
  for(let i = 0; i < RUNS; i++){
    const U = buildUltimate("H1"), a = U.W.map(w => w.a), t = U.W.map(w => w.type);
    assert.equal(a[5], 0, "the last weapon is north");
    assert.ok(U.cw ? a[0] > 180 && a[1] === 315 : a[0] < 180 && a[1] === 45, "first south of west or east, then NW or NE");
    assert.deepEqual(a.slice(2).sort((x, y) => x - y), [0, 90, 180, 270], "the last four sit on the cardinals");
    for(let k = 1; k < 6; k++){
      const turn = ((a[k] - a[k - 1]) * (U.cw ? 1 : -1) + 360) % 360;
      assert.ok(turn > 0 && turn < 180, "every spawn keeps turning the same way");
    }
    assert.equal(new Set(t.slice(0, 3)).size, 3, "the first three are all different");
    assert.equal(new Set(t.slice(3)).size, 3, "the last three are all different");
    assert.deepEqual(U.steps.map(st => Boolean(st.leave)), [false, false, true, true, true, true], "the last four leave tornadoes");
    assert.isNull(U.states[0].f, "the boss does not point at the first weapon");
  }
});

test("Void Stardust: the next puddle goes just outside the last one, clockwise", () => {
  const z = nextPuddle([{p:[50, 33], ok:true, z:{c:[50, 33], r:9}, drop:[50, 33]}]);
  if(!("fn" in z)) throw new Error("the puddle zone is a rule zone");
  // A puddle is 6 yalms (15 units) across its radius, so "just outside" is a step of 15 to 21 units.
  assert.ok(inZone([64, 40], z), "small step clockwise");
  assert.ok(inZone(z.label, z), "the shown spot");
  assert.notOk(inZone([67, 50], z), "far step");
  assert.notOk(inZone([36, 40], z), "counterclockwise");
  assert.notOk(inZone([59.5, 36.5], z), "still inside the last puddle");
  assert.notOk(inZone([52, 35], z), "inside the last puddle");
});

/* Results for the Void Stardust drill when every answer is right: the weapon pick (no
   puddle), then the three puddles at their usual spots, each placed by nextPuddle. */
const asDrops = (ps: Point[]): StepResult[] => ps.map(d => ({p:d, ok:true, z:{c:d, r:5}, drop:d}));
const PUDDLES: Point[] = [1, 2].reduce((ps: Point[]) => [...ps, zoneCenter(nextPuddle(asDrops(ps)))], [[50, 33]]);
const VOID_RESULTS: StepResult[] = [{p:[0, 0], ok:true, z:{c:[0, 0], r:1}, drop:null}, ...asDrops(PUDDLES)];
const dist = (p: Point, q: Point): number => Math.hypot(p[0] - q[0], p[1] - q[1]);

test("Void Stardust spread: any open spot, on the first weapon's side for a sword or scythe", () => {
  const z = cometSpread("H1")(VOID_RESULTS);
  if(!("fn" in z)) throw new Error("the spread zone is a rule zone");
  assert.ok(inZone(z.label, z), "the shown spot");
  for(const gap of z.show) if("c" in gap) assert.ok(inZone(gap.c, z), "every open gap");
  assert.ok(inZone([30, 50], z), "west, between MT and M1");
  assert.notOk(inZone([65, 35], z), "the OT spot");
  assert.notOk(inZone([37, 63], z), "next to the M1 spot");
  assert.notOk(inZone(PUDDLES[2], z), "inside the last puddle");
  assert.ok(inZone([50, 17], z), "on the first puddle, which went off before the spread");
  assert.notOk(inZone([50, 58], z), "inside the hitbox");
  const south = cometSpread("H1", [50, 79])(VOID_RESULTS);
  if(!("fn" in south)) throw new Error("the spread zone is a rule zone");
  assert.ok(inZone(south.label, south), "the shown spot");
  for(const p of [[50, 83], [25, 80], [65, 88], [80, 78], [50, 70]] as Point[]) assert.ok(inZone(p, south), "on a south weapon's side: " + p);
  // A spread is 6 yalms (15 units): closer than that to a melee spot hits them.
  assert.notOk(inZone([30, 75], south), "4.5 yalms from M1");
  assert.notOk(inZone([30, 50], south), "west is not on a south weapon's side");
  assert.notOk(inZone([35, 65], south), "on the M1 spot");
});

test("Void Stardust into the second weapons: every right spot is inside its zone", () => {
  const drill = MAPS.find(m => m.id === "m-void");
  if(!drill) throw new Error("missing drill m-void");
  for(let i = 0; i < RUNS; i++) for(const s of SLOTS) for(const v of ["stack", "spread"]){
    const sc = drill.build(s, v);
    assert.equal(sc.steps.length, 8, "pick, three puddles, stack or spread, then all three weapons");
    assert.deepEqual(sc.steps.slice(6).map(st => st.q), ["Second weapon: click where you go.", "Third weapon: click where you go."]);
    const pick = sc.steps[0].z, end = sc.steps[4].zf;
    if(!pick || !end) throw new Error("missing zone");
    const z = end(VOID_RESULTS);
    if(!("fn" in z)) throw new Error("the stack or spread zone is a rule zone");
    assert.ok(inZone(z.label, z), v + ": the shown spot is right");
    // The pick answer starts "The axe, ..." when the axe goes first.
    if(v === "stack" && "c" in pick && !sc.steps[0].a.startsWith("The axe")){
      assert.isAtMost(dist(z.label, pick.c), dist(PUDDLES[2], pick.c) - 4, "the stack moves toward the first weapon");
    }
  }
});

test("Orbital Omen: Hector's dodge is safe for every pattern", () => {
  const spot = (c: number, r: number): Point => [c === 1 ? 38 : 62, r === 1 ? 44 : 56];
  for(let i = 0; i < RUNS; i++){
    const O = buildOrbital(), V: number[] = [], H: number[] = [];
    for(const o of O.overlays) if(o.t === "portal") (o.vert ? V : H)[o.n - 1] = Math.floor((o.vert ? o.x : o.y) / 25);
    assert.ok([1, 2].includes(V[1]) && [1, 2].includes(H[1]), "the #2 lines cross in a middle square");
    const path = [spot(V[1], H[1]), spot(3 - V[1], H[0]), spot(V[1], H[1])];
    O.steps.forEach((st, k) => assert.ok(inZone(path[k], zoneOf(st.z)), "step " + (k + 1)));
    assert.notOk(inZone(path[0], zoneOf(O.steps[1].z)), "staying put gets hit by the #2 lines");
  }
});

test("Meteorain: H1 drops inside the boss hitbox, H2 farther out on the SW line", () => {
  const drill = MAPS.find(m => m.id === "m-meteor-2");
  if(!drill) throw new Error("missing drill m-meteor-2");
  const h1 = zoneOf(drill.build("H1", null).steps[0].z), h2 = zoneOf(drill.build("H2", null).steps[0].z);
  assert.ok(inZone([44, 44], h1));
  assert.notOk(inZone([37.5, 38], h1), "just outside the hitbox");
  assert.ok(inZone([26, 74], h2));
  assert.notOk(inZone([43, 57], h2), "on top of the first SW rock");
});

test("Void Stardust into the weapons: the puddles are gone when the weapons start", () => {
  const drill = MAPS.find(m => m.id === "m-void");
  if(!drill) throw new Error("missing drill m-void");
  for(const s of SLOTS) for(const v of ["stack", "spread"]){
    const steps = drill.build(s, v).steps, first = steps.findIndex(st => st.clearDrops);
    // Only the first of the three weapons clears them. All puddles drop before it, none after.
    assert.equal(steps.filter(st => st.clearDrops).length, 1);
    assert.equal(first, steps.length - 3, "the first weapon clears the puddles");
    assert.ok(steps.slice(0, first).some(st => st.drop), "the puddles drop before the weapons");
    assert.notOk(steps.slice(first).some(st => st.drop), "no puddle drops during the weapons");
  }
});

test("weapon runs: before each jump, the boss turns to face the weapon he jumps to next", () => {
  for(let i = 0; i < 50; i++){
    const A = buildAssault("H1"), U = buildUltimate("H1");
    for(const [name, R, sc] of [["first set", A, assaultScene(A, "H1")], ["Ultimate", U, ultimateScene(U)]] as const){
      // n weapons have hit: he stands on weapon n and turns to face weapon n + 1.
      for(let n = 1; n < R.states.length - 1; n++){
        const now = R.states[n], next = R.states[n + 1], b = facingNext(sc, n, now);
        assert.deepEqual([b.x, b.y], [now.x, now.y], name + ": he turns where he stands");
        assert.closeTo(b.f ?? -1, angOf([next.x - now.x, next.y - now.y]), 1e-9, name + " after weapon " + n);
      }
      const last = R.states[R.states.length - 1];
      assert.equal(facingNext(sc, R.states.length - 1, last), last, name + ": no jump after the last weapon");
    }
  }
});
