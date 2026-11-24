// The size and shape of the boss's attacks, in one place. Practice, the full fight,
// the Learn card pictures, the cheat sheet and the arena all use these, so a size
// changes everywhere at once.
//
// Sizes come from BossMod's M11S module (awgil/ffxiv_bossmod, RM11STheTyrant), which lists each
// ability's shape in yalms. Each size is read from source.gen.ts (`npm run import:sources`), by
// the BossMod ability it belongs to. The arena is 40 yalms across and 100 units in this app.
import { addVec, angOf, dist, leftOf, polar, unit } from "../../../geometry";
import { BOSSMOD_ACTORS, BOSSMOD_SPLIT } from "./source.gen";
import { bossmod } from "./sources";
import type { Overlay, Point, Puddle } from "../../../types";

/** Yalms to arena units. */
const yalms = (n: number): number => n * 2.5;

/** The boss's hitbox radius, drawn as his target ring (BossMod: R5.000). */
export const HITBOX = yalms(BOSSMOD_ACTORS.Boss.radius);
/** Melee range, from the boss's center: his hitbox, 3 yalms of melee reach and the player's own
    0.5 (BossMod's melee hint is 8.5 yalms). */
export const MELEE_R = yalms(8.5);
/** Half the width of each arm of the sword cross ("range 40 width 10 cross"). */
export const SWORD_HALF = yalms(bossmod("AssaultEvolvedSwordAOE").width / 2);
/** The axe circle ("range 8 circle"). */
export const AXE_R = yalms(bossmod("AssaultEvolvedAxeAOE").range);
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
/** Each scythe protean cone: 30 degrees wide (half each side, in degrees), and it reaches across
    the arena ("range 60 30-degree cone"). */
export const PROTEAN_HALF = bossmod("SweepingVictory").angle / 2;
export const PROTEAN_LEN = yalms(bossmod("SweepingVictory").range);
/** The weapon scythe's donut: safe only within 5 yalms of him ("range 5-60 donut"). Its
    proteans hit at the same time. */
export const SCYTHE_SAFE = yalms(bossmod("AssaultEvolvedScytheAOE").inner);
/** A line stack's full width: the Meteorain charge (Fearsome Fireball) and Two-way and Four-way
    Fireball ("range 60 width 6 rect"). */
export const LINE_STACK_W = yalms(bossmod("FearsomeFireballCharge").width);
/** A Hurricane Explosion line's full width, in Dance of Domination ("range 60 width 10 rect"). */
export const HURRICANE_W = yalms(bossmod("HurricaneExplosion").width);
/** Raw Steel Trophy, scythe: half the angle of the cone on each tank ("range 60 90-degree
    cone") and of the cone the party shares ("range 60 45-degree cone"), in degrees. */
export const RAW_TANK_HALF = bossmod("RawSteelScytheBuster").angle / 2;
export const RAW_STACK_HALF = bossmod("RawSteelScytheHeavyHitter").angle / 2;
/** Each tornado's cone in Ultimate Trophy Weapons (Powerful Gust, "range 60 90-degree cone"):
    half its angle, in degrees, and its length. */
export const GUST_HALF = bossmod("PowerfulGust").angle / 2;
export const GUST_LEN = yalms(bossmod("PowerfulGust").range);
/** Fire Breath in the Arena Split: a line from the boss through each marked player, this wide
    ("range 60 width 6 rect"). */
export const BREATH_W = yalms(bossmod("FireBreathRect").width);
/** Where the Mammoth Meteor proximity AoE lands, drawn as a small circle. This size is the app's
    choice: the attack itself ("range 60 circle") covers the whole arena and hurts less with
    distance, so a circle its size would hide the point of the picture. */
export const PROXIMITY_DOT = 5;
/** The Great Wall of Fire line buster: its full width ("range 60 width 6 rect"). */
export const WALL_W = yalms(bossmod("GreatWallOfFireRect").width);
/** Every tower: the Arena Split towers (Explosion), the Ecliptic Stampede towers and Heartbreak
    Kick ("range 4 circle"). */
export const TOWER_R = yalms(bossmod("ExplosionTower").range);
/** A baited Meteorain meteor (Cosmic Kiss, "range 4 circle"). */
export const METEOR_R = yalms(bossmod("CosmicKiss").range);
/** A raidwide hits the whole arena. This size is the app's choice, for the picture: a circle this
    big reaches the corners of the square arena (half its diagonal is about 71 units). */
export const RAIDWIDE_R = 72;
/** An Atomic Impact hit in Ecliptic Stampede, and the fire puddle it leaves ("range 5 circle"). */
export const ATOMIC_R = yalms(bossmod("AtomicImpact").range);

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

/** A circle that hits everything inside it. */
export const aoe = (c: Point, r: number): Overlay => ({t:"aoe", x:c[0], y:c[1], r});
/** The edge of the ground an attack does not reach: a green ring of radius r around c (the
    inside of the scythe's donut, where the proteans still hit each player). */
export const safeRing = (c: Point, r: number): Overlay => ({t:"safe", x:c[0], y:c[1], r});
/** A donut around c: it hits everything from r1 out to r2. */
export const donut = (c: Point, r1: number, r2 = 150): Overlay => ({t:"donut", x:c[0], y:c[1], r1, r2});
/** A line from `from` through `to` and on past the arena edge, w units wide: a line stack by default. */
export const lineTo = (from: Point, to: Point, w = LINE_STACK_W): Overlay => {
  const d = unit([to[0] - from[0], to[1] - from[1]]);
  return {t:"band", x:from[0], y:from[1], x2:from[0] + d[0] * 150, y2:from[1] + d[1] * 150, w};
};
/** Majestic Meteowrath: when a tether goes off, a line from its portal through the tethered player
    ("range 60 width 10 rect"). */
export const wrathLine = (portal: Point, player: Point): Extract<Overlay, {t: "band"}> => {
  const d = unit([player[0] - portal[0], player[1] - portal[1]]), len = yalms(bossmod("MajesticMeteowrathRect").range);
  return {t:"band", x:portal[0], y:portal[1], x2:portal[0] + d[0] * len, y2:portal[1] + d[1] * len, w:yalms(bossmod("MajesticMeteowrathRect").width)};
};

/** A cone from c toward a (degrees clockwise from north), `half` degrees to each side, r units long. */
export function cleave(c: Point, a: number, half = 16, r = 80): Overlay {
  const p = (d: number): Point => polar(d, r, c);
  return {t:"poly", pts:[c, p(a - half), p(a), p(a + half)]};
}

/** Where an aim arrow starts and ends, in arena units from the cone's source: clear of a
    tornado's icon, and out past the player it baits. The app's choice, for the picture. */
const AIM_FROM = 6;
const AIM_TO = 22;

/** Powerful Gust: a tornado's cone on the player at `to`, with an arrow down its middle, so a
    cone that the arena clips to a box still shows where it comes from. */
export function gust(from: Point, to: Point): Overlay[] {
  const d = unit([to[0] - from[0], to[1] - from[1]]);
  const [a, b] = [addVec(from, d, AIM_FROM), addVec(from, d, AIM_TO)];
  return [cleave(from, angOf(d), GUST_HALF, GUST_LEN), {t:"aim", x:a[0], y:a[1], x2:b[0], y2:b[1]}];
}

/** The axe hit: a circle around the boss at c. */
export const axeHit = (c: Point): Overlay => aoe(c, AXE_R);

/** The safe pocket for a sword: behind the boss at c (who faces d) on side sv (a unit vector
    across d), outside both arms of the cross. The arms reach past the arena, so the pocket does
    too: anywhere in it inside the arena is safe. */
export function swordPocket(c: Point, d: Point, sv: Point): Point[] {
  const corner = addVec(addVec(c, d, -SWORD_HALF), sv, SWORD_HALF), far = 150;
  return [corner, addVec(corner, d, -far), addVec(addVec(corner, d, -far), sv, far), addVec(corner, sv, far)];
}

/** The sword hit: a cross through the boss at c, one arm along d (the way he faces) and one
    across it, each arm reaching past both edges of the arena. */
export function swordCross(c: Point, d: Point): Overlay[] {
  const arm = (v: Point): Overlay => ({t:"band", x:c[0] - v[0] * 150, y:c[1] - v[1] * 150, x2:c[0] + v[0] * 150, y2:c[1] + v[1] * 150, w:SWORD_HALF * 2});
  return [arm(d), arm(leftOf(d))];
}

/** The tanks for a buster, and what hits them. Great Wall of Fire is a line buster the two tanks
    share: they stand together in front of the boss (he faces north), and the line runs from him
    through them. Foregone Fatality hits each tethered tank alone (single-target, no AoE): the MT
    on the NE tether, the OT on the SW tether, away from the party stack. */
export function busterPieces(name: string, boss: Point): Overlay[] {
  const tank = (p: Point, l: string): Overlay[] => [{t:"target", x:p[0], y:p[1]}, {t:"mark", x:p[0], y:p[1], l, r:"T"}];
  if(name.startsWith("Great Wall of Fire")){
    const front: Point = [boss[0], boss[1] - 17];
    return [{t:"band", x:boss[0], y:boss[1], x2:boss[0], y2:-20, w:WALL_W},
      ...tank([front[0] - 3, front[1]], "MT"), ...tank([front[0] + 3, front[1]], "OT")];
  }
  const mt: Point = [boss[0] + 14, boss[1] - 14], ot: Point = [boss[0] - 14, boss[1] + 14];
  return [...tank(mt, "MT"), ...tank(ot, "OT")];
}
