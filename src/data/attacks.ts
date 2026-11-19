// The size and shape of the boss's attacks, in one place. The drills ("Where do I stand?" and
// Real time), the Mechanics pictures, the cheat sheet and the arena all use these, so a size
// changes everywhere at once.
//
// Sizes come from BossMod's M11S module (awgil/ffxiv_bossmod, RM11STheTyrant), which lists each
// ability's shape in yalms. The arena is 40 yalms across and 100 units in this app.
import { DEG, leftOf, vadd } from "../geometry";
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

/** A cone from c toward a (degrees clockwise from north), `half` degrees to each side, r units long. */
export function cleave(c: Point, a: number, half = 16, r = 80): Overlay {
  const p = (d: number): Point => [c[0] + r * Math.sin(d * DEG), c[1] - r * Math.cos(d * DEG)];
  return {t:"poly", pts:[c, p(a - half), p(a), p(a + half)]};
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
