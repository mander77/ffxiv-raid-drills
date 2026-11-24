// The standard attacks: every attack in the game is one of a few kinds, and only its size
// changes. Each function takes where the attack is (a point in arena units) and its size in
// yalms, and returns the overlays the arena draws. A fight gets its set from its arena's size
// (`standardAttacks(BOSSMOD_ARENA_HALF)`), so the same yalms draw to scale in every fight.
//
// Directions are degrees clockwise from north, as in geometry.ts. The arena is 100 units across.
import { addVec, leftOf, polar } from "../geometry";
import type { Overlay, Point } from "../types";

/** An ability's shape, as a fight's source.gen.ts lists it (from BossMod), in yalms. A cone's
    angle and a rectangle's or a cross's width are the full values. A rectangle can also reach
    `back` yalms behind where it starts. */
// TS note: this union matches the entries of BOSSMOD_ABILITIES. An entry has more fields (id,
// cast...), and TypeScript allows them: a type only lists the fields it needs.
export type BossmodShape =
  | { shape: "circle"; range: number }
  | { shape: "donut"; inner: number; range: number }
  | { shape: "cone"; range: number; angle: number }
  | { shape: "rect"; range: number; width: number; back?: number }
  | { shape: "cross"; range: number; width: number }
  | { shape: "single-target" }
  | { shape: "unknown"; text: string };

/** The side of the arena that half-arena attacks hit. */
export type ArenaSide = "north" | "east" | "south" | "west";

/** The arena's center, in arena units. */
const CENTER: Point = [50, 50];

/** A raidwide hits the whole arena. This size is the app's choice, for the picture: a circle this
    big reaches the corners of the square arena (half its diagonal is about 71 units). */
export const RAIDWIDE_R = 72;

/** The ring of an attack whose size no source gives yet, in arena units. The app's choice: big
    enough to see, and clearly not a real size (it is dashed and grey). */
export const UNKNOWN_R = 8;

/** The widest piece of a cone's edge between two of its points, in degrees. A cone of up to 90
    degrees has three points on its edge (its two sides and its middle). */
const CONE_STEP = 45;

/** How many knockback arrows go around their source, and where they start, in arena units from
    it. The app's choice, for the picture. */
const KNOCKBACK_ARROWS = 8;
const KNOCKBACK_FROM = 6;

/** The rectangle of each half of the arena, as [x1, y1, x2, y2] in arena units. */
const HALF: Record<ArenaSide, [number, number, number, number]> = {
  north: [0, 0, 100, 50],
  east: [50, 0, 100, 100],
  south: [0, 50, 100, 100],
  west: [0, 0, 50, 100],
};

/** The standard attacks for an arena `arenaHalf` yalms from its center to its edge (BossMod's
    `ArenaBoundsSquare`), drawn 100 units across. */
export function standardAttacks(arenaHalf: number) {
  /** Yalms to arena units. */
  const yalms = (n: number): number => (n * 50) / arenaHalf;

  /** The whole arena. */
  const raidwide = (): Overlay => ({ t: "aoe", x: CENTER[0], y: CENTER[1], r: RAIDWIDE_R });

  /** A circle that hits everything inside `radius`. */
  const circle = (at: Point, radius: number): Overlay => ({ t: "aoe", x: at[0], y: at[1], r: yalms(radius) });

  /** A donut: it hits everything from `inner` out to `outer`. */
  const donut = (at: Point, inner: number, outer: number): Overlay => ({
    t: "donut",
    x: at[0],
    y: at[1],
    r1: yalms(inner),
    r2: yalms(outer),
  });

  /** A cone from `from` toward `facing`, `angle` degrees wide in all, `range` long. */
  function cone(from: Point, facing: number, angle: number, range: number): Overlay {
    const steps = Math.max(2, Math.ceil(angle / CONE_STEP));
    const edge = Array.from({ length: steps + 1 }, (_, i) => polar(facing - angle / 2 + (angle * i) / steps, yalms(range), from));
    return { t: "poly", pts: [from, ...edge] };
  }

  /** Proteans (clock spots): `count` cones out from `from`, one on each player, evenly around it.
      The first points toward `facing`. Each is `angle` degrees wide and `range` long. */
  function proteans(from: Point, angle: number, range: number, count = 8, facing = 0): Overlay[] {
    return Array.from({ length: count }, (_, i) => cone(from, facing + (360 * i) / count, angle, range));
  }

  /** A line from `from` toward `facing`, `length` long and `width` wide in all. It can start
      `back` yalms behind `from`. */
  function line(from: Point, facing: number, length: number, width: number, back = 0): Overlay {
    const d = polar(facing, 1, [0, 0]);
    const start = addVec(from, d, -yalms(back)),
      end = addVec(from, d, yalms(length));
    return { t: "band", x: start[0], y: start[1], x2: end[0], y2: end[1], w: yalms(width) };
  }

  /** A cross through `at`: one arm along `facing` and one across it. Each arm reaches `length`
      to both sides of `at`, and is `width` wide in all. */
  function cross(at: Point, facing: number, length: number, width: number): Overlay[] {
    const arm = (d: Point): Overlay => {
      const a = addVec(at, d, -yalms(length)),
        b = addVec(at, d, yalms(length));
      return { t: "band", x: a[0], y: a[1], x2: b[0], y2: b[1], w: yalms(width) };
    };
    const d = polar(facing, 1, [0, 0]);
    return [arm(d), arm(leftOf(d))];
  }

  /** Where a knockback from `from` sends you: bold arrows out from it in every direction,
      `distance` yalms long. */
  function knockback(from: Point, distance: number): Overlay[] {
    return Array.from({ length: KNOCKBACK_ARROWS }, (_, i) => {
      const deg = (360 * i) / KNOCKBACK_ARROWS;
      const a = polar(deg, KNOCKBACK_FROM, from),
        b = polar(deg, KNOCKBACK_FROM + yalms(distance), from);
      return { t: "knockback", x: a[0], y: a[1], x2: b[0], y2: b[1] };
    });
  }

  /** Half the arena, on `side`. With a knockback, from where it comes and how far, in yalms. */
  function halfArena(side: ArenaSide, push?: { from: Point; distance: number }): Overlay[] {
    const hit: Overlay = { t: "lane", rect: HALF[side] };
    return push ? [hit, ...knockback(push.from, push.distance)] : [hit];
  }

  /** A puddle on the floor. With a `life`, it goes off after that many seconds and is gone; with
      none, it stays until the phase ends or a step clears it. */
  const puddle = (at: Point, radius: number, life?: number): Overlay => ({
    t: "puddle",
    x: at[0],
    y: at[1],
    r: yalms(radius),
    ...(life === undefined ? {} : { life }),
  });

  /** A tower to soak, `radius` yalms, for `soak` players. */
  const tower = (at: Point, radius: number, soak: number): Overlay => ({ t: "tower", x: at[0], y: at[1], r: yalms(radius), soak });

  /** An attack whose size no source gives yet: a dashed grey ring with a "?". */
  const unknown = (at: Point): Overlay => ({ t: "unknown", x: at[0], y: at[1] });

  /** A BossMod ability as its standard attack, at `at` and toward `facing`. A single-target
      ability draws nothing; one with no known shape draws the "size unknown" mark. */
  function fromBossmod(ability: BossmodShape, at: Point, facing = 0): Overlay[] {
    switch (ability.shape) {
      case "circle":
        return [circle(at, ability.range)];
      case "donut":
        return [donut(at, ability.inner, ability.range)];
      case "cone":
        return [cone(at, facing, ability.angle, ability.range)];
      case "rect":
        return [line(at, facing, ability.range, ability.width, ability.back)];
      case "cross":
        return cross(at, facing, ability.range, ability.width);
      case "single-target":
        return [];
      case "unknown":
        return [unknown(at)];
    }
  }

  return { yalms, raidwide, circle, donut, cone, proteans, line, cross, halfArena, knockback, puddle, tower, unknown, fromBossmod };
}

/** The set of standard attacks of one arena. */
export type StandardAttacks = ReturnType<typeof standardAttacks>;
