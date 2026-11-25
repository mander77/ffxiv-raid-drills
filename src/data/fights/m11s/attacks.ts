// The boss's attacks and their sizes, in one place. Practice, the full fight, the Learn card
// pictures, the cheat sheet and the arena all use these, so a size changes everywhere at once.
//
// Each attack is one of the standard attacks (src/lib/attacks.ts), drawn to M11S's arena. Sizes
// come from BossMod's M11S module (awgil/ffxiv_bossmod, RM11STheTyrant), which lists each
// ability's shape in yalms. Each size is read from source.gen.ts (`npm run import:sources`), by
// the BossMod ability it belongs to. The arena is 40 yalms across and 100 units in this app.
import { addVec, angOf, dist, unit } from "../../../geometry";
import { type Band, standardAttacks } from "../../../lib/attacks";
import { BOSSMOD_ACTORS, BOSSMOD_ARENA_HALF, BOSSMOD_SPLIT } from "./source.gen";
import { bossmod } from "./sources";
import type { Overlay, Point, Puddle } from "../../../types";

/** The standard attacks, drawn to M11S's arena. Sizes in yalms. */
export const ATTACK = standardAttacks(BOSSMOD_ARENA_HALF);
/** Yalms to arena units. */
const yalms = ATTACK.yalms;
/** Arena units to yalms, for a size the app works out on the arena (a stack that grows to cover
    its group, for example). */
export const inYalms = (units: number): number => units / yalms(1);
/** The direction from a to b, in degrees clockwise from north. */
const toward = (a: Point, b: Point): number => angOf([b[0] - a[0], b[1] - a[1]]);

/** The boss's hitbox radius, drawn as his target ring (BossMod: R5.000). */
export const HITBOX = yalms(BOSSMOD_ACTORS.Boss.radius);
/** Melee range, from the boss's center: his hitbox, 3 yalms of melee reach and the player's own
    0.5 (BossMod's melee hint is 8.5 yalms). */
export const MELEE_R = yalms(8.5);
/** Half the width of each arm of the sword cross ("range 40 width 10 cross"). */
export const SWORD_HALF = yalms(bossmod("AssaultEvolvedSwordAOE").width / 2);
/** Every spread and stack: Raw Steel, Comet, Crushing Comet, Eye of the Hurricane and Massive
    Meteor ("range 6 circle"). */
export const SPREAD_R = yalms(bossmod("CometSpread").range);
/** A Void Stardust puddle (Cometite, "range 6 circle"). */
export const PUDDLE_R = yalms(bossmod("Cometite").range);
/** A Void Stardust puddle as it drops. It stays on the floor for its cast (Cometite, 3.0 s),
    goes off once, and then it is gone. */
export const VOID_PUDDLE: Puddle = {r:PUDDLE_R, life:bossmod("Cometite").cast};
/** A Majestic Meteor puddle in Arena Split (MajesticMeteorAOE, "range 6 circle", 3.0 s cast). */
export const MAJESTIC_PUDDLE: Puddle = {r:yalms(bossmod("MajesticMeteorAOE").range), life:bossmod("MajesticMeteorAOE").cast};
/** An Atomic Impact fire puddle in Ecliptic Stampede, as the marked player drops it ("range 5
    circle"). It stays on the floor: BossMod draws it as a voidzone (AtomicImpactPuddle) that does
    not go off. */
export const ATOMIC_PUDDLE: Puddle = {r:yalms(bossmod("AtomicImpact").range), life:Number.POSITIVE_INFINITY};
/** The weapon scythe's donut: safe only within 5 yalms of him ("range 5-60 donut"). Its
    proteans hit at the same time. */
export const SCYTHE_SAFE = yalms(bossmod("AssaultEvolvedScytheAOE").inner);
/** The weapon scythe's proteans: one cone ("range 60 30-degree cone") on each of the eight clock
    spots around him. */
const SCYTHE_PROTEANS = 8;
/** How many degrees off your own clock spot the next player's protean cone starts: 45° between
    spots, less half a cone. Closer to your own spot than this, only your own cone hits you. */
export const SCYTHE_CLEAR_DEG = 360 / SCYTHE_PROTEANS - bossmod("SweepingVictory").angle / 2;
/** Raw Steel Trophy, scythe: half the angle of the cone the party shares ("range 60 45-degree
    cone"), in degrees. Its answer zone stands inside it. */
export const RAW_STACK_HALF = bossmod("RawSteelScytheHeavyHitter").angle / 2;
/** Every tower: the Arena Split towers (Explosion), the Ecliptic Stampede towers and Heartbreak
    Kick ("range 4 circle"). */
export const TOWER_R = yalms(bossmod("ExplosionTower").range);
/** Where the Mammoth Meteor proximity AoE lands, drawn as a small circle, in yalms. This size is
    the app's choice: the attack itself ("range 60 circle") covers the whole arena and hurts less
    with distance, so a circle its size would hide the point of the picture. */
const PROXIMITY_DOT = 2;

/* The Arena Split (BossMod's Flatliner file): two platforms, west and east of the boss, wider
   together than the square arena. The arena's center stays at 50, so the platforms reach past
   0 and 100. Each platform is as long as the arena (0 to 100). */
const SPLIT = BOSSMOD_SPLIT;
/** Each platform's west and east edges. */
export const PLATFORM_X = {
  west: [50 - yalms(SPLIT.platformCenter + SPLIT.platformHalfWidth), 50 - yalms(SPLIT.platformCenter - SPLIT.platformHalfWidth)],
  east: [50 + yalms(SPLIT.platformCenter - SPLIT.platformHalfWidth), 50 + yalms(SPLIT.platformCenter + SPLIT.platformHalfWidth)],
} as const satisfies Record<"west" | "east", readonly [number, number]>;
/** Half the split arena's width, from the boss to the outer edge of a platform. */
export const SPLIT_HALF_W = yalms(SPLIT.platformCenter + SPLIT.platformHalfWidth);
/** A tether counts as stretched this far from its portal (BossMod's StretchDistance, which it
    calls an estimate; the owner chose to use it). Shorter, it shows red; this long, blue. */
export const TETHER_STRETCH = yalms(SPLIT.stretch);
/** How far an Arena Split tower knocks the players in it, straight away from its middle (BossMod's
    ExplosionKnockback). */
export const TOWER_KNOCKBACK = yalms(SPLIT.towerKnockback);
/** True when a tether from its portal to p is stretched. */
export const isStretched = (portal: Point, p: Point): boolean => dist(portal, p) >= TETHER_STRETCH;
/** How far outside a platform's outer wall the tether portals stand: 3 yalms. BossMod has no
    portal spots (it reads them from the game), so this comes from Hector's guide video, drawn to
    scale (the owner's choice). */
export const PORTAL_OUT = yalms(3);
/** The side portal lines (Majestic Meteorain, "range 60 width 10 rect"): each one runs the whole
    length of a platform and covers this west to east range, half the platform's width. */
export const PORTAL_LINE_X: readonly (readonly [number, number])[] = SPLIT.lines.map((x) => {
  const half = yalms(bossmod("MajesticMeteorainRect").width) / 2;
  return [50 + yalms(x) - half, 50 + yalms(x) + half] as const;
});

/** The edge of the ground an attack does not reach: a green ring of radius r units around c (the
    inside of the scythe's donut, where the proteans still hit each player). Not an attack. */
export const safeRing = (c: Point, r: number): Overlay => ({t:"safe", x:c[0], y:c[1], r});

/* ---------- the attacks, each a standard attack at its BossMod size ---------- */

/** The whole arena. */
export const raidwide = (): Overlay => ATTACK.raidwide();
/** Every spread and stack: Raw Steel, Comet, Crushing Comet, Eye of the Hurricane and Massive
    Meteor ("range 6 circle"), on the player at p. */
export const spreadHit = (p: Point): Overlay => ATTACK.circle(p, bossmod("CometSpread").range);
/** A tower going off: the Arena Split towers (Explosion), the Ecliptic Stampede towers and
    Heartbreak Kick ("range 4 circle"). */
export const towerHit = (p: Point): Overlay => ATTACK.circle(p, bossmod("ExplosionTower").range);
/** A tower to soak ("range 4 circle"), with how many players soak it. */
export const soakTower = (p: Point, soak: number): Overlay => ATTACK.tower(p, bossmod("ExplosionTower").range, soak);
/** An Ecliptic Stampede solo tower (Cosmic Kiss, "range 4 circle"): one tank soaks it (BossMod's
    ImpactKiss: 1 soaker; Hector's Fixed Stampede: MT clockwise, OT counterclockwise). */
export const soloTower = (p: Point): Overlay => ATTACK.tower(p, bossmod("CosmicKissEcliptic").range, 1, true);
/** An Ecliptic Stampede pair tower (Weighty Impact, "range 4 circle"): two players soak it, a melee
    and a healer or ranged (BossMod's ImpactKiss: 2 soakers). */
export const pairTower = (p: Point): Overlay => ATTACK.tower(p, bossmod("WeightyImpact").range, 2);
/** The Heartbreak Kick tower ("range 4 circle"). BossMod lets up to 8 soak it; the app shows all 8
    (the owner's choice): either the whole party soaks it, or the tanks do with invulns. */
export const kickTower = (p: Point): Overlay => ATTACK.tower(p, bossmod("HeartbreakKickTower").range, 8);
/** A baited Meteorain meteor (Cosmic Kiss, "range 4 circle"). */
export const meteorHit = (p: Point): Overlay => ATTACK.circle(p, bossmod("CosmicKiss").range);
/** Where the Mammoth Meteor proximity AoE lands (PROXIMITY_DOT). */
export const proximityDot = (p: Point): Overlay => ATTACK.circle(p, PROXIMITY_DOT);
/** The axe hit: a circle around the boss at c ("range 8 circle"). */
export const axeHit = (c: Point): Overlay => ATTACK.circle(c, bossmod("AssaultEvolvedAxeAOE").range);
/** The weapon scythe's donut around the boss at c: safe only within 5 yalms of him ("range 5-60
    donut"). */
export const scytheDonut = (c: Point): Overlay => {
  const s = bossmod("AssaultEvolvedScytheAOE");
  return ATTACK.donut(c, s.inner, s.range);
};
/** One scythe protean cone from `from` toward `facing`, in degrees ("range 60 30-degree cone"). */
export const proteanCone = (from: Point, facing: number): Overlay => {
  const s = bossmod("SweepingVictory");
  return ATTACK.cone(from, facing, s.angle, s.range);
};
/** The weapon scythe's proteans: eight cones out from the boss at c, the first toward `facing`. */
export const scytheProteans = (c: Point, facing: number): Overlay[] => {
  const s = bossmod("SweepingVictory");
  return ATTACK.proteans(c, s.angle, s.range, SCYTHE_PROTEANS, facing);
};
/** Raw Steel Trophy, scythe: the cone on each tank ("range 60 90-degree cone"). */
export const tankCone = (from: Point, facing: number): Overlay => {
  const s = bossmod("RawSteelScytheBuster");
  return ATTACK.cone(from, facing, s.angle, s.range);
};
/** Raw Steel Trophy, scythe: the cone the party shares ("range 60 45-degree cone"). */
export const sharedCone = (from: Point, facing: number): Overlay => {
  const s = bossmod("RawSteelScytheHeavyHitter");
  return ATTACK.cone(from, facing, s.angle, s.range);
};
/** Fire and Fury: one cone in front of the boss at c (who faces `facing`) and one behind him
    ("range 60 90-degree cone" each). */
export const fireAndFury = (c: Point, facing: number): Overlay[] => {
  const front = bossmod("FireAndFuryFront"), back = bossmod("FireAndFuryBack");
  return [ATTACK.cone(c, facing, front.angle, front.range), ATTACK.cone(c, facing + 180, back.angle, back.range)];
};
/** Half a line stack's width, in arena units: a spot this far or further from its middle line is
    out of it. */
export const LINE_STACK_HALF = yalms(bossmod("FearsomeFireballCharge").width) / 2;
/** A line stack from `from` through `to`: the Meteorain charge (Fearsome Fireball) and Two-way and
    Four-way Fireball ("range 60 width 6 rect"). */
export const lineStack = (from: Point, to: Point): Band => {
  const s = bossmod("FearsomeFireballCharge");
  return ATTACK.line(from, toward(from, to), s.range, s.width);
};
/** A Hurricane Explosion line in Dance of Domination, from `from` toward `to` ("range 60 width 10
    rect"). */
export const hurricaneLine = (from: Point, to: Point): Band => {
  const s = bossmod("HurricaneExplosion");
  return ATTACK.line(from, toward(from, to), s.range, s.width);
};
/** Fire Breath in the Arena Split: a line from the boss through a marked player ("range 60 width 6
    rect"). */
export const fireBreath = (from: Point, to: Point): Band => {
  const s = bossmod("FireBreathRect");
  return ATTACK.line(from, toward(from, to), s.range, s.width);
};
/** The Great Wall of Fire line buster, from the boss toward `facing` ("range 60 width 6 rect"). */
export const wallOfFire = (from: Point, facing: number): Band => {
  const s = bossmod("GreatWallOfFireRect");
  return ATTACK.line(from, facing, s.range, s.width);
};
/** Majestic Meteowrath: when a tether goes off, a line from its portal through the tethered player
    ("range 60 width 10 rect"). */
export const wrathLine = (portal: Point, player: Point): Band => {
  const s = bossmod("MajesticMeteowrathRect");
  return ATTACK.line(portal, toward(portal, player), s.range, s.width);
};
/** Majestic Meteowrath in Ecliptic Stampede: the same line from a portal through its tethered
    player ("range 60 width 10 rect", MajesticMeteowrathEcliptic). */
export const eclipticWrath = (portal: Point, player: Point): Band => {
  const s = bossmod("MajesticMeteowrathEcliptic");
  return ATTACK.line(portal, toward(portal, player), s.range, s.width);
};
/** A Void Stardust puddle on the floor (Cometite, "range 6 circle"). */
export const voidPuddle = (p: Point): Overlay => ATTACK.puddle(p, bossmod("Cometite").range);
/** The fire puddle an Atomic Impact leaves in Ecliptic Stampede ("range 5 circle"). */
export const atomicPuddle = (p: Point): Overlay => ATTACK.puddle(p, bossmod("AtomicImpact").range);

/** Where an aim arrow starts and ends, in arena units from the cone's source: clear of a
    tornado's icon, and out past the player it baits. The app's choice, for the picture. */
const AIM_FROM = 6;
const AIM_TO = 22;

/** Powerful Gust: a tornado's cone on the player at `to`, with an arrow down its middle, so a
    cone that the arena clips to a box still shows where it comes from. */
export function gust(from: Point, to: Point): Overlay[] {
  const d = unit([to[0] - from[0], to[1] - from[1]]);
  const [a, b] = [addVec(from, d, AIM_FROM), addVec(from, d, AIM_TO)];
  const s = bossmod("PowerfulGust");
  return [ATTACK.cone(from, angOf(d), s.angle, s.range), {t:"aim", x:a[0], y:a[1], x2:b[0], y2:b[1]}];
}

/** The safe pocket for a sword: behind the boss at c (who faces d) on side sv (a unit vector
    across d), outside both arms of the cross. The arms reach past the arena, so the pocket does
    too: anywhere in it inside the arena is safe. */
export function swordPocket(c: Point, d: Point, sv: Point): Point[] {
  const corner = addVec(addVec(c, d, -SWORD_HALF), sv, SWORD_HALF), far = 150;
  return [corner, addVec(corner, d, -far), addVec(addVec(corner, d, -far), sv, far), addVec(corner, sv, far)];
}

/** The sword hit: a cross through the boss at c, one arm along d (the way he faces) and one
    across it ("range 40 width 10 cross"). Each arm reaches past both edges of the arena. */
export function swordCross(c: Point, d: Point): Overlay[] {
  const s = bossmod("AssaultEvolvedSwordAOE");
  return ATTACK.cross(c, angOf(d), s.range, s.width);
}

/** The tanks for a buster, and what hits them. Great Wall of Fire is a line buster the two tanks
    share: they stand together in front of the boss (he faces north), and the line runs from him
    through them. Foregone Fatality hits each tethered tank alone (single-target, no AoE): the MT
    on the NE tether, the OT on the SW tether, away from the party stack. */
export function busterPieces(name: string, boss: Point): Overlay[] {
  const tank = (p: Point, l: string): Overlay[] => [{t:"target", x:p[0], y:p[1]}, {t:"mark", x:p[0], y:p[1], l, r:"T"}];
  if(name.startsWith("Great Wall of Fire")){
    const front: Point = [boss[0], boss[1] - 17];
    return [wallOfFire(boss, 0),
      ...tank([front[0] - 3, front[1]], "MT"), ...tank([front[0] + 3, front[1]], "OT")];
  }
  const mt: Point = [boss[0] + 14, boss[1] - 14], ot: Point = [boss[0] - 14, boss[1] + 14];
  return [...tank(mt, "MT"), ...tank(ot, "OT")];
}
