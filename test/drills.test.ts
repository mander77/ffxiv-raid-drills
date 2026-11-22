import { assert, test } from "vitest";
import {
  assaultScene,
  buildAssault,
  buildAssault2,
  buildOrbital,
  buildUltimate,
  changes,
  cometSpread,
  DANCE_LINES,
  DANCE_PAIRS,
  DRILLS,
  facingNext,
  type JumpSet,
  jumpsNext,
  nextPuddle,
  stackNear,
  ultimateScene,
} from "../src/data/drills";
import { angOf, inZone, zoneCenter } from "../src/geometry";
import type { Point, ScytheOverlay, Slot, StepResult, Zone } from "../src/types";

const REPEATS = 300;
const SLOTS: Slot[] = ["H1", "H2"];

/** Narrow a step's zone to the fixed kind, failing the test when it is missing. */
function zoneOf(z: Zone | undefined): Zone {
  if (!z) throw new Error("step has no fixed zone");
  return z;
}

test("every map drill builds for both slots and every variant", () => {
  for (const m of DRILLS)
    for (const s of SLOTS)
      for (const v of m.variants ?? [null]) {
        const sc = m.build(s, v);
        assert.isAbove(sc.steps.length, 0, m.id);
        for (const st of sc.steps) assert.ok(st.z || st.zf, `${m.id}: step without a zone`);
        assert.ok(sc.setup && sc.rule, m.id);
      }
});

test("drills with no random parts build the same pattern every time", () => {
  // JSON leaves out the zone functions, but keeps every drawn piece and every fixed zone.
  for (const m of DRILLS.filter((x) => !changes(x)))
    for (const s of SLOTS) {
      const first = JSON.stringify(m.build(s, null));
      for (let i = 0; i < 20; i++)
        assert.equal(JSON.stringify(m.build(s, null)), first, `${m.id} changed between builds, so mark it random`);
    }
  assert.equal(DRILLS.filter((x) => !changes(x)).length, 10, "10 fixed drills");
});

test("Assault Evolved: the faced weapon goes first, then clockwise", () => {
  for (let i = 0; i < REPEATS; i++) {
    const A = buildAssault("H1");
    const a = A.W.map((w) => w.a);
    const d1 = (a[1] - a[0] + 360) % 360,
      d2 = (a[2] - a[0] + 360) % 360;
    assert.ok(d1 > 0 && d1 < d2, `order ${a.join(",")}`);
    assert.equal(A.states[0].f, a[0], "the boss faces the first weapon");
    assert.deepEqual(new Set(A.W.map((w) => w.type)), new Set(["axe", "sword", "scythe"]));
  }
});

test("Assault Evolved, second set: each weapon faces where he jumps from, the first faces the middle", () => {
  for (let i = 0; i < REPEATS; i++) {
    const A = buildAssault2("H1");
    assert.isNull(A.states[0].f, "the boss does not point at the first weapon");
    let prev: Point = [50, 50];
    A.W.forEach((w, k) => {
      if (!w.axis) throw new Error("every second-set weapon is turned");
      const l = Math.hypot(w.p[0] - prev[0], w.p[1] - prev[1]),
        t: Point = [(w.p[0] - prev[0]) / l, (w.p[1] - prev[1]) / l];
      // The long side lies square across his jump into it (the first: across the line to the middle).
      assert.closeTo(w.axis[0] * t[0] + w.axis[1] * t[1], 0, 1e-9, `weapon ${k + 1} is square to his jump`);
      // The long side runs from the butt to the tip, so the butt is on his left: u . left < 0.
      assert.isBelow(w.axis[0] * t[1] - w.axis[1] * t[0], 0, `weapon ${k + 1}: the butt is on his left`);
      prev = w.p;
    });
    const a = A.W.map((w) => w.a),
      d1 = (a[1] - a[0] + 360) % 360,
      d2 = (a[2] - a[0] + 360) % 360;
    assert.ok(d1 > 0 && d1 < d2, "clockwise after the first");
  }
});

const SET_BUILDERS: Record<string, (s: Slot) => JumpSet> = { buildAssault, buildAssault2, buildUltimate };

test("jump sets: H1 stands at the scythe butt, H2 at the blade end", () => {
  for (const [name, build] of Object.entries(SET_BUILDERS))
    for (let i = 0; i < REPEATS; i++)
      for (const s of SLOTS) {
        const R = build(s);
        R.W.forEach((w, k) => {
          if (w.type !== "scythe") return;
          // A type predicate: after find, TypeScript knows g is a scythe overlay with ux, uy and so on.
          const g = R.overlays.find((o): o is ScytheOverlay => o.t === "scythe" && o.spawn === k);
          if (!g) throw new Error(`${name}: no scythe drawn`);
          const butt: Point = [g.x - g.ux * 10, g.y - g.uy * 10],
            blade: Point = [g.x + g.ux * 8, g.y + g.uy * 8];
          const z = zoneOf(R.steps[k].z);
          assert.equal(inZone(butt, z), s === "H1", name);
          assert.equal(inZone(blade, z), s === "H2", name);
        });
      }
});

test("weapon runs: the sword pocket is behind the boss, never on him", () => {
  for (const [name, build] of Object.entries(SET_BUILDERS))
    for (let i = 0; i < REPEATS; i++)
      for (const s of SLOTS) {
        const R = build(s);
        R.W.forEach((w, k) => {
          if (w.type !== "sword") return;
          const z = zoneOf(R.steps[k].z),
            boss = R.states[k + 1];
          if (!("fn" in z)) throw new Error(`${name}: the sword zone is a rule zone`);
          assert.ok(inZone(z.label, z), `${name}: the shown spot is inside the zone`);
          assert.notOk(inZone([boss.x, boss.y], z), `${name}: the boss's own spot`);
          // Relative to the boss, who faces the way he dashed: the pocket is behind him (never
          // relative north), H1 on his left (relative west) and H2 on his right (relative east).
          const f = boss.d;
          if (!f) throw new Error(`${name}: the boss has no dash direction at the sword`);
          const v = [z.label[0] - boss.x, z.label[1] - boss.y],
            ahead = v[0] * f[0] + v[1] * f[1],
            left = v[0] * f[1] - v[1] * f[0];
          assert.isBelow(ahead, 0, `${name}: the pocket is behind the boss`);
          assert.equal(left > 0, s === "H1", `${name}: ${s} on the boss's ${s === "H1" ? "left" : "right"}`);
        });
      }
});

test("weapon runs: the sword's best spot is 2 yalms clear of both arms of the cross", () => {
  for (const [name, build] of Object.entries(SET_BUILDERS))
    for (let i = 0; i < REPEATS; i++)
      for (const s of SLOTS) {
        const R = build(s);
        R.W.forEach((w, k) => {
          if (w.type !== "sword") return;
          const st = R.steps[k],
            boss = R.states[k + 1];
          if (!st.stand) throw new Error(`${name}: a sword step has no best spot`);
          assert.ok(inZone(st.stand, zoneOf(st.z)), `${name}: the best spot is in the pocket`);
          // Each arm reaches 12.5 units (5 yalms) from its center line, and the spot is 5 units (2 yalms)
          // past both: 17.5 units along each, so about 24.7 units from him on the diagonal.
          const d = Math.hypot(st.stand[0] - boss.x, st.stand[1] - boss.y);
          assert.ok(d > 24.5 && d < 25, `${name}: ${d.toFixed(1)} units from him, not 2 yalms clear of the arms`);
          // The whole pocket is safe, also far from him: one more step out along the diagonal, or to
          // the arena edge, is still correct (the arms reach past the arena).
          const diag: Point = [(st.stand[0] - boss.x) / d, (st.stand[1] - boss.y) / d];
          for (const k of [20, 40]) {
            const far: Point = [st.stand[0] + diag[0] * k, st.stand[1] + diag[1] * k];
            if (far[0] >= 0 && far[0] <= 100 && far[1] >= 0 && far[1] <= 100)
              assert.ok(inZone(far, zoneOf(st.z)), `${name}: ${k} units farther out is still in the pocket`);
          }
          // Not on the corner: a circle of 4.5 units around the spot is all inside the pocket, so it is
          // clear of both arms of the cross.
          for (let a = 0; a < 360; a += 22.5) {
            const r = (a * Math.PI) / 180,
              p: Point = [st.stand[0] + 4.5 * Math.cos(r), st.stand[1] + 4.5 * Math.sin(r)];
            assert.ok(inZone(p, zoneOf(st.z)), `${name}: the spot is too close to an arm of the cross`);
          }
        });
      }
});

test("Ultimate Trophy Weapons: the first spawn sets the direction, and the last is north", () => {
  for (let i = 0; i < REPEATS; i++) {
    const U = buildUltimate("H1"),
      a = U.W.map((w) => w.a),
      t = U.W.map((w) => w.type);
    assert.equal(a[5], 0, "the last weapon is north");
    assert.ok(U.cw ? a[0] > 180 && a[1] === 315 : a[0] < 180 && a[1] === 45, "first south of west or east, then NW or NE");
    assert.deepEqual(
      a.slice(2).sort((x, y) => x - y),
      [0, 90, 180, 270],
      "the last four sit on the cardinals",
    );
    for (let k = 1; k < 6; k++) {
      const turn = ((a[k] - a[k - 1]) * (U.cw ? 1 : -1) + 360) % 360;
      assert.ok(turn > 0 && turn < 180, "every spawn keeps turning the same way");
    }
    assert.equal(new Set(t.slice(0, 3)).size, 3, "the first three are all different");
    assert.equal(new Set(t.slice(3)).size, 3, "the last three are all different");
    assert.deepEqual(
      U.steps.map((st) => Boolean(st.leave)),
      [false, false, true, true, true, true],
      "the last four leave tornadoes",
    );
    assert.isNull(U.states[0].f, "the boss does not point at the first weapon");
  }
});

test("Void Stardust: the next puddle goes just outside the last one, clockwise", () => {
  const z = nextPuddle([{ p: [50, 33], ok: true, z: { c: [50, 33], r: 9 }, drop: [50, 33] }]);
  if (!("fn" in z)) throw new Error("the puddle zone is a rule zone");
  // A puddle is 6 yalms (15 units) across its radius, so "just outside" is a step of 15 to 21 units.
  assert.ok(inZone([64, 40], z), "small step clockwise");
  assert.ok(inZone(z.label, z), "the shown spot");
  assert.notOk(inZone([67, 50], z), "far step");
  assert.notOk(inZone([36, 40], z), "counterclockwise");
  assert.notOk(inZone([59.5, 36.5], z), "still inside the last puddle");
  assert.notOk(inZone([52, 35], z), "inside the last puddle");
});

/* Results for the Void Stardust drill when every answer is correct: the weapon pick (no
   puddle), then the three puddles at their usual spots, each placed by nextPuddle. */
const asDrops = (ps: Point[]): StepResult[] => ps.map((d) => ({ p: d, ok: true, z: { c: d, r: 5 }, drop: d }));
const PUDDLES: Point[] = [1, 2].reduce((ps: Point[]) => [...ps, zoneCenter(nextPuddle(asDrops(ps)))], [[50, 33]]);
const VOID_RESULTS: StepResult[] = [{ p: [0, 0], ok: true, z: { c: [0, 0], r: 1 }, drop: null }, ...asDrops(PUDDLES)];
const dist = (p: Point, q: Point): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
/** True if p is inside the polygon (ray casting). */
const inPoly = (p: Point, poly: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** True if p is within d of an edge of the polygon. */
const nearEdge = (p: Point, poly: Point[], d: number): boolean =>
  poly.some((a, i) => {
    const b = poly[(i + 1) % poly.length],
      ab: Point = [b[0] - a[0], b[1] - a[1]],
      len2 = ab[0] * ab[0] + ab[1] * ab[1];
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / len2)) : 0;
    return dist(p, [a[0] + ab[0] * t, a[1] + ab[1] * t]) < d;
  });

test("Void Stardust spread: any open spot, on the first weapon's side for a sword or scythe", () => {
  const z = cometSpread("H1")(VOID_RESULTS);
  if (!("fn" in z)) throw new Error("the spread zone is a rule zone");
  assert.ok(inZone(z.label, z), "the shown spot");
  for (const gap of z.show) if ("c" in gap) assert.ok(inZone(gap.c, z), "every open gap");
  assert.ok(inZone([30, 50], z), "west, between MT and M1");
  assert.notOk(inZone([65, 35], z), "the OT spot");
  assert.notOk(inZone([37, 63], z), "next to the M1 spot");
  assert.notOk(inZone(PUDDLES[2], z), "inside the last puddle");
  assert.ok(inZone([50, 17], z), "on the first puddle, which went off before the spread");
  assert.notOk(inZone([50, 58], z), "inside the hitbox");
  const south = cometSpread("H1", [50, 79])(VOID_RESULTS);
  if (!("fn" in south)) throw new Error("the spread zone is a rule zone");
  assert.ok(inZone(south.label, south), "the shown spot");
  for (const p of [
    [50, 83],
    [25, 80],
    [65, 88],
    [80, 78],
    [50, 70],
  ] as Point[])
    assert.ok(inZone(p, south), `on a south weapon's side: ${p}`);
  // A spread is 6 yalms (15 units): closer than that to a melee spot hits them.
  assert.notOk(inZone([30, 75], south), "4.5 yalms from M1");
  assert.notOk(inZone([30, 50], south), "west is not on a south weapon's side");
  assert.notOk(inZone([35, 65], south), "on the M1 spot");
});

test("Void Stardust into the second weapons: every correct spot is inside its zone", () => {
  const drill = DRILLS.find((m) => m.id === "m-void");
  if (!drill) throw new Error("missing drill m-void");
  for (let i = 0; i < REPEATS; i++)
    for (const s of SLOTS)
      for (const v of ["stack", "spread"]) {
        const sc = drill.build(s, v);
        assert.equal(sc.steps.length, 8, "pick, three puddles, stack or spread, then all three weapons");
        assert.deepEqual(
          sc.steps.slice(6).map((st) => st.q),
          ["Second weapon: click where you go.", "Third weapon: click where you go."],
        );
        const pick = sc.steps[0].z,
          end = sc.steps[4].zf;
        if (!pick || !end) throw new Error("missing zone");
        const z = end(VOID_RESULTS);
        if (!("fn" in z)) throw new Error("the stack or spread zone is a rule zone");
        assert.ok(inZone(z.label, z), `${v}: the shown spot is correct`);
        // The pick answer starts "The axe, ..." when the axe goes first.
        if (v === "stack" && "c" in pick && !sc.steps[0].a.startsWith("The axe")) {
          // In max melee range (8.5 yalms), out of the last puddle. It gets as close as it can to
          // your safe spot for the first weapon, which can be off to the weapon's side.
          assert.isAtMost(dist(z.label, [50, 50]), 21.25, "the stack is in max melee range");
          assert.isAtLeast(dist(z.label, PUDDLES[2]), 15, "the stack is out of the last puddle");
        }
      }
});

test("Orbital Omen: Hector's dodge is safe for every pattern", () => {
  const spot = (c: number, r: number): Point => [c === 1 ? 38 : 62, r === 1 ? 44 : 56];
  for (let i = 0; i < REPEATS; i++) {
    const O = buildOrbital(),
      V: number[] = [],
      H: number[] = [];
    for (const o of O.overlays) if (o.t === "portal") (o.vert ? V : H)[o.n - 1] = Math.floor((o.vert ? o.x : o.y) / 25);
    assert.ok([1, 2].includes(V[1]) && [1, 2].includes(H[1]), "the #2 lines cross in a middle square");
    const path = [spot(V[1], H[1]), spot(3 - V[1], H[0]), spot(V[1], H[1])];
    O.steps.forEach((st, k) => {
      assert.ok(inZone(path[k], zoneOf(st.z)), `step ${k + 1}`);
    });
    assert.notOk(inZone(path[0], zoneOf(O.steps[1].z)), "staying put gets hit by the #2 lines");
  }
});

test("Meteorain: H1 drops inside the boss hitbox, H2 farther out on the SW line", () => {
  const drill = DRILLS.find((m) => m.id === "m-meteor-2");
  if (!drill) throw new Error("missing drill m-meteor-2");
  const h1 = zoneOf(drill.build("H1", null).steps[0].z),
    h2 = zoneOf(drill.build("H2", null).steps[0].z);
  assert.ok(inZone([44, 44], h1));
  assert.notOk(inZone([37.5, 38], h1), "just outside the hitbox");
  assert.ok(inZone([26, 74], h2));
  assert.notOk(inZone([43, 57], h2), "on top of the first SW rock");
});

test("Void Stardust into the weapons: the puddles are gone when the weapons start", () => {
  const drill = DRILLS.find((m) => m.id === "m-void");
  if (!drill) throw new Error("missing drill m-void");
  for (const s of SLOTS)
    for (const v of ["stack", "spread"]) {
      const steps = drill.build(s, v).steps,
        first = steps.findIndex((st) => st.clearDrops);
      // Only the first of the three weapons clears them. All puddles drop before it, none after.
      assert.equal(steps.filter((st) => st.clearDrops).length, 1);
      assert.equal(first, steps.length - 3, "the first weapon clears the puddles");
      assert.ok(
        steps.slice(0, first).some((st) => st.drop),
        "the puddles drop before the weapons",
      );
      assert.notOk(
        steps.slice(first).some((st) => st.drop),
        "no puddle drops during the weapons",
      );
    }
});

test("weapon runs: before each jump, the boss turns to face the weapon he jumps to next", () => {
  for (let i = 0; i < 50; i++) {
    const A = buildAssault("H1"),
      U = buildUltimate("H1");
    for (const [name, R, sc] of [
      ["first set", A, assaultScene(A, "H1")],
      ["Ultimate", U, ultimateScene(U)],
    ] as const) {
      // n weapons have hit: he stands on weapon n and turns to face weapon n + 1.
      for (let n = 1; n < R.states.length - 1; n++) {
        const now = R.states[n],
          next = R.states[n + 1],
          b = facingNext(sc, n, now);
        assert.deepEqual([b.x, b.y], [now.x, now.y], `${name}: he turns where he stands`);
        assert.closeTo(b.f ?? -1, angOf([next.x - now.x, next.y - now.y]), 1e-9, `${name} after weapon ${n}`);
      }
      for (let n = 0; n < R.states.length - 1; n++) assert.isTrue(jumpsNext(sc, n), `${name}: a jump after step ${n}`);
      const last = R.states[R.states.length - 1];
      assert.isFalse(jumpsNext(sc, R.states.length - 1), `${name}: no jump after the last weapon`);
      assert.equal(facingNext(sc, R.states.length - 1, last), last, `${name}: no jump after the last weapon`);
    }
  }
});

/** Away from the edge of the drawn area, a point is inside it exactly when the drill accepts it. */
function drawnMatchesRule(z: Zone): void {
  if (!("fn" in z)) throw new Error("a rule zone");
  const polys = z.show.flatMap((sh) => ("poly" in sh ? [sh.poly] : []));
  assert.isAbove(polys.length, 0, "the area is drawn");
  for (let x = 0; x <= 100; x++)
    for (let y = 0; y <= 100; y++) {
      const pt: Point = [x, y];
      if (polys.some((pl) => nearEdge(pt, pl, 0.8))) continue;
      assert.equal(
        polys.some((pl) => inPoly(pt, pl)),
        inZone(pt, z),
        `drawn area and rule disagree at ${pt}`,
      );
    }
}

test("Void Stardust stack: in max melee range, out of the last puddle, close to where you go next", () => {
  // From a report: the scythe southwest (the spot to get close to), the third puddle east of the boss.
  const T: Point = [29.5, 70.5],
    q: Point = [66.5, 52];
  const z = stackNear(T)([VOID_RESULTS[0], ...asDrops([[50, 27], [61, 37], q])]);
  if (!("fn" in z)) throw new Error("the stack zone is a rule zone");
  assert.ok(inZone(z.label, z), "the shown spot");
  assert.isAtMost(dist(z.label, [50, 50]), 21.25, "the shown spot is in max melee range");
  for (const p of [
    [38.7, 67.7],
    [36, 58],
    [37, 62],
  ] as Point[])
    assert.ok(inZone(p, z), `in max melee range, toward the scythe: ${p}`);
  assert.notOk(inZone([32, 66], z), "toward the scythe, but past max melee range");
  assert.notOk(inZone([45, 57], z), "inside his hitbox ring");
  assert.notOk(inZone([50, 66], z), "in max melee range, but much farther from the scythe than the closest spot");
  assert.notOk(inZone([40, 36], z), "on the far side from the scythe");
  assert.notOk(inZone(q, z), "inside the last puddle");
  drawnMatchesRule(z);
});

test("Void Stardust stack: the first two puddles are gone, so their ground is free", () => {
  // From a report: the sword north, the usual puddles north, northeast and east-southeast. The
  // first puddle went off 3 seconds after it dropped, so the group stacks straight toward the sword.
  const z = stackNear([50, 17])(VOID_RESULTS);
  if (!("fn" in z)) throw new Error("the stack zone is a rule zone");
  assert.isAtMost(dist(z.label, [50, 31.25]), 1.5, "the shown spot: north, a yalm inside max melee range");
  assert.ok(inZone([50, 30], z), "where the first puddle was");
  assert.notOk(inZone(PUDDLES[2], z), "inside the last puddle");
  drawnMatchesRule(z);
});

test("Dance of Domination: every pair spot is clear of the 10-yalm Hurricane Explosion lines", () => {
  // Distance from p to the line through a and b.
  const off = (p: Point, a: Point, b: Point): number =>
    Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (const [who, c] of Object.entries(DANCE_PAIRS))
    for (const l of DANCE_LINES) {
      const d = off(c, [l.x, l.y], [l.x2, l.y2]);
      // Out of half the line's width (12.5). H1 and H2 also have room for the drill's 5-unit answer circle.
      assert.isAbove(d, 12.5 + (who[0] === "H" ? 5 : 0), `${who} is too close to the line from ${l.x},${l.y}`);
    }
  // The H1 and H2 answers are those spots.
  const drill = DRILLS.find((m) => m.id === "m-dance");
  if (!drill) throw new Error("missing drill m-dance");
  for (const s of SLOTS) assert.deepEqual(zoneOf(drill.build(s, null).steps[0].z), { c: DANCE_PAIRS[s], r: 5 });
});
