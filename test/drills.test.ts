import { assert, test } from "vitest";
import { WAYMARKS } from "../src/components/arena/Arena";
import { isStretched, PLATFORM_X, PORTAL_LINE_X, TOWER_KNOCKBACK, TOWER_R } from "../src/data/fights/m11s/attacks";
import {
  assaultScene,
  avalancheScene,
  buildAssault,
  buildAssault2,
  buildOrbital,
  buildUltimate,
  cometSpread,
  DANCE_LINES,
  DANCE_PAIRS,
  DRILLS,
  firstTowersScene,
  GUST_CONES,
  type JumpSet,
  nextPuddle,
  portalAt,
  SPLIT_TOWER,
  type SplitEnd,
  type SplitHalf,
  type SplitSide,
  splitRound,
  splitTowers,
  TORNADO_BAITS,
  ultimateScene,
  voidAgain,
} from "../src/data/fights/m11s/drills";
import { angOf, inZone, stepZone, zoneCenter } from "../src/geometry";
import { changes } from "../src/lib/practice";
import { facingNext, jumpsNext } from "../src/lib/scene";
import type { Point, ScytheOverlay, Slot, SlotName, StepResult, Zone } from "../src/types";
import { assertLines } from "./lines";

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
        for (const st of sc.steps) {
          assert.ok(st.z || st.zf, `${m.id}: step without a zone`);
          assertLines(st.a, `${m.id} answer`);
        }
        assertLines(sc.setup, `${m.id} setup`);
        assertLines(sc.rule, `${m.id} rule`);
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

test("Assault Evolved, second set: only the first weapon lies square to the middle", () => {
  for (let i = 0; i < REPEATS; i++) {
    const A = buildAssault2("H1");
    // How far each weapon's long side is from square to the line to the middle, in degrees.
    const off = A.W.map((w) => {
      if (!w.axis) throw new Error("every second-set weapon is turned");
      const out = Math.atan2(w.p[1] - 50, w.p[0] - 50),
        along = Math.atan2(w.axis[1], w.axis[0]);
      const d = Math.abs((((along - out) * 180) / Math.PI) % 180);
      return Math.abs(90 - Math.min(d, 180 - d));
    });
    assert.closeTo(off[0], 0, 1e-6, "the first weapon is square to the middle");
    const gaps = A.W.map((w) => w.a).join(", ");
    assert.isAtLeast(off[1], 20, `weapons at ${gaps}: the second is clearly off square`);
    assert.isAtLeast(off[2], 20, `weapons at ${gaps}: the third is clearly off square`);
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

test("Void Stardust spread: any open spot, drawn as four slices around the boss", () => {
  const z = cometSpread("H1")(VOID_RESULTS);
  if (!("fn" in z)) throw new Error("the spread zone is a rule zone");
  assert.ok(inZone(z.label, z), "the shown spot");
  assert.isBelow(z.label[0], 50, "H1's shown spot is west");
  assert.equal(z.show.length, 4, "one slice for each side of the boss");
  for (const p of [
    [30, 50],
    [10, 50],
    [50, 90],
    [5, 5],
    [90, 30],
  ] as Point[])
    assert.ok(inZone(p, z), `open ground: ${p}`);
  assert.notOk(inZone([65, 35], z), "the OT spot");
  // A spread is 6 yalms (15 units): closer than that to a melee spot hits them.
  assert.notOk(inZone([37, 63], z), "next to the M1 spot");
  assert.notOk(inZone([30, 75], z), "4.5 yalms from M1");
  // Every puddle goes off before the spread, so none of them closes a spot.
  assert.ok(inZone([50, 17], z), "on the first puddle");
  assert.notOk(inZone([50, 58], z), "inside the hitbox");
  drawnMatchesRule(z);
  assert.isAbove(zoneCenter(cometSpread("H2")(VOID_RESULTS))[0], 50, "H2's shown spot is east");
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
        if (v === "stack" && "c" in pick && !sc.steps[0].a[0].startsWith("The axe")) {
          // In max melee range (8.5 yalms), one more step clockwise, out of the last puddle.
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
    for (const o of O.overlays) if (o.t === "portal" && o.n != null) (o.vert ? V : H)[o.n - 1] = Math.floor((o.vert ? o.x : o.y) / 25);
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

test("Void Stardust stack: one more step clockwise, just past the third puddle, in max melee", () => {
  const z = nextPuddle(VOID_RESULTS);
  if (!("fn" in z)) throw new Error("the stack zone is a rule zone");
  assert.ok(inZone(z.label, z), "the shown spot");
  assert.isAtMost(dist(z.label, [50, 50]), 21.25, "the shown spot is in max melee range");
  assert.isAtLeast(dist(z.label, PUDDLES[2]), 15, "the shown spot is out of the third puddle");
  assert.isAbove(
    angOf([z.label[0] - 50, z.label[1] - 50]),
    angOf([PUDDLES[2][0] - 50, PUDDLES[2][1] - 50]),
    "clockwise from the third puddle",
  );
  assert.notOk(inZone(PUDDLES[2], z), "inside the third puddle");
  assert.notOk(inZone([50, 75], z), "south, past max melee range");
  assert.ok(inZone([48, 66], z), "the stack in the Learn pictures");
});

test("Void Stardust: every puddle and the stack are in max melee", () => {
  const drill = DRILLS.find((m) => m.id === "m-void");
  if (!drill) throw new Error("missing drill m-void");
  for (const s of SLOTS)
    for (const v of ["stack", "spread"]) {
      const sc = drill.build(s, v);
      const results: StepResult[] = [VOID_RESULTS[0]];
      for (const st of sc.steps.slice(1, v === "stack" ? 5 : 4)) {
        const z = st.z ?? st.zf?.(results);
        if (!z) throw new Error("missing zone");
        const p = zoneCenter(z);
        assert.ok(inZone(p, z), `${st.q}: the shown spot`);
        assert.isAtMost(dist(p, [50, 50]), 21.25, `${st.q}: in max melee range`);
        for (const far of [
          [50, 5],
          [95, 50],
          [50, 95],
          [5, 50],
        ] as Point[])
          assert.notOk(inZone(far, z), `${st.q}: not at the edge`);
        results.push({ p, ok: true, z, drop: p });
      }
    }
  drawnMatchesRule(zoneOf(drill.build("H1", "stack").steps[1].z));
});

test("Second Void Stardust: the puddles and the stack go around the boss on the third weapon, in max melee", () => {
  // The boss on a weapon near the north wall, facing south, so his butt is north of him.
  const boss = { x: 50, y: 21, f: 180 };
  const sc = voidAgain("H1", false, boss);
  const results: StepResult[] = [];
  for (const st of sc.steps) {
    const z = st.z ?? st.zf?.(results);
    if (!z) throw new Error("missing zone");
    const p = zoneCenter(z);
    assert.ok(inZone(p, z), `${st.q}: the shown spot`);
    assert.isAtMost(dist(p, [boss.x, boss.y]), 21.25, `${st.q}: in max melee range`);
    results.push({ p, ok: true, z, drop: st.drop ? p : null });
  }
  drawnMatchesRule(zoneOf(sc.steps[0].z));
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

/** True when p is on the west (or east) platform, or at its north (or south) end. */
const onSide = (p: Point, side: SplitSide): boolean => p[0] >= PLATFORM_X[side][0] && p[0] <= PLATFORM_X[side][1];
const atEnd = (p: Point, end: SplitEnd): boolean => (end === "north" ? p[1] < 50 : p[1] > 50);
/** True when p is in the inner (or outer) half of its platform's width. */
const inHalf = (p: Point, side: SplitSide, half: SplitHalf): boolean => {
  const mid = (PLATFORM_X[side][0] + PLATFORM_X[side][1]) / 2,
    inner = side === "west" ? p[0] >= mid : p[0] <= mid;
  return half === "inner" ? inner : !inner;
};
/** The other players, for the tethers of a round. */
const OTHERS: SlotName[] = ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"];
const SIDES: SplitSide[] = ["west", "east"],
  ENDS: SplitEnd[] = ["north", "south"],
  HALVES: SplitHalf[] = ["inner", "outer"];

test("Arena Split: the platforms and the portal lines are BossMod's", () => {
  const yalms = (u: number): number => u / 2.5;
  // Each platform is 20 yalms wide, with a 12-yalm gap between them (BossMod's Flatliner file).
  for (const side of SIDES) assert.equal(yalms(PLATFORM_X[side][1] - PLATFORM_X[side][0]), 20, side);
  assert.equal(yalms(PLATFORM_X.east[0] - PLATFORM_X.west[1]), 12, "the gap");
  // Each portal line covers exactly one half of a platform's width, from end to end.
  for (const [x0, x1] of PORTAL_LINE_X) {
    const side: SplitSide = x0 < 50 ? "west" : "east",
      half = HALVES.find((h) => inHalf([x0 + 0.1, 50], side, h) && inHalf([x1 - 0.1, 50], side, h));
    assert.ok(half, `the line from ${x0} to ${x1} covers one half of the ${side} platform`);
  }
});

test("Arena Split: a round puts you in close, then at your end, out of the portal lines", () => {
  for (const s of SLOTS)
    for (const side of SIDES)
      for (const end of ENDS)
        for (const covered of HALVES)
          for (const tether of [true, false])
            for (const endsSide of SIDES) {
              const others = OTHERS.filter((o) => o !== s).slice(0, tether ? 3 : 4),
                sc = splitRound(s, { tether, side, end, covered, endsSide, others }),
                what = `${s} ${side} ${end} ${covered} ${tether ? "tether" : "marker"} ${endsSide}`;
              // Answer each step at its shown spot, as the moving marker does.
              const results: StepResult[] = [];
              for (const st of sc.steps) {
                const z = zoneOf(st.zf ? st.zf(results) : st.z),
                  p = zoneCenter(z);
                assert.ok(inZone(p, z), `${what}: ${st.q}`);
                results.push({ p, ok: true, z, drop: st.drop ? p : null });
              }
              const [p1, p2, p3, lineup] = results.map((r) => r.p);
              assert.ok(onSide(p1, side) && Math.abs(p1[1] - 50) < 1, "in close, at the middle of the inner edge");
              assert.ok(inHalf(p1, side, "inner"), "the first puddle is in the inner half");
              // Each puddle goes just outside the last, toward your end, tight against the inner edge.
              for (const [a, b] of [
                [p1, p2],
                [p2, p3],
              ]) {
                assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) >= 15, "just outside the last puddle");
                assert.ok(end === "north" ? b[1] < a[1] : b[1] > a[1], `toward the ${end} end`);
                const gap = side === "west" ? PLATFORM_X.west[1] - b[0] : b[0] - PLATFORM_X.east[0];
                assert.ok(gap >= 0 && gap <= 6.5, "tight against the inner edge");
              }
              assert.deepEqual(
                results.map((r) => r.drop !== null),
                [true, true, true, false],
                "three puddles",
              );
              assert.ok(onSide(lineup, side) && atEnd(lineup, end), `${what}: the ${end} end`);
              assert.ok(inHalf(lineup, side, covered === "inner" ? "outer" : "inner"), `${what}: out of the portal lines`);
              assert.ok(Math.hypot(lineup[0] - p3[0], lineup[1] - p3[1]) >= 15, "out of the third puddle");
              // The portal lines show with the lineup question.
              assert.ok(
                sc.steps[3].cue?.some((o) => o.t === "lane"),
                "the portal lines",
              );
              // A tether stretches at the wall; a marker goes to the wall-side corner of the number waymark.
              if (tether) assert.ok(end === "north" ? lineup[1] <= 5 : lineup[1] >= 95, `${what}: at the wall`);
              else {
                const wm: Point = [side === "west" ? 9 : 91, end === "north" ? 19 : 81];
                assert.ok(Math.abs(lineup[0] - wm[0]) <= 6.5 && Math.abs(lineup[1] - wm[1]) <= 6.5, `${what}: at the waymark`);
                assert.ok(end === "north" ? lineup[1] < wm[1] : lineup[1] > wm[1], `${what}: its wall-side corner`);
              }
              // The third puddle as far toward your end and as far out as it may go: a clear spot is still left.
              for (const x of side === "west"
                ? [PLATFORM_X.west[1] - 6.5, PLATFORM_X.west[1]]
                : [PLATFORM_X.east[0], PLATFORM_X.east[0] + 6.5]) {
                const third = zoneOf(sc.steps[2].zf?.(results.slice(0, 2))),
                  dir = end === "north" ? -1 : 1,
                  far = Array.from({ length: 13 }, (_x, i): Point => [x, p2[1] + dir * (21 - i * 0.5)]).find((q) => inZone(q, third));
                if (!far) continue;
                const worst = [...results.slice(0, 2), { ...results[2], p: far, drop: far }],
                  z4 = zoneOf(sc.steps[3].zf?.(worst));
                assert.ok(inZone(zoneCenter(z4), z4), `${what}: a clear spot is left`);
              }
              for (const st of sc.steps) assertLines(st.a, sc.setup.join(" "));
              // Your tether: red where you start, blue at the lineup spot.
              if (tether) {
                const t = sc.tether;
                if (!t) throw new Error(`${what}: no tether`);
                assert.isFalse(isStretched(t.portal, [t.you.x, t.you.y]), `${what}: not stretched at the start`);
                assert.isFalse(isStretched(t.portal, p1), `${what}: not stretched in close`);
                assert.ok(isStretched(t.portal, lineup), `${what}: stretched at the lineup`);
                // The portal is on the other platform's side, in the half away from your end.
                assert.ok(
                  side === "west" ? t.portal[0] > PLATFORM_X.east[1] : t.portal[0] < PLATFORM_X.west[0],
                  `${what}: the portal's side`,
                );
                assert.ok(atEnd(t.portal, end === "north" ? "south" : "north"), `${what}: the portal's half`);
              } else assert.isUndefined(sc.tether, what);
              // At the lineup, every other tether shows, stretched: two on each platform, one at each end.
              const reveal = sc.steps[3].reveal ?? [],
                cords = reveal.flatMap((o) => (o.t === "tether" ? [o] : [])),
                marks = reveal.flatMap((o) => (o.t === "mark" ? [o] : []));
              assert.equal(cords.length, tether ? 3 : 4, `${what}: the other tethers`);
              assert.deepEqual(
                marks.map((m) => m.l),
                others,
                `${what}: on the other tethered players`,
              );
              const ends = [...cords.map((c): Point => [c.x2, c.y2]), ...(tether ? [lineup] : [])];
              for (const sd of SIDES)
                for (const e of ENDS)
                  assert.equal(ends.filter((p) => onSide(p, sd) && atEnd(p, e)).length, 1, `${what}: one tether at the ${e} end of ${sd}`);
              for (const c of cords) assert.ok(isStretched([c.x, c.y], [c.x2, c.y2]), `${what}: another tether is stretched`);
            }
});

/** Where the tower at c knocks a player standing at p: TOWER_KNOCKBACK straight away from c. */
const landing = (c: Point, p: Point): Point => {
  const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
  return [p[0] + ((p[0] - c[0]) / d) * TOWER_KNOCKBACK, p[1] + ((p[1] - c[1]) / d) * TOWER_KNOCKBACK];
};
/** True when p is on a platform's floor. */
const onFloor = (p: Point): boolean => p[1] >= 0 && p[1] <= 100 && SIDES.some((sd) => onSide(p, sd));

test("Arena Split: where you stand in a tower sends you where you need to go", () => {
  for (const side of SIDES)
    for (const end of ENDS)
      for (const portalSide of [...SIDES, null]) {
        const portal = portalSide ? portalAt(portalSide, end === "north" ? "south" : "north", "west") : null,
          sc = splitTowers("H1", side, end, portal ? { portal } : null),
          z = zoneOf(stepZone(sc.steps[0], [])),
          p = zoneCenter(z),
          c = SPLIT_TOWER[side][end],
          to = landing(c, p),
          what = `${side} ${end} portal ${portalSide ?? "none"}`;
        assert.ok(inZone(p, z) && Math.hypot(p[0] - c[0], p[1] - c[1]) <= TOWER_R, `${what}: in the tower`);
        assert.ok(onFloor(to), `${what}: lands on a platform`);
        // A tether lands across from its portal; without one you stay and land at the other end.
        const goal: SplitSide = portalSide ? (portalSide === "west" ? "east" : "west") : side;
        assert.ok(onSide(to, goal), `${what}: lands on the ${goal} platform`);
        if (goal === side) assert.ok(atEnd(to, end === "north" ? "south" : "north"), `${what}: at the other end`);
        // The other half of the tower sends you elsewhere: it is not correct.
        const away: Point = [2 * c[0] - p[0], 2 * c[1] - p[1]];
        assert.isFalse(inZone(away, z), `${what}: only the side facing that way`);
        // Every correct spot in the tower lands you where you need to go, never off the arena.
        for (let dx = -TOWER_R; dx <= TOWER_R; dx += 0.5)
          for (let dy = -TOWER_R; dy <= TOWER_R; dy += 0.5) {
            const q: Point = [c[0] + dx, c[1] + dy];
            if (!inZone(q, z)) continue;
            const t = landing(c, q);
            assert.ok(onFloor(t) && onSide(t, goal), `${what}: (${q}) lands on the ${goal} platform`);
            if (goal === side) assert.ok(atEnd(t, end === "north" ? "south" : "north"), `${what}: (${q}) lands at the other end`);
          }
        // With a tether, it runs from its portal to your mark; without one, none is drawn.
        if (portal) {
          assert.deepEqual(sc.tether?.portal, portal);
          assert.ok(!sc.overlays.some((o) => o.t === "mark" && o.l === "H1"), `${what}: your mark is the tether's end`);
        } else assert.isUndefined(sc.tether, what);
      }
});

test("Arena Split: to cross from the SW tower, stand about due east: its SE edge throws you off the arena", () => {
  const sc = splitTowers("H1", "west", "south", { portal: portalAt("west", "north", "west") }),
    z = zoneOf(stepZone(sc.steps[0], [])),
    c = SPLIT_TOWER.west.south,
    at = (deg: number): Point => [
      c[0] + Math.sin((deg * Math.PI) / 180) * TOWER_R * 0.9,
      c[1] - Math.cos((deg * Math.PI) / 180) * TOWER_R * 0.9,
    ];
  assert.ok(inZone(at(90), z), "due east");
  assert.ok(inZone(at(80), z), "a little north-east");
  assert.isFalse(inZone(at(135), z), "the SE edge");
  assert.isFalse(onFloor(landing(c, at(135))), "from the SE edge you land off the arena");
});

test("Arena Split: the first towers are your light party's, at the south end, and send you the way you need", () => {
  for (const s of SLOTS)
    for (const portalSide of [...SIDES, null]) {
      const portal = portalSide ? portalAt(portalSide, "north", "west") : null,
        sc = firstTowersScene(s, portal ? { portal } : null),
        p = zoneCenter(zoneOf(stepZone(sc.steps[0], []))),
        home: SplitSide = s === "H1" ? "west" : "east",
        to = landing(SPLIT_TOWER[home].south, p),
        goal: SplitSide = portalSide ? (portalSide === "west" ? "east" : "west") : home;
      assert.ok(onSide(p, home) && atEnd(p, "south"), `${s}: your tower`);
      assert.ok(onFloor(to) && onSide(to, goal), `${s} portal ${portalSide}: lands on the ${goal} platform`);
      if (!portal) assert.ok(atEnd(to, "north"), `${s}: no tether, land at the north end`);
    }
});

test("Arena Split: the towers are in the quadrant you ended in", () => {
  for (const side of SIDES)
    for (const end of ENDS) {
      const towers = zoneCenter(zoneOf(stepZone(splitTowers("H1", side, end, null).steps[0], []))),
        avalanche = zoneCenter(zoneOf(stepZone(avalancheScene("H1", side, end, "west", "north").steps[0], [])));
      for (const p of [towers, avalanche]) assert.ok(onSide(p, side) && atEnd(p, end));
    }
});

test("Arcadion Avalanche: the towers send you to the platform he does not face", () => {
  for (const side of SIDES)
    for (const end of ENDS)
      for (const face of SIDES) {
        const p = zoneCenter(zoneOf(stepZone(avalancheScene("H1", side, end, face, "north").steps[0], []))),
          to = landing(SPLIT_TOWER[side][end], p);
        assert.ok(onFloor(to) && onSide(to, face === "west" ? "east" : "west"), `${side} ${end}, he faces ${face}`);
      }
});

test("Arcadion Avalanche: the far end of the platform he does not face, away from his turn", () => {
  for (const face of SIDES)
    for (const swing of ENDS) {
      const p = zoneCenter(zoneOf(avalancheScene("H2", "west", "north", face, swing).steps[1].z));
      assert.ok(onSide(p, face === "west" ? "east" : "west"), "behind him");
      assert.ok(atEnd(p, swing === "north" ? "south" : "north") && Math.abs(p[1] - 50) > 30, "the far end");
    }
});

test("Powerful Gust: each tornado cones its two baits, support on its left and DPS on its right, facing in", () => {
  assert.equal(TORNADO_BAITS.length, 4);
  for (const { tornado: t, support, dps } of TORNADO_BAITS) {
    // Facing in from the tornado, left of the way you face is a negative cross product (y grows down).
    const inward: Point = [50 - t[0], 50 - t[1]];
    const side = (p: Point): number => inward[0] * (p[1] - t[1]) - inward[1] * (p[0] - t[0]);
    assert.isBelow(side(support), 0, `the support at ${t} is on its left`);
    assert.isAbove(side(dps), 0, `the DPS at ${t} is on its right`);
  }
  const cones = GUST_CONES.flatMap((o) => (o.t === "poly" ? [o.pts] : []));
  assert.equal(cones.length, 8, "eight cones");
  assert.equal(GUST_CONES.filter((o) => o.t === "aim").length, 8, "an arrow in each cone");
  const baits = TORNADO_BAITS.flatMap(({ tornado, support, dps }) => [
    [tornado, support],
    [tornado, dps],
  ]);
  baits.forEach(([t, p], i) => {
    const [apex, , middle] = cones[i];
    assert.deepEqual(apex, t, "the cone starts at its tornado");
    assert.closeTo(angOf([middle[0] - t[0], middle[1] - t[1]]), angOf([p[0] - t[0], p[1] - t[1]]), 1e-9, "and points at its bait");
  });
  const tornado = DRILLS.find((m) => m.id === "m-tornado");
  for (const s of SLOTS) {
    const step = tornado?.build(s, null).steps[0];
    assert.deepEqual(step?.reveal, GUST_CONES, `${s} sees all eight cones after answering`);
    const me = zoneCenter(zoneOf(step?.z));
    assert.isTrue(
      TORNADO_BAITS.some((b) => b.support[0] === me[0] && b.support[1] === me[1]),
      `${s} baits as a support`,
    );
  }
});

test("the number waymarks are the Kindred Outside preset, the set Hector's video uses", () => {
  // The preset in game coordinates (naurffxiv's M11S page); the arena's middle is (100, 100).
  const preset: Record<string, [number, number]> = { "1": [84, 89], "2": [116, 89], "3": [116, 111], "4": [84, 111] };
  for (const w of WAYMARKS.filter((m) => m.sq)) {
    const [x, z] = preset[w.id];
    assert.deepEqual([w.x, w.y], [(x - 80) * 2.5, (z - 80) * 2.5], `waymark ${w.id}`);
  }
});

test("Arena Split: when the tethers go off, a line runs from each portal through its player", () => {
  for (const tether of [true, false]) {
    const others = OTHERS.filter((o) => o !== "H1").slice(0, tether ? 3 : 4),
      sc = splitRound("H1", { tether, side: "west", end: "south", covered: "inner", endsSide: "east", others }),
      lineup = sc.steps[3],
      lines = (lineup.reveal ?? []).filter((o) => o.t === "band");
    assert.equal(lines.length, 4, "every tether's line");
    for (const l of lines) assert.equal(l.t === "band" && l.w, 25, "10 yalms wide (BossMod)");
    // With a tether, your own line goes through you; the others' lines are the ones to miss.
    assert.equal(lineup.hits?.length ?? lines.length, tether ? 3 : 4);
  }
});
