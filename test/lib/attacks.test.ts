// The standard attacks: each one draws to scale from yalms, and every BossMod ability of every
// fight turns into one.
import { assert, test } from "vitest";
import * as M10S from "../../src/data/fights/m10s/source.gen";
import * as M11 from "../../src/data/fights/m11s/attacks";
import * as M11S from "../../src/data/fights/m11s/source.gen";
import { dist, polar } from "../../src/geometry";
import { RAIDWIDE_R, standardAttacks } from "../../src/lib/attacks";
import type { Overlay, Point } from "../../src/types";

const A = standardAttacks(M11S.BOSSMOD_ARENA_HALF);
const MID: Point = [50, 50];

/** An overlay of one kind, or a failed test. */
function kindOf<K extends Overlay["t"]>(o: Overlay | undefined, t: K): Extract<Overlay, { t: K }> {
  assert.equal(o?.t, t);
  return o as Extract<Overlay, { t: K }>;
}

test("yalms draw to the arena's scale: 40 yalms across is 100 units", () => {
  assert.equal(A.yalms(20), 50);
  assert.equal(standardAttacks(25).yalms(25), 50, "a bigger arena draws the same yalms smaller");
  assert.equal(kindOf(A.circle(MID, 8), "aoe").r, 20);
  const d = kindOf(A.donut(MID, 5, 60), "donut");
  assert.deepEqual([d.r1, d.r2], [12.5, 150]);
});

test("a raidwide covers the whole arena, corners too", () => {
  const r = kindOf(A.raidwide(), "aoe");
  assert.isAbove(r.r, dist(MID, [0, 0]));
  assert.equal(r.r, RAIDWIDE_R);
});

test("a cone is as wide and as long as its size, toward its facing", () => {
  const c = kindOf(A.cone(MID, 90, 90, 20), "poly");
  assert.deepEqual(c.pts[0], MID, "it starts at its source");
  for (const p of c.pts.slice(1)) assert.closeTo(dist(MID, p), 50, 1e-9);
  const [first, , last] = c.pts.slice(1);
  assert.deepEqual(first, polar(45, 50, MID));
  assert.deepEqual(last, polar(135, 50, MID));
  assert.isAbove(kindOf(A.cone(MID, 0, 180, 20), "poly").pts.length, 4, "a wide cone keeps its round edge");
});

test("a line runs from its source toward its facing, and can start behind it", () => {
  const l = kindOf(A.line([50, 100], 0, 20, 6), "band");
  assert.deepEqual([l.x, l.y], [50, 100]);
  assert.closeTo(l.x2, 50, 1e-9);
  assert.closeTo(l.y2, 50, 1e-9);
  assert.equal(l.w, 15);
  const back = kindOf(A.line(MID, 90, 10, 4, 4), "band");
  assert.closeTo(back.x, 40, 1e-9);
});

test("a cross is two lines through its middle, each reaching its length to both sides", () => {
  const [a, b] = A.cross(MID, 0, 40, 10).map((o) => kindOf(o, "band"));
  assert.closeTo(dist([a.x, a.y], [a.x2, a.y2]), 200, 1e-9);
  assert.closeTo(a.x, 50, 1e-9);
  assert.closeTo(b.y, 50, 1e-9);
  assert.equal(a.w, 25);
});

test("half the arena, with and without its knockback", () => {
  assert.deepEqual(kindOf(A.halfArena("west")[0], "lane").rect, [0, 0, 50, 100]);
  const push = A.halfArena("east", { from: MID, distance: 10 });
  assert.equal(push.length, 9, "the half, then the arrows");
  for (const g of A.knockback(MID, 10).map((o) => kindOf(o, "guide"))) assert.closeTo(dist([g.x, g.y], [g.x2, g.y2]), 25, 1e-9);
});

test("a puddle keeps its life, and a tower its soak count", () => {
  assert.equal(kindOf(A.puddle(MID, 6, 3), "puddle").life, 3);
  assert.notProperty(A.puddle(MID, 6), "life", "with no life, it stays");
  const t = kindOf(A.tower(MID, 4, 2), "tower");
  assert.deepEqual([t.r, t.soak], [10, 2]);
});

test("each BossMod ability turns into its standard attack", () => {
  assert.equal(A.fromBossmod(M11S.BOSSMOD_ABILITIES.Cometite, MID)[0]?.t, "aoe");
  assert.equal(A.fromBossmod(M11S.BOSSMOD_ABILITIES.AssaultEvolvedScytheAOE, MID)[0]?.t, "donut");
  assert.equal(A.fromBossmod(M11S.BOSSMOD_ABILITIES.SweepingVictory, MID, 45)[0]?.t, "poly");
  assert.equal(A.fromBossmod(M11S.BOSSMOD_ABILITIES.FearsomeFireballCharge, MID)[0]?.t, "band");
  assert.equal(A.fromBossmod(M11S.BOSSMOD_ABILITIES.AssaultEvolvedSwordAOE, MID).length, 2);
  assert.deepEqual(A.fromBossmod(M11S.BOSSMOD_ABILITIES.AutoAttack, MID), [], "a single-target hit draws nothing");
  assert.deepEqual(A.fromBossmod(M10S.BOSSMOD_ABILITIES.DeepVarialBoss, MID), [{ t: "unknown", x: 50, y: 50 }]);
});

test("every ability of every fight draws, with no new code", () => {
  for (const [fight, gen] of [
    ["m10s", M10S],
    ["m11s", M11S],
  ] as const) {
    const kit = standardAttacks(gen.BOSSMOD_ARENA_HALF);
    for (const [name, ability] of Object.entries(gen.BOSSMOD_ABILITIES)) {
      const os = kit.fromBossmod(ability, MID);
      if (ability.shape !== "single-target") assert.isAbove(os.length, 0, `${fight} ${name}`);
    }
  }
});

test("the standard attacks draw M11S's attacks the same as its own helpers", () => {
  const boss: Point = [50, 30];
  assert.deepEqual(A.circle(boss, M11S.BOSSMOD_ABILITIES.AssaultEvolvedAxeAOE.range), M11.axeHit(boss));
  assert.deepEqual(A.donut(boss, 5, 60), M11.donut(boss, M11.SCYTHE_SAFE));
  assert.deepEqual(
    A.cone(boss, 120, M11S.BOSSMOD_ABILITIES.SweepingVictory.angle, 60),
    M11.cleave(boss, 120, M11.PROTEAN_HALF, M11.PROTEAN_LEN),
  );
  const l = kindOf(A.line(boss, 180, 60, 6), "band"),
    old = kindOf(M11.lineTo(boss, [50, 60]), "band");
  for (const k of ["x", "y", "x2", "y2", "w"] as const) assert.closeTo(l[k], old[k], 1e-9, k);
});
