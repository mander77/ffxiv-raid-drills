// The size and shape of the boss's attacks, in one place. The drills ("Where do I stand?" and
// Real time), the Mechanics pictures, the cheat sheet and the arena all use these, so a size
// changes everywhere at once.
//
// Sizes come from BossMod's M11S module (awgil/ffxiv_bossmod, RM11STheTyrant), which lists each
// ability's shape in yalms. The arena is 40 yalms across and 100 units in this app.
import { DEG, leftOf, unit, vadd } from "../geometry";
import type { Overlay, Point } from "../types";

/** Yalms to arena units. */
const yalms = (n: number): number => n * 2.5;

/** The boss's hitbox radius, drawn as his target ring (BossMod: R5.000). */
export const HITBOX = yalms(5);
/** Half the width of each arm of the sword cross ("range 40 width 10 cross"). */
export const SWORD_HALF = yalms(5);
/** The axe circle ("range 8 circle"). */
export const AXE_R = yalms(8);
/** Every spread and stack: Raw Steel, Comet, Crushing Comet, Eye of the Hurricane and Massive
    Meteor ("range 6 circle"). */
export const SPREAD_R = yalms(6);
/** A Void Stardust puddle (Cometite, "range 6 circle"). */
export const PUDDLE_R = yalms(6);
/** Each scythe protean cone: 30 degrees wide (half each side, in degrees), and it reaches across
    the arena ("range 60 30-degree cone"). */
export const PROTEAN_HALF = 15;
export const PROTEAN_LEN = yalms(60);
/** The weapon scythe's donut: safe only within 5 yalms of him ("range 5-60 donut"). Its
    proteans hit at the same time. */
export const SCYTHE_SAFE = yalms(5);
/** A line stack's full width: the Meteorain charge (Fearsome Fireball) and Two-way and Four-way
    Fireball ("range 60 width 6 rect"). */
export const LINE_STACK_W = yalms(6);
/** A Hurricane Explosion line's full width, in Dance of Domination ("range 60 width 10 rect"). */
export const HURRICANE_W = yalms(10);
/** Raw Steel Trophy, scythe: half the angle of the cone on each tank ("range 60 90-degree
    cone") and of the cone the party shares ("range 60 45-degree cone"), in degrees. */
export const RAW_TANK_HALF = 45;
export const RAW_STACK_HALF = 22.5;
/** The Great Wall of Fire line buster: its full width ("range 60 width 6 rect"). */
export const WALL_W = yalms(6);
/** Every tower: the Arena Split towers (Explosion), the Ecliptic Stampede towers and Heartbreak
    Kick ("range 4 circle"). */
export const TOWER_R = yalms(4);
/** A baited Meteorain meteor (Cosmic Kiss, "range 4 circle"). */
export const METEOR_R = yalms(4);
/** An Atomic Impact hit in Ecliptic Stampede, and the fire puddle it leaves ("range 5 circle"). */
export const ATOMIC_R = yalms(5);

/** A circle that hits everything inside it. */
export const aoe = (c: Point, r: number): Overlay => ({t:"aoe", x:c[0], y:c[1], r});
/** The safe ground inside an attack: a green ring of radius r around c. */
export const safeRing = (c: Point, r: number): Overlay => ({t:"safe", x:c[0], y:c[1], r});
/** A donut around c: it hits everything from r1 out to r2. */
export const donut = (c: Point, r1: number, r2 = 150): Overlay => ({t:"donut", x:c[0], y:c[1], r1, r2});
/** A line from `from` through `to` and on past the arena edge, w units wide: a line stack by default. */
export const lineTo = (from: Point, to: Point, w = LINE_STACK_W): Overlay => {
  const d = unit([to[0] - from[0], to[1] - from[1]]);
  return {t:"band", x:from[0], y:from[1], x2:from[0] + d[0] * 150, y2:from[1] + d[1] * 150, w};
};

/** A cone from c toward a (degrees clockwise from north), `half` degrees to each side, r units long. */
// TS note: Extract keeps only the poly member of the Overlay union, so a caller can spread a
// cone and add a poly-only field (line) without a type error.
export function cleave(c: Point, a: number, half = 16, r = 80, r0 = 0): Extract<Overlay, {t: "poly"}> {
  const at = (d: number, rr: number): Point => [c[0] + rr * Math.sin(d * DEG), c[1] - rr * Math.cos(d * DEG)];
  const outer = [at(a - half, r), at(a, r), at(a + half, r)];
  // With r0, the cone starts r0 out from c, so the ground closer in stays clear in the picture.
  return {t:"poly", pts:r0 > 0 ? [at(a - half, r0), ...outer, at(a + half, r0), at(a, r0)] : [c, ...outer]};
}

/** The axe hit: a circle around the boss at c. */
export const axeHit = (c: Point): Overlay => aoe(c, AXE_R);

/** The safe pocket for a sword: behind the boss at c (who faces d) on side sv (a unit vector
    across d), outside both arms of the cross. The arms reach past the arena, so the pocket does
    too: anywhere in it inside the arena is safe. */
export function swordPocket(c: Point, d: Point, sv: Point): Point[] {
  const corner = vadd(vadd(c, d, -SWORD_HALF), sv, SWORD_HALF), far = 150;
  return [corner, vadd(corner, d, -far), vadd(vadd(corner, d, -far), sv, far), vadd(corner, sv, far)];
}

/** The sword hit: a cross through the boss at c, one arm along d (the way he faces) and one
    across it, each arm reaching past both edges of the arena. */
export function swordCross(c: Point, d: Point): Overlay[] {
  const arm = (v: Point): Overlay => ({t:"band", x:c[0] - v[0] * 150, y:c[1] - v[1] * 150, x2:c[0] + v[0] * 150, y2:c[1] + v[1] * 150, w:SWORD_HALF * 2});
  return [arm(d), arm(leftOf(d))];
}
