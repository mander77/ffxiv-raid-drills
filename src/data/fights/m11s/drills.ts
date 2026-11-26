// Map drills: the arena scenes and the rules that decide each answer zone.
import { bySlot, shuffle, random } from "../../../util";
import { P1, P2, P3, P4 } from "./timeline";
import { DEG, unit, addVec, leftOf, angOf, inArena, inZone, polar, dist, zoneCenter } from "../../../geometry";
import { PLATFORM_X, PORTAL_OUT, SPLIT_HALF_W, TETHER_STRETCH, TOWER_KNOCKBACK, wrathLine, eclipticWrath, fireBreath, HITBOX, MELEE_R, SWORD_HALF, ORBITAL_LANE, TORNADO_R, SPREAD_R, PUDDLE_R, VOID_PUDDLE, MAJESTIC_PUDDLE, ATOMIC_PUDDLE, LINE_STACK_HALF, TOWER_R, RAW_STACK_HALF, SCYTHE_CLEAR_DEG, SCYTHE_SAFE, atomicPuddle, axeHit, crushingComet, eyeOfTheHurricane, fireAndFury, gust, hurricaneLine, kickTower, lineStack, pairTower, safeRing, scytheDonut, scytheProteans, sharedCone, soakTower, soloTower, swordCross, swordPocket, tankCone, towerHit, ROCK_GAP, meteorHit, rockExplosion } from "./attacks";
import { FOUR_WAY_RULE, METEOR_ORDER_RULE, ORBITAL_RULE, RAW_STEEL_RULE, TWO_WAY_RULE, VOID_2_SPREAD_RULE, VOID_2_START_RULE } from "./rules";
import { markRole, partyOf } from "../../../party";
import { thrownTo } from "../../route";
import type { Boss, CircleZone, Drill, Lines, Overlay, Point, RectZone, Scene, Slot, SlotName, Step, StepResult, Zone } from "../../../types";

export type WeaponType = "axe" | "sword" | "scythe";
/** One weapon in a jump set. `a` is its direction from the arena center, in degrees clockwise from north.
    `axis`, when set, turns the icon: it is the long side, from the handle end to the tip. */
export interface Weapon { a: number; p: Point; type: WeaponType; where?: string; tornado?: boolean; axis?: Point }
/** Everything a jump-set drill needs: the weapons, where the boss stands after each jump, the steps and the drawing. */
export interface JumpSet { W: Weapon[]; states: Boss[]; steps: Step[]; overlays: Overlay[] }

const WEAPON_TYPES: WeaponType[] = ["axe", "sword", "scythe"];
const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
/** A weapon spot's direction as the text says it: a cardinal as a word, an intercardinal short. */
const WHERE = ["north", "NE", "east", "SE", "south", "SW", "west", "NW"] as const;
/** A weapon spot: 29 units from the arena center, `a` degrees clockwise from north. */
export const atAngle = (a: number): Point => polar(a, 29);
/** Just outside the boss's hitbox: where the first puddle and his butt spot are. */
const OUTSIDE = HITBOX + 4.5;
/** The first Void Stardust puddle: north of the boss, just outside his hitbox. */
export const FIRST_PUDDLE: Point = [50, 50 - OUTSIDE];

/** How far a weapon's name sits from its spot, out to the side of the line it rests along. The
    app's choice: clear of the weapon's icon and line. */
const TAG_OUT = 11;

/** Where the name of a weapon at p, resting along u, goes: out to the side of its line, on the
    side away from the arena center, so it stays clear of the waymark and the boss. */
function weaponTagAt(p: Point, u: Point): Point {
  const n: Point = [-u[1], u[0]];
  const side = n[0] * (p[0] - 50) + n[1] * (p[1] - 50) >= 0 ? 1 : -1;
  return addVec(p, n, side * TAG_OUT);
}

/* A jump set: the boss starts in the middle and jumps to each weapon in order.
   He faces the way he jumped, so relative north at each weapon = his travel direction. */
export function buildJumpSet(s: Slot, W: Weapon[]): JumpSet {
  const states: Boss[] = [{x:50, y:50, f:W[0].a}];
  const dirs: Point[] = [];   // dirs[i] = the direction of the jump into weapon i
  let prev: Point = [50, 50];
  W.forEach(w => {
    const d = unit([w.p[0] - prev[0], w.p[1] - prev[1]]);
    dirs.push(d);
    states.push({x:w.p[0], y:w.p[1], f:angOf(d), d});
    prev = w.p;
  });
  /* The scythe lies with its butt on his left and its blade end on his right as he lands,
     so H1 (butt) and H2 (point) can read their spot from the weapon itself.
     A weapon with an axis is drawn turned that way instead, and the scythe spots follow it. */
  const scytheAxis = (w: Weapon, i: number): Point => w.axis ?? [-dirs[i][1], dirs[i][0]];
  const overlays: Overlay[] = [];
  W.forEach((w, i) => {
    // The line the weapon rests along. Without a turn, a sword or an axe lies across the line to
    // the arena center (as Weapon draws it).
    const out = unit([w.p[0] - 50, w.p[1] - 50]);
    const u: Point = w.type === "scythe" ? scytheAxis(w, i) : w.axis ?? [-out[1], out[0]];
    const at = weaponTagAt(w.p, u);
    const tag: Overlay = {t:"tag", spawn:i, x:at[0], y:at[1], s:w.type.toUpperCase()};
    if(w.type === "scythe"){
      const d: Point = [u[1], -u[0]];
      overlays.push({t:"scythe", spawn:i, x:w.p[0], y:w.p[1], ux:u[0], uy:u[1], dx:d[0], dy:d[1]}, tag);
    } else {
      const turn = w.axis ? {ux:w.axis[0], uy:w.axis[1]} : {};
      overlays.push(tag, {t:w.type, spawn:i, x:w.p[0], y:w.p[1], ...turn});
    }
  });
  const HW = SWORD_HALF, side = bySlot(s, {H1:1, H2:-1}), own = bySlot(s, {H1:"left", H2:"right"});
  const steps = W.map((w, i): Step => {
    const st = states[i + 1], P: Point = [st.x, st.y], d = dirs[i], L = leftOf(d), sv: Point = [L[0] * side, L[1] * side];
    const where = w.where || WHERE[Math.round(w.a / 45) % 8];
    let z: Zone, a: Lines, reveal: Overlay[], stand: Point | undefined, hits: Overlay[] | undefined;
    if(w.type === "axe"){
      z = {c:addVec(P, unit([50 - P[0], 50 - P[1]]), 28), r:7};
      a = ["Axe, " + where + ": Party Stack in the middle.", "Stay outside the axe AoE."];
      reveal = [axeHit(P)];
    } else if(w.type === "scythe"){
      // H1 at the butt end, H2 at the point end, as the scythe is drawn: the spot, close in.
      z = scytheSpot(P, addVec(P, scytheAxis(w, i), -9.5 * side));
      a = ["Scythe, " + where + ": close in at the " + bySlot(s, {H1:"butt (the handle end).", H2:"point (the blade end)."})];
      // Proteans: a cone on every player, so each player takes a clock spot close around him.
      // The point and the butt (H2 and H1) are two of the eight spots, opposite each other.
      const pointAt = angOf(scytheAxis(w, i));
      // And a donut: only close to him is out of it, so the clock spots are close in. Its inner
      // edge shows as a green ring. Each player still takes their own protean cone there.
      const cones = scytheProteans(P, pointAt);
      reveal = [scytheDonut(P), safeRing(P, SCYTHE_SAFE), ...cones];
      // Your own cone is the one at your end: the point (H2) is cone 0, the butt (H1) cone 4.
      const mine = bySlot(s, {H1:4, H2:0});
      hits = [scytheDonut(P), ...cones.filter((_c, k) => k !== mine)];
    } else {
      // Safe pocket: behind him (f < -HW) and on your side (sd > HW), outside both arms of the
      // cross. Anywhere in it inside the arena is correct, and the drawn pocket is the same area.
      const fn = (p: Point): boolean => { const v: Point = [p[0] - P[0], p[1] - P[1]], f = v[0] * d[0] + v[1] * d[1], sd = v[0] * sv[0] + v[1] * sv[1]; return inArena(p) && f < -HW && sd > HW; };
      const poly = swordPocket(P, d, sv);
      // Where to stand: on the pocket's diagonal, 2 yalms (5 units) clear of each arm, so in the
      // moment you can see that you are safe. That is about 25 units (9.9 yalms) from him. The
      // sword's stack is a line from him through you, so the melee can stand closer in that line.
      const CLEAR = 5;
      stand = addVec(addVec(P, d, -(HW + CLEAR)), sv, HW + CLEAR);
      z = {fn, show:[{poly}], label:addVec(P, unit(addVec([-d[0], -d[1]], sv)), (HW + CLEAR) * Math.SQRT2 + 4)};
      a = ["Sword, " + where + ": the pocket behind him, on his " + own + ".", "It is on the side he jumped from.", "Stand a few steps in from its inner corner.", bySlot(s, {H1:"Light party 1", H2:"Light party 2"}) + " stacks on you."];
      reveal = swordCross(P, d);
    }
    const leave: Overlay | null = w.tornado ? {t:"tornado", x:P[0], y:P[1]} : null;
    return {q:ORDINALS[i] + " weapon: click where you go.", z, a, reveal, leave, stand, ...(hits ? {hits} : {})};
  });
  return {W, states, steps, overlays};
}

/** How far from the scythe spot a click still counts, before the safe ground cuts it down: the
    app's choice. */
const SCYTHE_REACH = 5;

/* The scythe's correct area: within SCYTHE_REACH of your spot (its best spot), but only where
   nothing else hits you. The donut leaves only SCYTHE_SAFE around him, and the next player's
   protean cone starts SCYTHE_CLEAR_DEG off your clock spot. The map draws the same area. */
function scytheSpot(P: Point, spot: Point): Zone {
  const mine = angOf([spot[0] - P[0], spot[1] - P[1]]);
  /** How many degrees the direction from him to p is off your clock spot. */
  const off = (p: Point): number => Math.abs(((angOf([p[0] - P[0], p[1] - P[1]]) - mine + 540) % 360) - 180);
  const fn = (p: Point): boolean => dist(p, spot) <= SCYTHE_REACH && dist(p, P) <= SCYTHE_SAFE && off(p) < SCYTHE_CLEAR_DEG;
  // Each ray from him: the stretch of it that is near the spot and inside the safe ring.
  const part = (deg: number): Stretch | null => {
    const x = crossCircle(P, deg, spot, SCYTHE_REACH);
    if(!x) return null;
    const f: Stretch = [Math.max(0, x[0]), Math.min(x[1], SCYTHE_SAFE)];
    return f[1] - f[0] > 0.3 ? f : null;
  };
  const edge = Math.ceil(SCYTHE_CLEAR_DEG) - 1;
  const degs = Array.from({length:2 * edge + 1}, (_x, k) => mine - edge + k);
  return {fn, label:spot, show:rayArea(P, degs, part).map(poly => ({poly}))};
}

/* Assault Evolved: three weapons. The boss faces the first, then goes clockwise. The weapons face
   his jumps, as in the second set (cactbot reads both sets' order from their facing), but here
   the tell is the boss's facing.
   `order` forces the weapon types in the order he takes them (the fight pattern picks); without it,
   the order is random. */
export function buildAssault(s: Slot, order?: WeaponType[]): JumpSet {
  return buildJumpSet(s, faceApproach(noJumpAcross(assaultWeapons(order))));
}

/** Three weapons at least 90 degrees apart, in the order he takes them: the first, then clockwise. */
function assaultWeapons(order?: WeaponType[]): Weapon[] {
  const spots = [0,45,90,135,180,225,270,315];
  let pick = [0,135,225];
  for(let t = 0; t < 60; t++){
    const cand = shuffle(spots.slice()).slice(0, 3);
    if(cand.every((a, i) => cand.every((b, j) => i === j || Math.min((a - b + 360) % 360, (b - a + 360) % 360) >= 90))){ pick = cand; break; }
  }
  const a0 = pick[0];
  const angles = [a0].concat(pick.slice(1).sort((x, y) => ((x - a0 + 360) % 360) - ((y - a0 + 360) % 360)));
  // A forced order replaces the shuffle's result, but the shuffle still runs, so the random
  // calls stay the same and a fight code still rebuilds every other part the same way.
  const shuffled = shuffle([...WEAPON_TYPES]), types = order ?? shuffled;
  return angles.map((a, i): Weapon => ({a, p:atAngle(a), type:types[i]}));
}

/** Each weapon faces where the boss jumps to it from: its long side lies square across that
    jump, with its flat side toward him. The first faces the middle, and each other one faces the
    weapon before it. He always lands on the flat side, so the scythe's butt is on his left. */
export function faceApproach(W: Weapon[]): Weapon[] {
  let prev: Point = [50, 50];
  return W.map((w): Weapon => {
    const t = unit([w.p[0] - prev[0], w.p[1] - prev[1]]);
    prev = w.p;
    return {...w, axis:[-t[1], t[0]]};
  });
}

/** No jump straight across the middle, in either set. A weapon he reaches that way would face
    the middle too, as square as the first one. cactbot's "R11S Trophy Weapons" trigger (r11s.ts)
    finds the first weapon as the one facing the middle, so the game never has two. Where the spots would give a
    180-degree jump, that jump's weapon moves 45 degrees back toward the weapon before it (the
    owner's choice): 180/90 becomes 135/135, and 90/180 becomes 90/135. No random call is added,
    so a fight code still builds every other part the same way. */
function noJumpAcross(W: Weapon[]): Weapon[] {
  return W.map((w, i): Weapon => {
    if(i === 0 || (w.a - W[i - 1].a + 360) % 360 !== 180) return w;
    const a = (w.a - 45 + 360) % 360;
    return {...w, a, p:atAngle(a)};
  });
}

/* Assault Evolved, second set (1:33, after Void Stardust). The boss does not face a weapon until
   his cast starts, but the weapons show the order (cactbot reads it from their facing): the one
   that faces the middle, square to the boss, goes first. Then clockwise. */
export function buildAssault2(s: Slot, order?: WeaponType[]): JumpSet {
  const W = faceApproach(noJumpAcross(assaultWeapons(order)));
  // The weapons used to get a random turn and flip. Those random numbers are still drawn, so a
  // fight code made before this change builds the rest of the fight the same way.
  for(let i = 0; i < W.length; i++){ if(i){ random(); random(); } random(); }
  const set = buildJumpSet(s, W);
  set.states[0].f = null;
  return set;
}

/* Ultimate Trophy Weapons: six weapons, resolved in spawn order.
   The first spawns south, slightly west (then clockwise) or slightly east (then counterclockwise).
   The second spawns northwest or northeast. The rest sit on cardinals.
   The first three are all different, and so are the last three. The last four leave tornadoes. */
export function buildUltimate(s: Slot, forceCw?: boolean): JumpSet & {cw: boolean} {
  // The coin is always tossed, so a forced direction leaves the other random calls in place.
  const toss = random() < 0.5, cw = forceCw ?? toss;
  const angles = cw ? [200, 315, 90, 180, 270, 0] : [160, 45, 270, 180, 90, 0];
  const names = cw ? ["south, slightly west", "NW", "east", "south", "west", "north"]
                   : ["south, slightly east", "NE", "west", "south", "east", "north"];
  const types = shuffle([...WEAPON_TYPES]).concat(shuffle([...WEAPON_TYPES]));
  const set = buildJumpSet(s, angles.map((a, i): Weapon => ({a, p:atAngle(a), type:types[i], where:names[i], tornado:i >= 2})));
  set.states[0].f = null;   // no facing arrow, so the spawn order is the only clue
  return {...set, cw};
}

/** A picked weapon order ("sword-axe-scythe") as weapon types, or undefined for Random.
    The picks were checked against the known orders when they were saved. */
const orderFrom = (pick?: string): WeaponType[] | undefined => pick ? pick.split("-") as WeaponType[] : undefined;

/* The scenes around a jump set. Practice and the full fight both use them, so a
   fight can pass in a set built with the player's choices. */
export function assaultScene(A: JumpSet, s: Slot): Scene {
  return {
    setup:["Three weapons are on the floor. The boss is in the middle.",
      "The red arrow points at the weapon he faces. He jumps to it first.",
      "Then he goes clockwise.",
      "Sword: watch where he jumps from.",
      "Scythe: the butt is the end with the upright handle. The point is the blade tip."],
    overlays:A.overlays,
    bossAt:n => A.states[Math.min(n, A.states.length - 1)],
    steps:A.steps,
    rule:["First: the weapon he faces. Then clockwise.",
      "Sword: the pocket on the side he jumped from, " + bySlot(s, {H1:"on his left", H2:"on his right"}) + ".", "Stand a few steps in from its inner corner.",
      "Scythe: " + bySlot(s, {H1:"H1 at the butt", H2:"H2 at the point"}) + ", close in.",
      "Axe: Party Stack in the middle.", "Not like Raw Steel Trophy's axe, where the party spreads."]};
}
export function ultimateScene(U: JumpSet): Scene {
  return {
    setup:["The party is at 1 HP after Charybdistopia.",
      "Six weapons spawn one after another. The boss resolves them in spawn order.",
      "Three show now. Each hit brings in the next one.",
      "Look Ahead: where does the first one spawn?", "South and slightly west = clockwise.",
      "South and slightly east = counterclockwise."],
    spawnPlay:true, spawnAhead:3, overlays:U.overlays, bossAt:n => U.states[Math.min(n, U.states.length - 1)], steps:U.steps,
    rule:["First weapon south: slightly west = clockwise, slightly east = counterclockwise.",
      "The second is NW or NE. Then the cardinals, ending north.",
      "Use the normal rule for each weapon."]};
}

/* Void Stardust: each puddle goes just outside the previous one, one small step clockwise
   around the boss at c, in his max melee range. The next spot is judged from where the last
   puddle actually dropped. The stack after the third puddle takes the same next spot. */
const CENTER: Point = [50, 50];
function puddleAfter(c: Point = CENTER): (results: StepResult[]) => Zone {
  const rel = (p: Point): Point => [p[0] - c[0], p[1] - c[1]];
  return results => {
    const q: Point = results[results.length - 1].drop ?? [c[0], c[1] - OUTSIDE];
    const rq = Math.min(MELEE_R - 2.5, Math.max(8, Math.hypot(...rel(q))));
    const step = 2 * Math.asin(Math.min(1, (PUDDLE_R + 2.5) / (2 * rq))) / DEG, ia = (angOf(rel(q)) + step) * DEG;
    const ideal: Point = [c[0] + rq * Math.sin(ia), c[1] - rq * Math.cos(ia)];
    const fn = (p: Point): boolean => {
      const dq = dist(p, q), r = Math.hypot(...rel(p)), cw = (angOf(rel(p)) - angOf(rel(q)) + 360) % 360;
      return inArena(p) && dq >= PUDDLE_R && dq <= PUDDLE_R + 6 && r >= 6 && r <= MELEE_R && cw > 3 && cw < 110;
    };
    // Next to a wall the ideal spot can be off the arena. Then the shown spot is the nearest correct one.
    const label = fn(ideal) ? ideal : nearestTo(ideal, fn) ?? ideal;
    return {fn, label, show:[{c:label, r:4.5}]};
  };
}
/** The next puddle around the arena center, as in the first Void Stardust. */
export const nextPuddle = puddleAfter();

/** The point nearest to t (on a half-unit grid) for which fn is true, or null if there is none. */
function nearestTo(t: Point, fn: (p: Point) => boolean): Point | null {
  let best: Point | null = null, bd = Infinity;
  // From the west platform's outer edge to the east one's: the split arena is the widest.
  for(let x = 50 - SPLIT_HALF_W; x <= 50 + SPLIT_HALF_W; x += 0.5) for(let y = 0; y <= 100; y += 0.5){
    const p: Point = [x, y], d = dist(p, t);
    if(d < bd && fn(p)){ best = p; bd = d; }
  }
  return best;
}

/* Areas drawn one ray at a time from a point c, so their outline follows the round edges of the
   boss's reach, a puddle or a spread. A stretch is [lo, hi]: from lo to hi units out along a ray. */
type Stretch = [number, number];
const ray = (deg: number): Point => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];
/** Where the ray from c at `deg` is inside the circle around q with radius rad (from solving
    |c + r * ray - q| = rad for r), or null if it misses. */
function crossCircle(c: Point, deg: number, q: Point, rad: number): Stretch | null {
  const u = ray(deg), v: Point = [q[0] - c[0], q[1] - c[1]], b = u[0] * v[0] + u[1] * v[1], disc = b * b - (v[0] * v[0] + v[1] * v[1] - rad * rad);
  return disc > 0 ? [b - Math.sqrt(disc), b + Math.sqrt(disc)] : null;
}
/** How far the ray from c at `deg` runs before it leaves the arena. */
function toEdge(c: Point, deg: number): number {
  const u = ray(deg), along = (ui: number, ci: number): number => ui > 1e-9 ? (100 - ci) / ui : ui < -1e-9 ? -ci / ui : Infinity;
  return Math.min(along(u[0], c[0]), along(u[1], c[1]));
}
/** The stretches of one ray that are left once the circles are cut out of it, longest first. */
function cutOut(parts: Stretch[], c: Point, deg: number, holes: Array<{q: Point; r: number}>): Stretch[] {
  const longest = (ps: Stretch[]): Stretch[] => ps.filter(([lo, hi]) => hi - lo > 0.3).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]));
  return holes.reduce((ps: Stretch[], h) => {
    const x = crossCircle(c, deg, h.q, h.r);
    return x ? longest(ps.flatMap(([lo, hi]): Stretch[] => [[lo, Math.min(hi, x[0])], [Math.max(lo, x[1]), hi]])) : ps;
  }, longest(parts));
}
/** The outline of an area seen from c over the rays at `degs`, one degree apart. `part` gives the
    area's stretch of each ray; a ray without one splits the area into pieces. */
function rayArea(c: Point, degs: number[], part: (deg: number) => Stretch | null): Point[][] {
  const pieces: Point[][] = [];
  let inner: Point[] = [], outer: Point[] = [];
  const flush = (): void => { if(inner.length > 1) pieces.push([...inner, ...outer.reverse()]); inner = []; outer = []; };
  for(const d of degs){
    const f = part(d);
    if(!f){ flush(); continue; }
    inner.push(polar(d, f[0], c)); outer.push(polar(d, f[1], c));
  }
  flush();
  return pieces;
}

/** The first puddle: within 9 units of `start`, and in the boss's max melee range. */
function firstPuddle(start: Point, c: Point): Zone {
  const fn = (p: Point): boolean => inArena(p) && dist(p, start) <= 9 && dist(p, c) <= MELEE_R;
  const part = (deg: number): Stretch | null => {
    const x = crossCircle(c, deg, start, 9);
    if(!x) return null;
    const f: Stretch = [Math.max(0, x[0]), Math.min(x[1], MELEE_R, toEdge(c, deg))];
    return f[1] - f[0] > 0.3 ? f : null;
  };
  const degs = Array.from({length:361}, (_x, d) => d);
  // Start from a ray that misses, so the area is drawn as one piece.
  const from = degs.find(d => !part(d)) ?? 0;
  return {fn, label:start, show:rayArea(c, degs.map(d => d + from), part).map(poly => ({poly}))};
}

/* Comet, the spread that can end Void Stardust. Only the tanks and melee have fixed spots,
   at the intercardinals just outside the hitbox. Healers and ranged take any open spot.
   The spots go by the boss's facing f (degrees clockwise from north): MT front left, OT front
   right, M1 back left, M2 back right. In the first Void Stardust he counts as facing north, so
   that is MT NW, OT NE, M1 SW, M2 SE. In the second the spots turn with him (owner, 2026-11-25).
   Each puddle goes off VOID_PUDDLE.life (3) seconds after it drops (BossMod: Cometite, 3.0 s
   cast) and then it is gone. The last one goes off 2 seconds before Comet, so by the spread
   every puddle is gone: the spread does not check them, and the map fades them (puddlesOff). */
const FIXED_SPREAD: {l: string; r: "T" | "D"; off: Point}[] = [
  {l:"MT", r:"T", off:[-15, -15]}, {l:"OT", r:"T", off:[15, -15]}, {l:"M1", r:"D", off:[-15, 15]}, {l:"M2", r:"D", off:[15, 15]}];
/** The offset o, turned f degrees clockwise. */
const turned = (o: Point, f: number): Point => {
  const a = f * DEG;
  return [o[0] * Math.cos(a) - o[1] * Math.sin(a), o[0] * Math.sin(a) + o[1] * Math.cos(a)];
};
/** p, moved onto the arena edge if it is past it. A turned spread spot can reach past the wall
    by a fraction of a unit; it stays on the edge, since nobody stands past the wall. */
const onArena = (p: Point): Point => [Math.min(100, Math.max(0, p[0])), Math.min(100, Math.max(0, p[1]))];
/** The tank and melee spread spots around a boss at c, facing f. */
const fixedAround = (c: Point, f = 0): Array<{l: string; r: "T" | "D"; p: Point}> => FIXED_SPREAD.map(m => ({...m, p:onArena(addVec(c, turned(m.off, f)))}));
/** The tank and melee marks on their spread spots around a boss at c, facing f. */
export const spreadMarks = (c: Point = CENTER, f = 0): Overlay[] => fixedAround(c, f).map((m): Overlay => ({t:"mark", x:m.p[0], y:m.p[1], l:m.l, r:m.r}));
export const FIXED_SPREAD_MARKS = spreadMarks();
/** The open ground in front of, right of, behind and left of a boss at c facing f, between the fixed spots. */
const gapsAround = (c: Point, f = 0): Point[] => ([[0, -33], [33, 0], [0, 33], [-33, 0]] as Point[]).map(o => addVec(c, turned(o, f)));
const far = (p: Point, q: Point, d: number): boolean => dist(p, q) >= d;
/** The spot `deg` degrees clockwise from north and r units out from the arena center. */
const POINT_AT = (deg: number, r: number): Point => polar(deg, r);

/* The healers and ranged spread anywhere open: out of the hitbox and not on a tank or melee
   spot. A spread is 6 yalms (15 units), so a spot closer than that to a tank or
   melee spot hits them. The map draws the open ground as four slices, one for each side of the
   boss (front, right, back and left, between the fixed spots), out to the arena edge. The shown
   spot, where the moving marker runs, is H1's gap on his left or H2's on his right: west and
   east when he faces north. */
export function cometSpread(s: Slot, c: Point = CENTER, f = 0): (results: StepResult[]) => Zone {
  const fixed = fixedAround(c, f), gaps = gapsAround(c, f);
  const fn = (p: Point): boolean => inArena(p) && far(p, c, HITBOX + 2.5) && fixed.every(m => far(p, m.p, SPREAD_R));
  const holes = fixed.map(m => ({q:m.p, r:SPREAD_R}));
  const part = (deg: number): Stretch | null => cutOut([[HITBOX + 2.5, toEdge(c, deg)]], c, deg, holes)[0] ?? null;
  const slices = [0, 90, 180, 270].flatMap(a => rayArea(c, Array.from({length:91}, (_x, i) => f + a - 45 + i), part));
  // Next to a wall a gap can be off the arena.
  const pref = bySlot(s, {H1:[3, 1, 0, 2], H2:[1, 3, 0, 2]}).map(i => gaps[i]);
  const label = pref.find(fn) ?? nearestTo(pref[0], fn) ?? pref[0];
  const zone: Zone = {fn, label, show:slices.map(poly => ({poly}))};
  return () => zone;
}

/** Fire and Fury: the boss, facing north, cleaves his front and back. */
export const FIRE_AND_FURY: Overlay[] = fireAndFury([50, 50], 0);

/* Orbital Omen, simplified to 4 lanes each way. Each set fires one north lane and one east lane.
   Set 2 always crosses in one of the four middle squares. */
export function buildOrbital(): {overlays: Overlay[]; steps: Step[]} {
  // V[i] is the column (0-3) the #(i+1) north portal fires down. H[i] is the row the #(i+1) east portal fires across.
  const outer = shuffle([0, 3]), inner = shuffle([1, 2]);
  const V = [outer[0], inner[0]].concat(shuffle([outer[1], inner[1]]));
  const H = shuffle([1, 2]).concat(shuffle([0, 3]));
  // Four lanes each way span the arena, so a lane is a quarter of it (BossMod OrbitalOmenRect).
  const W = ORBITAL_LANE;
  const lane = (n: number, vert: boolean): RectZone => vert ? {rect:[n * W, 0, (n + 1) * W, 100]} : {rect:[0, n * W, 100, (n + 1) * W]};
  const inV = (p: Point, n: number): boolean => p[0] >= n * W && p[0] <= (n + 1) * W;
  const inH = (p: Point, n: number): boolean => p[1] >= n * W && p[1] <= (n + 1) * W;
  /* Hector's dodge: stay in the four middle squares against the boss hitbox and cross it
     to whichever middle square the next lines miss. */
  const mid = (p: Point): boolean => p[0] >= W && p[0] <= 3 * W && p[1] >= W && p[1] <= 3 * W;
  const side = (p: Point): boolean => Math.abs(p[0] - 50) > Math.abs(p[1] - 50);
  const misses = (p: Point, sets: number[]): boolean => sets.every(i => !inV(p, V[i]) && !inH(p, H[i]));
  const cellRect = (c: number, r: number): RectZone => ({rect:[c * W, r * W, (c + 1) * W, (r + 1) * W]});
  const spot = (c: number, r: number): Point => [c === 1 ? 38 : 62, r === 1 ? 44 : 56];
  const c2 = V[1], r2 = H[1], cOpp = 3 - V[1], r1 = H[0];
  const overlays: Overlay[] = [];
  V.forEach((n, i) => overlays.push({t:"guide", x:n * W + W / 2, y:0, x2:n * W + W / 2, y2:100}, {t:"portal", x:n * W + W / 2, y:2.6, vert:true, n:i + 1}));
  H.forEach((n, i) => overlays.push({t:"guide", x:0, y:n * W + W / 2, x2:100, y2:n * W + W / 2}, {t:"portal", x:97.4, y:n * W + W / 2, vert:false, n:i + 1}));
  const lanes = (sets: number[], soft = false): Overlay[] =>
    sets.flatMap((i): Overlay[] => [{t:"lane", rect:lane(V[i], true).rect, soft}, {t:"lane", rect:lane(H[i], false).rect, soft}]);
  return {
    overlays,
    steps:[
      {q:"Before the #1 lines and Fire and Fury: where do you stand?",
        z:{fn:p => mid(p) && side(p) && misses(p, [0]), label:spot(c2, r2), show:[cellRect(1, r2), cellRect(2, r2)]},
        a:["At his side, in max melee.", "Pick a middle square the #1 lines miss.", "Best start: the square where the #2 lines cross."],
        reveal:[...FIRE_AND_FURY, ...lanes([0])]},
      {q:"The #1 lines and Fire and Fury went off. The #2 lines are next. Where do you go?",
        z:{fn:p => mid(p) && misses(p, [1]), label:spot(cOpp, r1), show:[cellRect(cOpp, r1)]},
        a:["Cross under the boss to the opposite middle square.", "The #2 lines miss it."],
        reveal:lanes([1])},
      {q:"The #2 lines went off. Where do you go now?",
        z:{fn:p => mid(p) && misses(p, [2, 3]), label:spot(c2, r2), show:[{rect:[c2 * W, W, (c2 + 1) * W, 3 * W]}]},
        a:["Cross back into the column the #2 line already hit.", "The #3 and #4 lines miss it, so stay there."],
        reveal:lanes([2, 3], true)}
    ]
  };
}

/* Void Stardust: three puddles, then the spread (Comet) or the stack (Crushing Comet). Every
   puddle and the stack go around the boss in his max melee range. The stack takes the next
   spot clockwise, where a fourth puddle would go, so it is clear of the third puddle. `c` is
   where the boss stands, `start` is the first puddle spot with its answer, and `f` is his
   facing, which turns the spread spots. `spreadMore` adds lines to the spread answer. */
const NORTH_START = {p:FIRST_PUDDLE, a:["North of the boss, in max melee."]};
function voidSteps(s: Slot, spread: boolean, c: Point = CENTER, start = NORTH_START, f = 0, spreadMore: Lines = []): Step[] {
  const next = puddleAfter(c);
  return [
    {q:"Where do you drop the first puddle?", z:firstPuddle(start.p, c), a:start.a, drop:VOID_PUDDLE},
    {q:"Second puddle?", zf:next, a:["Just outside your first puddle, one small step clockwise.", "Stay in max melee."], drop:VOID_PUDDLE},
    {q:"Third puddle?", zf:next, a:["Just outside the second puddle, clockwise again.", "Stay in max melee."], drop:VOID_PUDDLE},
    spread
      ? {q:"Puddles done. Comet: every player spreads. Tanks and melee go to fixed spots. Where do you go?",
          zf:cometSpread(s, c, f), cue:spreadMarks(c, f), puddlesOff:true,
          a:["Any open spot. Healers and ranged have no fixed spread spot.", "Keep away from the tank and melee spots.", ...spreadMore]}
      : {q:"Puddles done. Where does the party stack?", zf:next, revealAt:p => [crushingComet(p)],
          a:["Stack one more step clockwise, just past the third puddle.", "Stay in max melee."]}];
}

/* The first Void Stardust runs straight into the second weapon set: the weapons are already
   out, so the party finds the first one early, to know how far the run is after the stack or
   spread. Then the scene goes on through all three weapons of this second set, so one drill
   covers the whole stretch. */
export function voidIntoWeapons(s: Slot, spread: boolean, A: JumpSet): Scene {
  const first = A.W[0], where = WHERE[Math.round(first.a / 45) % 8];
  const steps: Step[] = [
    // Look ahead: you spot the first weapon now, so you know where to run when the puddles are
    // done, but you go to A for the first puddle, not to the weapon.
    {q:"Look Ahead: which weapon goes first after Void Stardust? Click it.", z:{c:first.p, r:9}, lookAhead:true,
      a:["The " + first.type + ", " + where + ": its flat side is square to the boss.",
        "If it is far: use Sprint, a movement ability or Expedient."]},
    ...voidSteps(s, spread),
    // The weapons start here, and the puddles are gone.
    {...A.steps[0], clearDrops:true, q:"The " + (spread ? "spread" : "stack") + " went off. The boss goes to the first weapon. Click where you go.",
      a:[...A.steps[0].a, "Too far? Use Sprint or a movement ability.", "A scholar can use Expedient for the party."]}];
  steps.push(...A.steps.slice(1));
  return {
    setup:["The second set of weapons is out. Each one faces where he will jump from.",
      "Void Stardust: three puddles drop under every player, one after another.",
      spread ? "After the third: a spread marker on every player (Comet)." : "After the third: a Party Stack on a healer (Crushing Comet).",
      "The boss goes to the first weapon.",
      "Then clockwise to the other two."],
    ordered:true,
    overlays:A.overlays.map(o => ({...o, spawn:undefined})),   // no fading: these steps are not one per weapon
    // The boss stays in the middle for the pick, the puddles and the stack or spread (5 steps).
    bossAt:n => A.states[Math.max(0, Math.min(n - 5, A.states.length - 1))],
    steps,
    rule:["Look Ahead: find the first weapon before the puddles.", "Its flat side is square to the boss.",
      "Puddles: start north. Each one just outside the last, clockwise, in max melee.",
      spread ? "Comet spread fixed spots: MT NW, OT NE, M1 SW, M2 SE." : "Stack one more step clockwise, just past the third puddle.",
      "If the first weapon is far: use Expedient, Sprint or a movement ability.",
      "Then the other two weapons, clockwise. Use the normal rule for each."]};
}

/* The second Void Stardust: the same puddles, ending the other way from the first one. The boss
   stays on the third weapon of the second set: he does not jump to the middle until Dance of
   Domination (cactbot's "--middle--"). The first puddle drops 2.3 seconds after the third weapon,
   so the group stands at his butt, directly behind him, and drops it there. The puddles then go
   clockwise around him. A spread uses the same tank and melee spots as the first time, turned
   with him: his front is relative north (owner, 2026-11-25). */
/** The spot directly behind the boss, at his butt, just outside his hitbox. */
export function behind(boss: Boss): Point {
  const f = (boss.f ?? 0) * DEG;
  return [boss.x - OUTSIDE * Math.sin(f), boss.y + OUTSIDE * Math.cos(f)];
}
export function voidAgain(s: Slot, spread: boolean, boss: Boss): Scene {
  const c: Point = [boss.x, boss.y], butt = behind(boss);
  return {
    setup:["Void Stardust (Second Time). The boss stays on the third weapon.",
      "The party stands directly behind the boss.",
      "Drop the first puddle there. Then two more.",
      spread ? "Then a spread (Comet)." : "Then a Party Stack on a healer (Crushing Comet).",
      "It is always the opposite of the first."],
    ordered:true,
    boss, overlays:[], steps:voidSteps(s, spread, c, {p:butt, a:["Directly behind the boss, in max melee."]}, boss.f ?? 0, VOID_2_SPREAD_RULE),
    rule:[...VOID_2_START_RULE,
      "Each one just outside the last, clockwise around him.",
      ...(spread ? VOID_2_SPREAD_RULE : ["Stack one more step clockwise, just past the third puddle."]),
      "The second Void Stardust is always the opposite of the first."]};
}

/* ---------- map drills ---------- */
export const BOSS: Boss = {x:50, y:50, f:0};
/** Where the name of the weapon the boss holds goes: under his dot, inside the open rear of his
    hitbox ring. The app's choice. */
export const HELD_TAG: Point = [50, 58.5];
/** The weapon the boss holds for Raw Steel Trophy: the same icon, at the same size, as the
    weapons on the floor, on top of his dot. The app's choice. */
export function heldWeapon(type: WeaponType): Overlay[] {
  const x = BOSS.x, y = BOSS.y;
  // TS note: `t:type` is "axe" or "sword" here. TypeScript checks the object against both
  // matching members of the Overlay union, so one line covers both weapons.
  const icon: Overlay = type === "scythe" ? {t:"scythe", x, y, ux:1, uy:0, dx:0, dy:-1, held:true} : {t:type, x, y, ux:1, uy:0, held:true};
  return [icon, {t:"tag", x:HELD_TAG[0], y:HELD_TAG[1], s:type.toUpperCase()}];
}
/* Raw Steel Trophy, axe: the tanks stack in front of the boss for a shared buster, and the other
   six spread, as on wtfdig (Toxic): the melee just outside his hitbox SW and SE, the ranged at the
   west and east walls, and the healers far out south-southwest and south-southeast. The drill and
   the Learn card pictures both use these spots. */
export const AXE_TANKS: Point = [50, 35];
/* Dance of Domination, with the open side south: the cuts in the floor, and the four pair spots
   from wtfdig (Toxic), all clear of the 10-yalm Hurricane Explosion lines along the cuts. */
export const DANCE_LINES = [{x:0, y:12, x2:100, y2:12}, {x:12, y:0, x2:12, y2:100}, {x:88, y:0, x2:88, y2:100},
  {x:0, y:0, x2:100, y2:100}, {x:100, y:0, x2:0, y2:100}, {x:50, y:0, x2:50, y2:100}];
export const DANCE_PAIRS: Record<string, Point> = {MT:[27.5, 50], OT:[72.5, 50], H1:[31.5, 93.5], H2:[68.5, 93.5]};
/** Clock spots, in degrees clockwise from the boss's front: the standard spots on wtfdig and in
    BossMod's preset. The tanks are front and back, and the healers are on his sides. */
export const CLOCK: Record<string, number> = {MT:0, R2:45, H2:90, M2:135, OT:180, M1:225, H1:270, R1:315};
export const AXE_SPREAD_SPOTS: Record<string, Point> = {M1:[37.5, 62.5], M2:[62.5, 62.5], R1:[9, 68.5], R2:[91, 68.5], H1:[34, 84.5], H2:[66, 84.5]};
/* Raw Steel Trophy, scythe: three cleaves. A 90-degree cone on each tank (MT at 317 degrees, OT
   at 43), and a 45-degree cone behind him that the rest of the party shares. The party's spot is
   inside that shared cone, outside his hitbox. */
export const SCYTHE_CLEAVES: Overlay[] = [tankCone([50, 50], 317), tankCone([50, 50], 43), sharedCone([50, 50], 180)];
/* Ultimate Trophy Weapons: the four tornadoes on the cardinals, and each one's two baits. Facing
   in from the tornado, the support stands on its left and the DPS on its right, at its edge. */
export const TORNADO_BAITS: readonly {tornado: Point; support: Point; dps: Point}[] = [
  {tornado:[50, 16], support:[58, 8], dps:[42, 8]},
  {tornado:[80, 50], support:[88, 58], dps:[88, 42]},
  {tornado:[50, 84], support:[42, 92], dps:[58, 92]},
  {tornado:[20, 50], support:[12, 42], dps:[12, 58]}];
/** Powerful Gust: each tornado cones its two baits. */
export const GUST_CONES: Overlay[] = TORNADO_BAITS.flatMap(({tornado, support, dps}) => [...gust(tornado, support), ...gust(tornado, dps)]);
/** How far from its middle a click on a tornado bait spot still counts. The app's choice. */
const TORNADO_BAIT_R = 6.5;
/** Your tornado bait spot: around `bait`, but never inside the tornado, where you would be knocked
    back. After the answer it shows as the circle with the tornado cut out of it. */
function tornadoBait(bait: Point, tornado: Point): Zone {
  const outline = Array.from({length:48}, (_, i) => polar(i * 7.5, TORNADO_BAIT_R, bait)).map(p =>
    dist(p, tornado) < TORNADO_R ? addVec(tornado, unit([p[0] - tornado[0], p[1] - tornado[1]]), TORNADO_R) : p);
  return {fn:p => dist(p, bait) <= TORNADO_BAIT_R && dist(p, tornado) >= TORNADO_R, label:bait, show:[{poly:outline}]};
}
/** The Powerful Gust cones on every bait spot but `bait`: the cones that must miss you there. */
const gustsBut = (bait: Point): Overlay[] =>
  TORNADO_BAITS.flatMap(({tornado, support, dps}) => [support, dps].filter(p => p !== bait).flatMap(p => gust(tornado, p)));
const STACK_EDGE = [-1, -0.5, 0, 0.5, 1].map(k => 180 + k * RAW_STACK_HALF);
const SCYTHE_STACK: Zone = {
  fn:p => { const v: Point = [p[0] - 50, p[1] - 50], r = Math.hypot(v[0], v[1]); return r >= 11 && r <= 40 && Math.abs(angOf(v) - 180) <= RAW_STACK_HALF; },
  label:[50, 69], show:[{poly:[...STACK_EDGE.map(a => POINT_AT(a, 11)), ...[...STACK_EDGE].reverse().map(a => POINT_AT(a, 34))]}]};
/* Ecliptic Stampede: where the two marked players drop their six fire puddles, in the order they
   drop them (Hector's M11S guide video, 19:06 to 20:15). The north one starts on the north wall
   in line with B and drops four puddles walking west along it; the south one starts on the south
   wall in line with D and walks east. Then each steps in from the wall and drops two more in the
   gaps between the wall puddles, walking back, so the corners stay clear. The spots are the
   app's choice: the wall puddles read from the video, 15 units (6 yalms) apart, more than a
   puddle's 5 yalms. The inner row is 13 units from the wall, just clear of the wall puddles,
   and close enough to the middle to keep the middle of each tower clear (ECL_SOAK_R). */
type EclWall = "north" | "south";
const WALL_SPOTS: Record<EclWall, Point[]> = {
  north:[[75, 5], [60, 5], [45, 5], [30, 5], [43.5, 18], [56.5, 18]],
  south:[[25, 95], [40, 95], [55, 95], [70, 95], [56.5, 82], [43.5, 82]]
};
const NPUD = WALL_SPOTS.north.map(atomicPuddle);
const SPUD = WALL_SPOTS.south.map(atomicPuddle);
/** Where you wait by the boss after your puddles, while the others soak the towers: NW of him
    from the north wall, NE from the south wall (the same spots as the Four-way Fireball bait). */
const ECL_WAIT: Record<EclWall, CircleZone> = {north:{c:[43, 43], r:5.5}, south:{c:[57, 43], r:5.5}};
/** The Ecliptic towers in the Learn card's example: tank towers NE and SE, two-player towers NW
    and SW. The spots change from pull to pull; these are the app's example. */
const ECL_TOWERS: Point[] = [[72, 28], [72, 72], [28, 28], [28, 72]];
/** The middle of an Ecliptic tower: where a two-player tower's healer or ranged stands, dead
    center, so its tether goes to them. No fire puddle may reach into it. A whole tower cannot
    stay clear: a puddle and a tower are 22.5 units across together, and the six puddles leave no
    room for that. The app's choice (the owner's OK). */
export const ECL_SOAK_R = 4;
/** How far your two inner puddles may go from your wall, and from the north-south line through
    the middle (so they stay clear of the corners). The app's choice: the owner wants them only
    clear of the corners and of the middle of each tower. */
const INNER_DEPTH = 30, INNER_HALF_W = 25;

/* Your fifth and sixth Ecliptic puddles: anywhere just inside your wall puddles, clear of the
   corners, clear of the middle of each tower, and clear of every puddle you dropped. Together
   the six puddles end up as a triangle against the wall. `best` is the app's example spot. The
   map draws the area as rays from the boss, with the towers' middles and the puddles cut out. */
function innerPuddle(wall: EclWall, best: Point): (results: StepResult[]) => Zone {
  const north = wall === "north";
  return results => {
    const holes = [...ECL_TOWERS.map(q => ({q, r:ECL_SOAK_R + ATOMIC_PUDDLE.r})),
      ...results.flatMap(r => r.drop ? [{q:r.drop, r:ATOMIC_PUDDLE.r}] : [])];
    const fn = (p: Point): boolean => inArena(p) && Math.abs(p[0] - 50) <= INNER_HALF_W
      && (north ? p[1] <= INNER_DEPTH : p[1] >= 100 - INNER_DEPTH) && holes.every(h => dist(p, h.q) > h.r);
    const part = (deg: number): Stretch | null => {
      const cos = Math.abs(Math.cos(deg * DEG)), sin = Math.abs(Math.sin(deg * DEG));
      const far = Math.min(toEdge(CENTER, deg), sin > 1e-9 ? INNER_HALF_W / sin : Infinity);
      return cutOut([[(50 - INNER_DEPTH) / cos, far]], CENTER, deg, holes)[0] ?? null;
    };
    const mid = north ? 0 : 180;
    const degs = Array.from({length:101}, (_x, i) => mid - 50 + i);
    const label = fn(best) ? best : nearestTo(best, fn) ?? best;
    return {fn, label, show:rayArea(CENTER, degs, part).map(poly => ({poly}))};
  };
}

/* Heartbreak Kick: one tower in the middle of the arena (BossMod's HeartbreakKick: the arena's
   center, up to 8 soakers), hit 5, then 6, then 7 times. Statics do it one of two ways: the
   party soaks it, or the tanks soak it with invulns while everyone else stays out (the owner;
   Pressure's Settings pick it). With the tanks, any spot out of the tower is correct. */
function kickScene(way: "party" | "tanks"): Scene {
  const tower = kickTower(CENTER), hit = towerHit(CENTER);
  const outside = (deg: number): Stretch | null => [TOWER_R, toEdge(CENTER, deg)];
  const out: Zone = {fn:p => inArena(p) && dist(p, CENTER) > TOWER_R, label:[50, 72],
    show:rayArea(CENTER, Array.from({length:361}, (_x, d) => d), outside).map(poly => ({poly}))};
  const where: Zone = way === "party" ? {c:CENTER, r:TOWER_R} : out;
  const steps = [5, 6, 7].map((n): Step => ({
    q:`Heartbreak Kick: ${n} hits. Where do you stand?`, z:where,
    a:way === "party" ? ["In the tower, with the party.", "Heal between the hits."]
      : ["Anywhere out of the tower.", "The tanks soak it with invulns. Heal them between the hits."],
    // With the party you take the hits on purpose; with the tanks they must miss you.
    reveal:[hit], ...(way === "party" ? {hits:[]} : {})}));
  return {setup:["One tower in the middle, hit 5, then 6, then 7 times.",
      way === "party" ? "Here the party soaks it." : "Here the tanks soak it with invulns."],
    boss:BOSS, overlays:[tower], steps,
    rule:["The tanks soak it with invulns, or the party soaks it.", "Heal between the hits."]};
}

/* Ecliptic Stampede for a marked player: your start spot as the markers come, then your six
   puddles along your wall, one at each Atomic Impact, then your spot by the boss while the
   others soak the towers and take the tethers. The tethers lock on to the players closest to
   the middle of each tower, so the four players by the boss are never tethered (the video). Your puddles stay on the floor (ATOMIC_PUDDLE). The other marked
   player drops theirs along the other wall at the same times. */
function eclipticScene(s: Slot, wall: EclWall): Scene {
  const other: EclWall = wall === "north" ? "south" : "north", spots = WALL_SPOTS[wall];
  const north = wall === "north";
  const dir = north ? "west" : "east", back = north ? "east" : "west", waymark = north ? "B" : "D";
  // A wall spot reaches 4 units ahead and 2 units back, so a correct click stays clear of the last
  // puddle (15 units back, 12.5 units wide). The two inner spots are open areas (innerPuddle).
  const wallDrop = (p: Point): RectZone => ({rect:north ? [p[0] - 4, p[1] - 5, p[0] + 2, p[1] + 5] : [p[0] - 2, p[1] - 5, p[0] + 4, p[1] + 5]});
  const answer = (i: number): Lines => {
    if (i === 0) return [`The ${wall} wall, in line with ${waymark}.`, `Then walk ${dir} along the wall, one puddle at a time.`];
    if (i < 4) return [`One step ${dir} along the ${wall} wall, clear of the last puddle.`];
    if (i === 4) return ["Step in from the wall, just inside your puddles.", "Clear of the corners and the middle of each tower."];
    return [`Another one just inside your puddles, a step ${back}.`, "Clear of the corners, the tower middles and your puddles."];
  };
  const towers: Overlay[] = [soloTower(ECL_TOWERS[0]), soloTower(ECL_TOWERS[1]), pairTower(ECL_TOWERS[2]), pairTower(ECL_TOWERS[3])];
  const drops: Step[] = spots.map((p, i): Step => ({
    q:i === 0 ? `You are marked, and your wall is the ${wall.toUpperCase()} wall. Where do you drop your first puddle?` : `Puddle ${i + 1}?`,
    ...(i < 4 ? {z:wallDrop(p)} : {zf:innerPuddle(wall, p)}), stand:p, drop:ATOMIC_PUDDLE, a:answer(i),
    // The other marked player drops a puddle along the other wall at the same time; the towers
    // appear while the fifth puddle drops.
    cue:[atomicPuddle(WALL_SPOTS[other][i]), ...(i === 4 ? towers : [])]
  }));
  return {setup:["Tanks and melee stack under the boss.", "Healers and ranged stay out to bait the markers.",
      "Marked? Drop four fire puddles along your wall, then two just inside them.", "Then wait by the boss while the others soak the towers."],
    boss:BOSS, overlays:[{t:"mark",x:25,y:25,l:"R1",r:"D"},{t:"mark",x:75,y:25,l:"R2",r:"D"}],
    steps:[
      {q:"Where do you stand?", z:bySlot(s, {H1:{c:[25,74],r:9}, H2:{c:[75,74],r:9}}), a:bySlot(s, {H1:["SW, outside."], H2:["SE, outside."]})},
      ...drops,
      {q:"Puddles done. The others soak the towers and take the tethers. Where do you wait?", z:ECL_WAIT[wall],
        a:wall === "north" ? ["NW of the boss, under him.", "The south wall's player takes NE.", "Close to the middle, so no tether goes to you."]
          : ["NE of the boss, under him.", "The north wall's player takes NW.", "Close to the middle, so no tether goes to you."]}],
    rule:["Marked? Go to the safe corner on your wall.", "Two marked on one side? The one closer to the proximity AoE moves.",
      "North wall: in line with B, walk west. South: in line with D, walk east.",
      "After four, drop two more just inside them, clear of the corners and tower middles.", "Then wait by the boss: north wall NW, south wall NE."]};
}

/** The arena's four corners, by name. A player with no Ecliptic puddles stretches their tether
    to one of them. */
export type EclCorner = "ne" | "se" | "sw" | "nw";
/** The corners clockwise from A (north). The Ecliptic towers stand on the same intercards, so
    this is also the towers' clockwise order from A. */
export const ECL_CORNERS: readonly EclCorner[] = ["ne", "se", "sw", "nw"];
/** A corner's direction from the boss, in degrees clockwise from north. */
const CORNER_DEG: Record<EclCorner, number> = {ne:45, se:135, sw:225, nw:315};
/** The Ecliptic tower on each intercard (the same spots as ECL_TOWERS, by name). */
const ECL_TOWER_AT: Record<EclCorner, Point> = {ne:[72, 28], se:[72, 72], sw:[28, 72], nw:[28, 28]};
type Wall = "north" | "east" | "south" | "west";
/** The Ecliptic tether portals: one just inside the middle of each wall (Hector's Fixed Stampede
    mini-guide, 1:46). Drawn inside the edge, as Orbital Omen's portals are; the app's choice. */
const ECL_PORTAL: Record<Wall, Point> = {north:[50, 2.6], east:[97.4, 50], south:[50, 97.4], west:[2.6, 50]};
/** Where your tether comes from when you stretch it to each corner: go to the wall opposite your
    portal, then clockwise to the corner (the mini-guide, 2:15). A north portal sends you SW. */
const PORTAL_FOR: Record<EclCorner, Wall> = {sw:"north", nw:"east", ne:"south", se:"west"};
const OPPOSITE: Record<Wall, Wall> = {north:"south", east:"west", south:"north", west:"east"};
/** Where a tether is stretched: a box in the corner, 15 units each way, and the spot the moving
    marker goes to. The app's choice. */
const CORNER_BOX: Record<EclCorner, RectZone> = {ne:{rect:[85, 0, 100, 15]}, se:{rect:[85, 85, 100, 100]}, sw:{rect:[0, 85, 15, 100]}, nw:{rect:[0, 0, 15, 15]}};
const CORNER_STAND: Record<EclCorner, Point> = {ne:[95, 5], se:[95, 95], sw:[5, 95], nw:[5, 5]};
/** A corner at random, for a Practice try with no puddles. */
const randomCorner = (): EclCorner => ECL_CORNERS[Math.floor(random() * ECL_CORNERS.length)];
/** Where your Ecliptic Stampede ends: your puddles' wall, or the corner your tether ends in. */
export type EclPlace = EclWall | EclCorner;
const isEclCorner = (p: EclPlace): p is EclCorner => ECL_CORNERS.some(c => c === p);
/** A fireball drill's variant as a place: "none" rolls a corner. */
const eclPlace = (v: string | null): EclPlace => v === "none" ? randomCorner() : v === "south" ? "south" : "north";
/** Where the healers and ranged start, out on the intercards to bait the markers (wtfdig). */
const ECL_START: Record<"H1" | "H2" | "R1" | "R2", Point> = {H1:[25, 74], H2:[75, 74], R1:[25, 25], R2:[75, 25]};

/* Ecliptic Stampede for a player with no puddles (Hector's Fixed Stampede mini-guide,
   https://www.youtube.com/watch?v=p8cL88OKEWE, 0:24 to 2:20). Your start spot, then under the
   boss with the tanks and melee while the two marked players drop their puddles. Then you soak
   a two-player tower dead center, so its tether goes to you and not to the melee on its edge, and
   you stretch the tether to the corner opposite your portal, then clockwise.
   - Which two of the four towers are the tank towers, and which other healer or ranged is in the
     middle with you, change from pull to pull (random here). Of the two in the middle, the first
     in H1 > H2 > R1 > R2 takes the first two-player tower clockwise from A, the other the first
     counterclockwise. So H1 always goes clockwise, and H2 only when H1 is marked.
   - `corner` is where your tether ends, which sets your portal (PORTAL_FOR). */
export function eclipticFreeScene(s: Slot, corner: EclCorner): Scene {
  const TANK_PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] as const;
  const tanks: readonly number[] = TANK_PAIRS[Math.floor(random() * TANK_PAIRS.length)];
  const others = (["H1", "H2", "R1", "R2"] as const).filter(w => w !== s);
  const mate = others[Math.floor(random() * others.length)];
  const marked = others.filter(w => w !== mate);
  // The two-player towers, clockwise from A: you take the first, or the second when you go counterclockwise.
  const pairSpots = ECL_CORNERS.filter((_c, i) => !tanks.includes(i));
  const cw = s === "H1" || mate !== "H1", mine = pairSpots[cw ? 0 : 1], tower = ECL_TOWER_AT[mine];
  const towers = ECL_CORNERS.map((c, i): Overlay => tanks.includes(i) ? soloTower(ECL_TOWER_AT[c]) : pairTower(ECL_TOWER_AT[c]));
  const wall = PORTAL_FOR[corner], portal = ECL_PORTAL[wall], stand = CORNER_STAND[corner];
  const portals = (Object.keys(ECL_PORTAL) as Wall[]).map((w): Overlay => {
    const [x, y] = ECL_PORTAL[w];
    return {t:"portal", x, y, vert:w === "north" || w === "south"};
  });
  // The marked players at their walls: a ranged and a healer, the ranged goes north (Hector's
  // guide, 18:35); two ranged, R2 north and R1 south (the mini-guide's example). A shown piece
  // stays on the arena, so they show where they stay, by their first puddle.
  const north = marked.includes("R2") ? "R2" : marked.find(w => w.startsWith("R")) ?? marked[0];
  const wallMarks = marked.flatMap((w): Overlay[] => {
    const [x, y] = WALL_SPOTS[w === north ? "north" : "south"][0];
    return [{t:"mark", x, y, l:w, r:markRole(partyOf(w).role)}, {t:"target", x, y}];
  });
  const why = s === "H1" ? "H1 always takes the first two-player tower clockwise from A."
    : mate === "H1" ? "H1 is in the middle too: H1 goes clockwise, so you go counterclockwise."
    : `${mate} is in the middle with you. You come first, so you go clockwise.`;
  return {setup:["Tanks and melee stack under the boss.", "Healers and ranged stay out to bait the markers.",
      "Not marked? Join them under the boss, then soak a two-player tower dead center.", "Its tether goes to you: stretch it to a corner."],
    boss:BOSS, overlays:[],
    steps:[
      {q:"Where do you stand?", z:bySlot(s, {H1:{c:ECL_START.H1, r:9}, H2:{c:ECL_START.H2, r:9}}), a:bySlot(s, {H1:["SW, outside."], H2:["SE, outside."]})},
      {q:`${marked[0]} and ${marked[1]} are marked. You are not. Where do you go?`, z:{c:CENTER, r:HITBOX}, cue:wallMarks,
        a:["Under the boss, with the tanks and melee.", "The marked players drop their puddles along the north and south walls."]},
      {q:"Towers. Which one do you soak?", z:{c:tower, r:ECL_SOAK_R}, stand:tower, cue:[...NPUD, ...SPUD, ...towers],
        a:[`The ${mine.toUpperCase()} two-player tower, dead center.`, why, "A melee stands on its edge, by the boss."]},
      {q:`A tether from the ${wall} portal. Where do you stretch it?`, z:CORNER_BOX[corner], stand, cue:[...portals, {t:"tether", x:portal[0], y:portal[1], x2:tower[0], y2:tower[1]}],
        a:[`The ${corner.toUpperCase()} corner.`, `Opposite your portal is the ${OPPOSITE[wall]} wall. Then clockwise, to the corner.`],
        // The line goes off through you: it is your tether's, and nothing else must miss you here.
        reveal:[eclipticWrath(portal, stand)], hits:[]}],
    rule:["Not marked? Stack under the boss.", "Two-player tower: dead center. H1 > H2 > R1 > R2, first clockwise from A.",
      "Tether: go to the wall opposite your portal, then clockwise to the corner."]};
}

/** The first line of an Ecliptic fireball drill's setup: your puddles' wall, or your tether's corner. */
const eclFireSetup = (p: EclPlace): string => isEclCorner(p) ? `You were not marked. You stretched your tether to the ${p.toUpperCase()} corner.`
  : `You were marked. You dropped your puddles along the ${p.toUpperCase()} wall.`;

/** How far out from the boss you stand in a Two-way Fireball Line Stack, in units: [nearest,
    farthest, best]. The melee bait each Line Stack on his hitbox (12.5). Behind them, a marked
    player stands just outside it and a tethered player farther out (the owner, November 25, from
    Hector's Fixed Stampede mini-guide at 2:44: about 11.5, 16 and 20; the raidplan says "Baits ON
    the hitbox, non-baits OUTSIDE the hitbox"). So nobody but the melee baits the line. */
const TWO_WAY_MARKED = [13.5, 20, 16] as const, TWO_WAY_TETHERED = [18, 34, 20] as const;
/** Your Two-way Fireball spot: the east or west Line Stack, `at` units out from the boss. */
function twoWaySpot(east: boolean, [lo, hi, best]: readonly [number, number, number]): Zone {
  const sx = east ? 1 : -1, rect: RectZone["rect"] = [Math.min(50 + sx * lo, 50 + sx * hi), 43, Math.max(50 + sx * lo, 50 + sx * hi), 57];
  return {fn:p => inZone(p, {rect}), label:[50 + sx * best, 50], show:[{rect}]};
}

/** Ecliptic Stampede's Two-way Fireball: two Line Stacks, east and west. The south wall's player,
    and a tether in an east corner, join the east one (the mini-guide, 2:40). */
export function eclTwoWayScene(p: EclPlace): Scene {
  const east = p === "south" || p === "ne" || p === "se", tethered = isEclCorner(p), side = east ? "east" : "west";
  return {setup:[eclFireSetup(p), "The boss casts Two-way Fireball: two Line Stacks, east and west."], ordered:true,
    boss:BOSS, overlays:[...NPUD, ...SPUD],
    steps:[{q:"Which Line Stack do you join? Click it.", z:twoWaySpot(east, tethered ? TWO_WAY_TETHERED : TWO_WAY_MARKED),
      a:tethered ? [`The ${side} Line Stack, behind the players by the boss.`, "The melee bait it under the boss, so stay farther out."]
        : [`The ${side} Line Stack, in max melee.`, "The melee bait it under the boss, in front of you."],
      // You join one Line Stack; the other must miss you.
      reveal:[lineStack([50, 50], [0, 50]), lineStack([50, 50], [100, 50])], hits:[lineStack([50, 50], east ? [0, 50] : [100, 50])]}],
    rule:TWO_WAY_RULE};
}

/** Your Four-way Fireball spot by the boss: the circle, less the parts inside the two Line Stacks
    beside yours. Those two run square to your own line, through the boss, so a spot is out of them
    when it is at least half a line's width out along your own line. */
function fourWayNear(deg: number, {c, r}: CircleZone): Zone {
  const out = (p: Point): number => (p[0] - 50) * Math.sin(deg * DEG) - (p[1] - 50) * Math.cos(deg * DEG);
  const part = (d: number): Stretch | null => {
    const x = crossCircle(CENTER, d, c, r);
    if(!x) return null;
    const lo = Math.max(x[0], LINE_STACK_HALF / Math.cos((d - deg) * DEG));
    return x[1] - lo > 0.3 ? [lo, x[1]] : null;
  };
  return {fn:p => dist(p, c) <= r && out(p) >= LINE_STACK_HALF, label:c,
    show:rayArea(CENTER, Array.from({length:81}, (_x, i) => deg - 40 + i), part).map(poly => ({poly}))};
}

/** A tethered player's Four-way Fireball spot, out on the intercard: the circle, with the fire
    puddles on the floor cut out. */
function fourWayOut(deg: number, {c, r}: CircleZone): Zone {
  const holes = [...WALL_SPOTS.north, ...WALL_SPOTS.south].map(q => ({q, r:ATOMIC_PUDDLE.r}));
  const part = (d: number): Stretch | null => {
    const x = crossCircle(CENTER, d, c, r);
    return x ? cutOut([x], CENTER, d, holes)[0] ?? null : null;
  };
  return {fn:p => dist(p, c) <= r && holes.every(h => dist(p, h.q) > h.r), label:c,
    show:rayArea(CENTER, Array.from({length:41}, (_x, i) => deg - 20 + i), part).map(poly => ({poly}))};
}

/** Ecliptic Stampede's Four-way Fireball: Pair Stacks on the four closest players. A marked player
    takes NW (north wall) or NE (south wall), under the boss. A tethered player stays on their
    corner's intercard, further out, behind the player at max melee (the mini-guide, 2:25). The
    spot 24 units out is the app's choice. */
export function eclFourWayScene(p: EclPlace): Scene {
  const deg = isEclCorner(p) ? CORNER_DEG[p] : p === "south" ? 45 : 315;
  const z: Zone = isEclCorner(p) ? fourWayOut(deg, {c:POINT_AT(deg, 24), r:7}) : fourWayNear(deg, ECL_WAIT[p]);
  return {setup:[eclFireSetup(p), "The boss casts Four-way Fireball: Pair Stacks on the four closest players."], ordered:true,
    boss:BOSS, overlays:[...NPUD, ...SPUD],
    steps:[{q:"Which Pair Stack do you take?", z,
      a: isEclCorner(p) ? [`${p.toUpperCase()}, on your corner's intercard, behind the player at max melee.`] : p === "south" ? ["NE, under the boss."] : ["NW, under the boss."],
      // Four line stacks from the boss through the four closest pairs: NW, NE, SW and SE.
      reveal:[315, 45, 225, 135].map(a => lineStack([50, 50], POINT_AT(a, 10))),
      // You take yours; the other three must miss you.
      hits:[315, 45, 225, 135].filter(a => a !== deg).map(a => lineStack([50, 50], POINT_AT(a, 10)))}],
    rule:FOUR_WAY_RULE};
}

/* ---------- Arena Split ----------
   Two platforms, west and east, from Flatliner to the Crown of Arcadia, drawn from BossMod
   (PLATFORM_X). Light party 1 (H1) starts west, light party 2 (H2) east (Hector No Buddies).
   Each tower knocks you back: with a tether to the other platform, without one to the same
   platform. You have a tether in one of the two rounds and not in the other. So H1 is on the
   east platform after the second round, and H2 on the west, whichever round had the tether
   (the owner's rule, from wtfdig). */
export type SplitSide = "west" | "east";
/** An end of a platform: north or south. */
export type SplitEnd = "north" | "south";
/** A half of a platform's width: the inner half, next to the boss, or the outer half. */
export type SplitHalf = "inner" | "outer";
export const homeSide = (s: Slot): SplitSide => bySlot<SplitSide>(s, {H1:"west", H2:"east"});
export const otherSide = (p: SplitSide): SplitSide => p === "west" ? "east" : "west";
export const otherEnd = (e: SplitEnd): SplitEnd => e === "north" ? "south" : "north";
export const otherHalf = (h: SplitHalf): SplitHalf => h === "inner" ? "outer" : "inner";
/** The middle of a platform's west to east span: where its inner and outer halves meet. */
const platformMid = (side: SplitSide): number => (PLATFORM_X[side][0] + PLATFORM_X[side][1]) / 2;
/** The west and east edges of a half of a platform. */
function halfX(side: SplitSide, half: SplitHalf): [number, number] {
  const [x0, x1] = PLATFORM_X[side], m = platformMid(side);
  return (side === "west") === (half === "outer") ? [x0, m] : [m, x1];
}
/** A whole platform, as a zone. */
export const platformZone = (side: SplitSide): RectZone => ({rect:[PLATFORM_X[side][0], 0, PLATFORM_X[side][1], 100]});
/** The middle of a platform's inner edge, next to the boss: the Fire Breath bait, the puddles and
    Massive Meteor. The same zone as Learn's Fire Breath card. Its width is the app's choice. */
export const SPLIT_INNER: Record<SplitSide, RectZone> = {
  west:{rect:[PLATFORM_X.west[1] - 10.5, 38, PLATFORM_X.west[1], 62]}, east:{rect:[PLATFORM_X.east[0], 38, PLATFORM_X.east[0] + 10.5, 62]}};
/** Where a tether waits for the Fire Breath markers: a step back from SPLIT_INNER, so every
    spot in it is further from the boss than every spot there, as Fire Breath marks the four
    closest players. Its size and the gap are the app's choice. */
export const SPLIT_BACK: Record<SplitSide, RectZone> = {
  west:{rect:[SPLIT_INNER.west.rect[0] - 11, 38, SPLIT_INNER.west.rect[0] - 5, 62]}, east:{rect:[SPLIT_INNER.east.rect[2] + 5, 38, SPLIT_INNER.east.rect[2] + 11, 62]}};
/** The four towers, one in each quadrant (as in the first towers). */
export const SPLIT_TOWER: Record<SplitSide, Record<SplitEnd, Point>> = {west:{north:[11, 23], south:[11, 77]}, east:{north:[89, 23], south:[89, 77]}};
/** How many players soak each Arena Split tower (the drills of the split and Arcadion Avalanche). */
const SPLIT_SOAK = 2;
const SPLIT_TOWERS: Overlay[] = [SPLIT_TOWER.west.north, SPLIT_TOWER.east.north, SPLIT_TOWER.west.south, SPLIT_TOWER.east.south].map(p => soakTower(p, SPLIT_SOAK));
/** The number waymark at each end of each platform, where a Fire Breath marker goes. */
const WAYMARK: Record<SplitSide, Record<SplitEnd, {n: number; p: Point}>> = {
  west:{north:{n:1, p:[10, 22.5]}, south:{n:4, p:[10, 77.5]}}, east:{north:{n:2, p:[90, 22.5]}, south:{n:3, p:[90, 77.5]}}};
const quadrant = (side: SplitSide, end: SplitEnd): string => (end === "north" ? "N" : "S") + (side === "west" ? "W" : "E");
/** Your mark on the arena, where you stood at the end of the last tethers and markers: the outer
    corner at that end of the platform, clear of its tower and of the tower's label. */
const lastSpot = (s: Slot, side: SplitSide, end: SplitEnd): Overlay =>
  ({t:"mark", x:side === "west" ? PLATFORM_X.west[0] + 5 : PLATFORM_X.east[1] - 5, y:end === "north" ? 5 : 95, l:s, r:"H"});
/** The end of your first tower. Hector No Buddies puts tanks and ranged north, healers and melee
    south, so both healers start south (H1 SW, H2 SE). */
export const firstTowerEnd = (_s: Slot): SplitEnd => "south";
const randomEnd = (): SplitEnd => random() < 0.5 ? "north" : "south";
const randomSide = (): SplitSide => random() < 0.5 ? "west" : "east";
export const randomHalf = (): SplitHalf => random() < 0.5 ? "inner" : "outer";

/* The tether portals: two just outside each platform's outer wall, PORTAL_OUT out. One side has
   its pair near the ends (5 and 35 yalms from the north wall), the other near the middle (15 and
   25). Which side is random each round. BossMod has no portal spots, so they come from cactbot's
   trigger "R11S Arena Split Majestic Meteowrath Tether Collect" (z 85, 95, 105, 115). */
const PORTAL_Y = {ends:[12.5, 87.5], middle:[37.5, 62.5]} as const;
/** The portal on `side`'s outer wall, in its north or south half. `endsSide` is the side whose
    portals are near the ends. */
export function portalAt(side: SplitSide, half: SplitEnd, endsSide: SplitSide): Point {
  const x = side === "west" ? PLATFORM_X.west[0] - PORTAL_OUT : PLATFORM_X.east[1] + PORTAL_OUT;
  return [x, PORTAL_Y[side === endsSide ? "ends" : "middle"][half === "north" ? 0 : 1]];
}
const SIDES: readonly SplitSide[] = ["west", "east"], ENDS: readonly SplitEnd[] = ["north", "south"];
/** The four tether portals, as the arena draws them. */
export const portalsOf = (endsSide: SplitSide): Overlay[] =>
  SIDES.flatMap(sd => ENDS.map((h): Overlay => { const [x, y] = portalAt(sd, h, endsSide); return {t:"portal", x, y, vert:false}; }));
export const randomEndsSide = randomSide;
const SLOT_NAMES: readonly SlotName[] = ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"];
/** n players other than you, at random: the other tethered players. The tethers go to random
    roles (the owner), so any mix can stand on a platform. */
export const randomOthers = (s: Slot, n: number): SlotName[] => shuffle(SLOT_NAMES.filter(x => x !== s)).slice(0, n);
/** The tethers swap in the second round: the players other than you who had none in the first. */
export const swappedOthers = (s: Slot, first: readonly SlotName[]): SlotName[] => SLOT_NAMES.filter(x => x !== s && !first.includes(x));

/** The side portal lines (Majestic Meteorain): one line covers a half of each platform's width,
    along its whole length. When it covers the inner half of one platform, it covers the outer
    half of the other (Hector's video and wtfdig). `covered` is the half of `side` it covers. */
export function portalLines(side: SplitSide, covered: SplitHalf): Overlay[] {
  const band = (sd: SplitSide, h: SplitHalf): Overlay => {
    const [x0, x1] = halfX(sd, h);
    return {t:"lane", rect:[x0, 0, x1, 100], soft:true};
  };
  const [x0, x1] = halfX(side, covered);
  // The tag sits north of the middle, clear of waymarks B and D and of the first puddle.
  return [band(side, covered), band(otherSide(side), otherHalf(covered)), {t:"tag", x:(x0 + x1) / 2, y:33, s:"PORTAL LINES"}];
}

const SPLIT_ROUND_RULE: Lines = ["No tether: go in close to bait Fire Breath.", "Tether: wait a step back until the markers are out.",
  "Everyone baits the first puddle in close.",
  "Then each puddle just outside the last, toward your end.",
  "Tether: your end is away from your portal.", "No tether: your end is where you got knocked.",
  "Then a tether goes to the wall, a marker to the waymark's wall-side corner.",
  "Both stay out of the portal lines."];

/* Majestic Meteor: three puddles drop on the party, 2 seconds apart. The first goes in close, at
   the middle of the platform's inner edge. Each next one goes just outside the last, tight
   against the inner edge, toward your end (the owner's strat). The next spot is judged from
   where the last puddle actually dropped. */
/** The inner edge of a platform, where the second and third puddles go: tight against the gap
    (Hector's video). Its width is the app's choice. */
const INNER_STRIP: Record<SplitSide, [number, number]> = {west:[PLATFORM_X.west[1] - 6.5, PLATFORM_X.west[1]], east:[PLATFORM_X.east[0], PLATFORM_X.east[0] + 6.5]};
function splitPuddleAfter(side: SplitSide, end: SplitEnd): (results: StepResult[]) => Zone {
  const [xa, xb] = INNER_STRIP[side], dir = end === "north" ? -1 : 1, R = MAJESTIC_PUDDLE.r;
  return results => {
    const q: Point = results[results.length - 1].drop ?? zoneCenter(SPLIT_INNER[side]);
    const fn = (p: Point): boolean => {
      const d = dist(p, q);
      return p[1] >= 0 && p[1] <= 100 && p[0] >= xa && p[0] <= xb && (p[1] - q[1]) * dir > 0 && d >= R && d <= R + 6;
    };
    const ideal: Point = [(xa + xb) / 2, q[1] + dir * (R + 1)];
    const label = fn(ideal) ? ideal : nearestTo(ideal, fn) ?? ideal;
    return {fn, label, show:[{c:label, r:4.5}]};
  };
}
type Band = Extract<Overlay, {t: "band"}>;
/** One side of a convex shape: the points p with n·p < d are inside it. */
interface Side { n: Point; d: number }
/** What a zone leaves out: a circle, or a convex shape (a band, a wedge) given by its sides. */
type Hole = {q: Point; r: number} | {sides: readonly Side[]};
const dot = (a: Point, b: Point): number => a[0] * b[0] + a[1] * b[1];
/** A band (a line attack) as a hole: its rectangle, from where it starts to where it ends. */
const bandHole = (b: Band): Hole => {
  const a: Point = [b.x, b.y], e: Point = [b.x2, b.y2], u = unit([e[0] - a[0], e[1] - a[1]]), n: Point = [-u[1], u[0]];
  return {sides:[{n, d:dot(n, a) + b.w / 2}, {n:[-n[0], -n[1]], d:-dot(n, a) + b.w / 2}, {n:u, d:dot(u, e)}, {n:[-u[0], -u[1]], d:-dot(u, a)}]};
};
/** The spots where a line `w` wide, from `from` through you, would hit a player at `at`: a wedge
    from `from` around the way to `at`. */
const lineWouldHit = (from: Point, at: Point, w: number): Hole => {
  const v: Point = [at[0] - from[0], at[1] - from[1]], k = Math.hypot(v[0], v[1]);
  const a = Math.asin(Math.min(1, w / 2 / k)), b = Math.atan2(v[1], v[0]);
  // Each edge of the wedge, with its normal pointing out of the wedge.
  const edge = (deg: number, out: number): Side => { const n: Point = [-Math.sin(deg) * out, Math.cos(deg) * out]; return {n, d:dot(n, from)}; };
  return {sides:[edge(b + a, 1), edge(b - a, -1)]};
};
/** True when p is clear of the hole. */
const clearOf = (p: Point, h: Hole): boolean => "q" in h ? dist(p, h.q) >= h.r : h.sides.some(s => dot(s.n, p) >= s.d);
/** Where the ray from c at `deg` is inside the hole, or null if it misses. */
function crossHole(c: Point, deg: number, h: Hole): Stretch | null {
  if ("q" in h) return crossCircle(c, deg, h.q, h.r);
  const u = ray(deg);
  let lo = -Infinity, hi = Infinity;
  for (const s of h.sides) {
    const s0 = dot(s.n, c), s1 = dot(s.n, u);
    if (Math.abs(s1) < 1e-9) { if (s0 >= s.d) return null; continue; }
    const t = (s.d - s0) / s1;
    if (s1 > 0) hi = Math.min(hi, t); else lo = Math.max(lo, t);
  }
  return lo < hi ? [lo, hi] : null;
}
/** The longest stretch of the ray from c at `deg`, up to `to`, outside every hole. */
function clearStretch(c: Point, deg: number, to: number, holes: readonly Hole[]): Stretch | null {
  const parts = holes.reduce((ps: Stretch[], h) => {
    const x = crossHole(c, deg, h);
    return x ? ps.flatMap(([lo, hi]): Stretch[] => [[lo, Math.min(hi, x[0])], [Math.max(lo, x[1]), hi]]).filter(([lo, hi]) => hi - lo > 0.3) : ps;
  }, [[0, to]]);
  return parts.sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0] ?? null;
}
/** The zone `base` (the area within reach(deg) of c along each ray) without the last puddle. The
    last puddle is still on the floor when the tethers and markers resolve: it goes off 0.2
    seconds after Fire Breath (cactbot). `best` is the spot to show when it is clear. `away`
    leaves out more circles and bands. */
function outOfLastPuddle(base: Zone, c: Point, reach: (deg: number) => number, best: Point, away: readonly Hole[] = []): (results: StepResult[]) => Zone {
  return results => {
    const drops = results.flatMap(r => r.drop ? [r.drop] : []), last = drops[drops.length - 1];
    const holes: Hole[] = [...(last ? [{q:last, r:MAJESTIC_PUDDLE.r}] : []), ...away];
    const fn = (p: Point): boolean => inZone(p, base) && holes.every(h => clearOf(p, h));
    const part = (deg: number): Stretch | null => clearStretch(c, deg, reach(deg), holes);
    const degs = Array.from({length:361}, (_x, d) => d);
    // Start from a ray that misses, so the area is drawn as one piece.
    const from = degs.find(d => !part(d)) ?? 0;
    const label = fn(best) ? best : nearestTo(best, fn) ?? best;
    return {fn, label, show:rayArea(c, degs.map(d => d + from), part).map(poly => ({poly}))};
  };
}
/** How far a ray from the middle of a rectangle runs before it leaves it. */
const rectReach = (rect: RectZone["rect"]) => (deg: number): number => {
  const u = ray(deg), hw = (rect[2] - rect[0]) / 2, hh = (rect[3] - rect[1]) / 2;
  return Math.min(Math.abs(u[0]) > 1e-9 ? hw / Math.abs(u[0]) : Infinity, Math.abs(u[1]) > 1e-9 ? hh / Math.abs(u[1]) : Infinity);
};
/** A zone from a rectangle, without the last puddle (and `away`), best at `best`. */
const rectOutOfLastPuddle = (rect: RectZone["rect"], best: Point, away: readonly Hole[] = []): (results: StepResult[]) => Zone =>
  outOfLastPuddle({rect}, zoneCenter({rect}), rectReach(rect), best, away);

/** How deep the wall strip is where a tether stretches, and how far from a waymark's center a
    marker may stand: the app's choice. */
const WALL_STRIP = 5, WAYMARK_REACH = 6.5;
/** The best tether spot: the north or south wall at `end`, just outside the portal lines, so the
    tether makes room for the others (Hector's video). */
function tetherBest(side: SplitSide, end: SplitEnd, covered: SplitHalf): Point {
  const [x0] = halfX(side, otherHalf(covered)), m = platformMid(side);
  return [x0 === m ? m + WALL_STRIP : m - WALL_STRIP, end === "north" ? WALL_STRIP / 2 : 100 - WALL_STRIP / 2];
}
/** Where a tether stretches: the north or south wall at your end, in the half of the platform
    the portal lines leave safe, far enough from the portal to be stretched. It leaves out the
    lines that go off then (`lines`), and the spots from which your own line, from the portal
    through you, would hit another player at the lineup (`players`). */
function tetherSpot(side: SplitSide, end: SplitEnd, covered: SplitHalf, portal: Point, lines: readonly Band[], players: readonly Point[]): (results: StepResult[]) => Zone {
  const [x0, x1] = halfX(side, otherHalf(covered));
  const [y0, y1] = end === "north" ? [0, WALL_STRIP] : [100 - WALL_STRIP, 100];
  const best = tetherBest(side, end, covered), own = wrathLine(portal, best).w;
  return rectOutOfLastPuddle([x0, y0, x1, y1], best,
    [{q:portal, r:TETHER_STRETCH}, ...lines.map(bandHole), ...players.map(p => lineWouldHit(portal, p, own))]);
}
/** Where a Fire Breath marker stands: the corner of the number waymark at your end that is
    nearest the wall, on the side of the waymark the portal lines leave safe (Hector's video). The
    other tethers' lines pass just by it, so the area leaves them out (the owner's choice). */
function markerSpot(side: SplitSide, end: SplitEnd, covered: SplitHalf, lines: readonly Band[]): (results: StepResult[]) => Zone {
  return rectOutOfLastPuddle(markerRect(side, end, covered), markerCorner(side, end, covered), lines.map(bandHole));
}
/** The box around the waymark's corner where a Fire Breath marker may stand. */
function markerRect(side: SplitSide, end: SplitEnd, covered: SplitHalf): RectZone["rect"] {
  const {p} = WAYMARK[side][end], [h0, h1] = halfX(side, otherHalf(covered));
  const x0 = Math.max(h0, p[0] - WAYMARK_REACH), x1 = Math.min(h1, p[0] + WAYMARK_REACH);
  const [y0, y1] = end === "north" ? [p[1] - WAYMARK_REACH, p[1]] : [p[1], p[1] + WAYMARK_REACH];
  return [x0, y0, x1, y1];
}
/** The best spot of a marker's area, before any puddle drops: the corner, or the nearest spot to
    it that the lines miss. */
function markerBest(side: SplitSide, end: SplitEnd, covered: SplitHalf, lines: readonly Band[]): Point {
  const rect = markerRect(side, end, covered), corner = markerCorner(side, end, covered), holes = lines.map(bandHole);
  const fn = (p: Point): boolean => inZone(p, {rect}) && holes.every(h => clearOf(p, h));
  return fn(corner) ? corner : nearestTo(corner, fn) ?? corner;
}
/** The corner of the number waymark at one end of a platform where a Fire Breath marker stands:
    toward the wall, on the side of the waymark the portal lines leave safe. It sits just off the
    waymark's square (6 units across). */
export const markerCorner = (side: SplitSide, end: SplitEnd, covered: SplitHalf): Point => {
  const {p} = WAYMARK[side][end], safeOuter = covered === "inner";
  const sx = (side === "west") === safeOuter ? -1 : 1, sy = end === "north" ? -1 : 1;
  return [p[0] + sx * 5.5, p[1] + sy * 5.5];
};

/** One round of tethers and Fire Breath markers, as you play it. */
export interface SplitRound {
  /** You have a tether this round. */
  tether: boolean;
  /** Your platform. */
  side: SplitSide;
  /** Your end of the platform: with a tether, the end away from your portal; without one, the end
      you were knocked to. */
  end: SplitEnd;
  /** The half of your platform the side portal lines cover. */
  covered: SplitHalf;
  /** The side whose tether portals are near the ends; the other side's are near the middle. */
  endsSide: SplitSide;
  /** The other tethered players: three when you have a tether, four when you do not. */
  others: readonly SlotName[];
}

/** The tethers of the other players at the lineup. Each platform has two tethered players, one
    at each end, each stretched from a portal on the other side, at the opposite end. */
function otherTethers(r: SplitRound): Overlay[] {
  return othersAtLineup(r).flatMap(({who, p, portal}): Overlay[] =>
    [{t:"tether", x:portal[0], y:portal[1], x2:p[0], y2:p[1]}, {t:"mark", x:p[0], y:p[1], l:who, r:markRole(partyOf(who).role)}]);
}
/** Each other tethered player at the lineup: who, where, and their tether's portal. */
function othersAtLineup(r: SplitRound): {who: SlotName; p: Point; portal: Point}[] {
  const spots = SIDES.flatMap(sd => ENDS.map(e => ({sd, e}))).filter(({sd, e}) => !(r.tether && sd === r.side && e === r.end));
  return spots.flatMap(({sd, e}, i) => {
    const who = r.others[i];
    if (!who) return [];
    return [{who, p:tetherBest(sd, e, sd === r.side ? r.covered : otherHalf(r.covered)), portal:portalAt(otherSide(sd), otherEnd(e), r.endsSide)}];
  });
}
/** The other players' tethers going off (Majestic Meteowrath): a line from each portal through
    its player. They must miss you. */
const otherWraths = (r: SplitRound): Band[] => othersAtLineup(r).map(({p, portal}) => wrathLine(portal, p));
/** Every tether's line at the lineup, yours too when you have one, with each player at the best
    spot. */
const allWraths = (r: SplitRound): Band[] =>
  [...(r.tether ? [wrathLine(portalAt(otherSide(r.side), otherEnd(r.end), r.endsSide), tetherBest(r.side, r.end, r.covered))] : []), ...otherWraths(r)];
/** Where each Fire Breath marker stands at the lineup, you too without a tether: the best spot
    by the number waymark at its end, clear of the tethers' lines. In the order of SIDES, then
    ENDS. */
function markerSpots(r: SplitRound): {sd: SplitSide; e: SplitEnd; p: Point}[] {
  // A round is built often and the spots take a while to find, so each pattern is found once.
  const key = [r.tether, r.side, r.end, r.covered, r.endsSide, r.others.length].join(), known = MARKER_SPOTS.get(key);
  if (known) return known;
  const spots = SIDES.flatMap(sd => ENDS.map(e => ({sd, e, p:markerBest(sd, e, sd === r.side ? r.covered : otherHalf(r.covered), allWraths(r))})));
  MARKER_SPOTS.set(key, spots);
  return spots;
}
const MARKER_SPOTS = new Map<string, {sd: SplitSide; e: SplitEnd; p: Point}[]>();
/** Where each Fire Breath marker other than you stands at the lineup. With a tether you have no
    marker, so all four stand there. */
const markersAtLineup = (r: SplitRound): Point[] =>
  markerSpots(r).filter(({sd, e}) => r.tether || sd !== r.side || e !== r.end).map(({p}) => p);
/** The markers' Fire Breath: a line from the boss through each marked player. */
const otherBreaths = (r: SplitRound): Band[] => markersAtLineup(r).map(p => fireBreath(CENTER, p));
/** The other markers at the lineup: the players with no tether, other than you, each with its
    Fire Breath. */
function otherMarkers(s: Slot, r: SplitRound): Overlay[] {
  const names = SLOT_NAMES.filter(x => x !== s && !r.others.includes(x));
  return markersAtLineup(r).flatMap((p, i): Overlay[] => {
    const who = names[i];
    return who ? [fireBreath(CENTER, p), {t:"mark", x:p[0], y:p[1], l:who, r:markRole(partyOf(who).role)}] : [];
  });
}
/** Your own Fire Breath, without a tether: through your best spot. */
const yourBreath = (r: SplitRound): Band => {
  const mine = markerSpots(r).find(({sd, e}) => sd === r.side && e === r.end);
  return fireBreath(CENTER, mine ? mine.p : markerCorner(r.side, r.end, r.covered));
};

/** One round of tethers and Fire Breath markers, on your platform, ending at your end. Without a
    tether you bait Fire Breath and get a marker. */
export function splitRound(s: Slot, r: SplitRound): Scene {
  const {tether, side, end, covered} = r, wm = WAYMARK[side][end], next = splitPuddleAfter(side, end);
  const far = otherSide(side), toward = otherEnd(end), portal = portalAt(far, toward, r.endsSide);
  // Before your first answer you stand in the middle of your platform: the app's choice.
  const you: Extract<Overlay, {t: "mark"}> = {t:"mark", x:platformMid(side), y:50, l:s, r:"H"};
  return {setup:[tether ? "You have a tether. You are on the " + side + " platform." : "No tether. You are on the " + side + " platform.",
      tether ? "Your portal is on the " + far + " side, toward the " + toward + "." : "You got knocked to the " + end + " end.",
      "Three puddles drop on the party, one after another."], ordered:true,
    split:true, boss:BOSS, overlays:portalsOf(r.endsSide), ...(tether ? {tether:{portal, you}} : {}),
    steps:[
      ...(tether
        ? [{q:"Where do you wait for the Fire Breath markers?", z:SPLIT_BACK[side],
          a:["A step back from the middle of the platform's inner edge.", "Fire Breath marks the four players closest to the boss."]},
          {q:"Where do you bait the first puddle?", z:SPLIT_INNER[side], drop:MAJESTIC_PUDDLE,
            a:["In close, at the middle of the platform's inner edge.", "Bait the puddles with the party."]}]
        : [{q:"No tether. Where do you go?", z:SPLIT_INNER[side], drop:MAJESTIC_PUDDLE,
          a:["In close, at the middle of the platform's inner edge.", "Bait Fire Breath and the first puddle there."]}]),
      {q:"Second puddle?", zf:next, drop:MAJESTIC_PUDDLE,
        a:["Just outside the first puddle, toward the " + end + " end.", "Stay tight against the inner edge."]},
      {q:"Third puddle?", zf:next, drop:MAJESTIC_PUDDLE,
        a:["Just outside the second puddle, toward the " + end + " end again.", "Stay tight against the inner edge."]},
      tether
        ? {q:"The portal lines cover half of each platform. Where do you stretch your tether?", zf:tetherSpot(side, end, covered, portal, [...otherWraths(r), ...otherBreaths(r)], [...othersAtLineup(r).map(o => o.p), ...markersAtLineup(r)]),
          // Your own line goes through you, as it should; the others' lines and Fire Breath must miss you.
          cue:portalLines(side, covered), reveal:[wrathLine(portal, tetherBest(side, end, covered)), ...otherWraths(r), ...otherTethers(r), ...otherMarkers(s, r)], hits:[...otherWraths(r), ...otherBreaths(r)],
          a:["The " + end + " wall, just outside the portal lines.", "That end is away from your portal.", "Stay out of the third puddle."]}
        : {q:"The portal lines cover half of each platform. You have a marker. Where do you stand?", zf:markerSpot(side, end, covered, [...otherWraths(r), ...otherBreaths(r)]),
          // Your own Fire Breath goes through you, as it should; the others' lines must miss you.
          cue:portalLines(side, covered), reveal:[yourBreath(r), ...otherWraths(r), ...otherTethers(r), ...otherMarkers(s, r)], hits:[...otherWraths(r), ...otherBreaths(r)],
          a:["The wall-side corner of waymark " + wm.n + ", out of the portal lines.", "Stay out of the third puddle."]}],
    rule:SPLIT_ROUND_RULE};
}

/* The Arena Split towers. Each one knocks the players in it 23 yalms straight away from its
   middle (TOWER_KNOCKBACK, BossMod), so where you stand in it decides where you land (Hector's
   video, 13:08). To cross, stand on the side facing the other platform. To stay, stand on the
   side facing the platform's middle: you land at its other end. */
/** Where a tower must send you: across to the other platform, or along yours to its other end. */
export type Knock = "across" | "along";
/** The way a tower at (side, end) knocks you, as a unit vector. */
export const knockDir = (side: SplitSide, end: SplitEnd, knock: Knock): Point =>
  knock === "across" ? [side === "west" ? 1 : -1, 0] : [0, end === "north" ? 1 : -1];
/** A tether ends on the platform across from its portal. So it needs the knockback across only
    when its portal is on your own side; when the portal is already across, you stay. */
export const knockFor = (side: SplitSide, portal: Point | null): Knock =>
  portal && (portal[0] < 50 ? "west" : "east") === side ? "across" : "along";
/** The part of the tower at (side, end) that sends you `knock`: the spots from which the
    knockback, straight out from the tower's middle, lands you on the right platform. From the
    SW tower, to cross that is about straight east, or a little north-east; further round, the
    knockback throws you off the arena or into the gap. */
function towerHalf(side: SplitSide, end: SplitEnd, knock: Knock): Zone {
  // It depends only on these three, and it takes a while to build, so each is built once.
  const key = side + end + knock, known = TOWER_ZONES.get(key);
  if (known) return known;
  const zone = buildTowerHalf(side, end, knock);
  TOWER_ZONES.set(key, zone);
  return zone;
}
const TOWER_ZONES = new Map<string, Zone>();
function buildTowerHalf(side: SplitSide, end: SplitEnd, knock: Knock): Zone {
  const c = SPLIT_TOWER[side][end], d = knockDir(side, end, knock);
  const fn = (p: Point): boolean => { const r = dist(p, c); return r >= TOWER_CORE && r <= TOWER_R && landsWell(side, end, knock, knockedFrom(c, p)); };
  // Each ray from the middle: the stretch of it that lands you where you need to go.
  const part = (deg: number): Stretch | null => {
    const ok = Array.from({length:41}, (_x, i) => TOWER_CORE + (TOWER_R - TOWER_CORE) * i / 40).filter(r => fn(polar(deg, r, c)));
    return ok.length ? [ok[0], ok[ok.length - 1]] : null;
  };
  const degs = Array.from({length:360}, (_x, i) => i), from = degs.find(g => !part(g)) ?? 0;
  const best = addVec(c, d, TOWER_R / 2);
  return {fn, label:fn(best) ? best : nearestTo(best, fn) ?? best, show:rayArea(c, degs.map(g => g + from), part).map(poly => ({poly}))};
}
/** Where a tower at c knocks a player standing at p: TOWER_KNOCKBACK straight away from c. */
export const knockedFrom = (c: Point, p: Point): Point => thrownTo(c, TOWER_KNOCKBACK, p);
/** How close to a platform's edge a landing may be, and how far out from a tower's middle a
    spot must be to have a clear way out: the app's choice. */
const LAND_MARGIN = 2.5, TOWER_CORE = 1;
/** True when a landing at q is where `knock` must send you from the tower at (side, end): on the
    other platform, or on yours at its other end. Off the platforms you fall. */
function landsWell(side: SplitSide, end: SplitEnd, knock: Knock, q: Point): boolean {
  const [x0, x1] = PLATFORM_X[knock === "across" ? otherSide(side) : side];
  if (q[0] < x0 + LAND_MARGIN || q[0] > x1 - LAND_MARGIN || q[1] < LAND_MARGIN || q[1] > 100 - LAND_MARGIN) return false;
  return knock === "across" || (end === "north" ? q[1] > 50 : q[1] < 50);
}
/** "east", "south"...: the way a unit vector points. */
const way = (d: Point): string => d[0] > 0.5 ? "east" : d[0] < -0.5 ? "west" : d[1] > 0 ? "south" : "north";
/** The answer for a tower: which side of it, and why. */
function towerAnswer(side: SplitSide, end: SplitEnd, knock: Knock, tether: boolean): Lines {
  const at = "The " + way(knockDir(side, end, knock)) + " side of the " + quadrant(side, end) + " tower";
  if (knock === "across") return [at + ", facing the other platform.", "Your tether's portal is on your side: get knocked across."];
  return [at + ", facing the platform's middle.",
    tether ? "Your tether's portal is already across: stay on this platform." : "No tether: stay, and land at the other end."];
}
const TOWER_RULE: Lines = ["A tower knocks you straight away from its middle.", "Tether, portal on your side: stand facing the other platform.",
  "Tether, portal already across: stand facing the platform's middle.", "No tether: stand facing the platform's middle."];

/** The first towers: your light party's tower, at its south end (Hector No Buddies). With a
    tether, it runs from its portal to you from the start, so you see before the knockback which
    way to go. In the full fight the tethers come with the towers (cactbot's "--tethers--"). */
export function firstTowersScene(s: Slot, tether: {portal: Point} | null): Scene {
  const home = homeSide(s), end = firstTowerEnd(s), at = SPLIT_TOWER[home][end], knock = knockFor(home, tether?.portal ?? null);
  const mark: Extract<Overlay, {t: "mark"}> = {t:"mark", x:at[0], y:at[1], l:s, r:"H"};
  return {setup:["Four towers appear: two on each platform.", "Every player soaks a tower.", tether ? "You have a tether this time." : "No tether this time."],
    split:true, boss:BOSS, overlays:[...SPLIT_TOWERS, ...(tether ? [{t:"portal", x:tether.portal[0], y:tether.portal[1], vert:false} as const] : [])],
    ...(tether ? {tether:{portal:tether.portal, you:mark}} : {}),
    steps:[{q:"Where in your tower do you stand?", zf:() => towerHalf(home, end, knock), knock:{from:at, dist:TOWER_KNOCKBACK},
      a:[...towerAnswer(home, end, knock, tether !== null), bySlot(s, {H1:"Your tower is the SW one, with M1.", H2:"Your tower is the SE one, with M2."})]}],
    rule:TOWER_RULE};
}

/** The second towers: soak the tower in the quadrant where you ended the first round. With a
    tether, it runs from its portal to your mark. */
export function splitTowers(s: Slot, side: SplitSide, end: SplitEnd, tether: {portal: Point} | null): Scene {
  const mark = lastSpot(s, side, end), knock = knockFor(side, tether?.portal ?? null);
  const mine = tether && mark.t === "mark" ? {portal:tether.portal, you:mark} : undefined;
  return {setup:["Four towers again, one in each quadrant.", tether ? "You have a tether this time." : "No tether this time."],
    split:true, boss:BOSS,
    // With a tether, your mark is the tether's end, drawn with it.
    overlays:mine ? [...SPLIT_TOWERS, {t:"portal", x:mine.portal[0], y:mine.portal[1], vert:false}] : [...SPLIT_TOWERS, mark],
    ...(mine ? {tether:mine} : {}),
    steps:[{q:"Which tower, and which side of it?", zf:() => towerHalf(side, end, knock), knock:{from:SPLIT_TOWER[side][end], dist:TOWER_KNOCKBACK},
      a:[...towerAnswer(side, end, knock, tether !== null), "Your tower is in the quadrant you ended in."]}],
    rule:["Towers: the quadrant you ended the last tethers and markers in.", ...TOWER_RULE]};
}

/** Massive Meteor: the four players on a platform stack in close, at the middle of its inner edge. */
export function massiveScene(side: SplitSide): Scene {
  return {setup:["Massive Meteor: a five-hit stack on each platform.", "You are on the " + side + " platform."],
    split:true, boss:BOSS, overlays:[],
    steps:[{q:"Where do you stack?", z:SPLIT_INNER[side], a:["In close, at the middle of the platform's inner edge.", "All four on the platform stack, so the melee can hit the boss."]}],
    rule:["All four on a platform stack.", "Mitigate and heal between the hits."]};
}

/** Arcadion Avalanche: the boss faces one platform and grabs it. The towers knock you to the
    other platform, behind him. He turns to it over the north or the south side and slams the
    platform down on most of it; the far end, away from his turn, is safe (wtfdig). */
export function avalancheScene(s: Slot, side: SplitSide, end: SplitEnd, face: SplitSide, swing: SplitEnd): Scene {
  const back = otherSide(face), safe = otherEnd(swing), wm = WAYMARK[back][safe];
  const f = face === "west" ? 270 : 90, dir = (f === 270) === (swing === "north") ? 1 : -1;
  // His turn: half a circle around him, 17 units out, with an arrowhead at its end. The app's choice.
  const turn: Overlay[] = [{t:"turn", x:50, y:50, r:17, from:f, to:f + dir * 180}];
  const [y0, y1] = safe === "north" ? [0, 32] : [68, 100], [x0, x1] = PLATFORM_X[back];
  return {setup:["The boss faces the " + face + " platform: he grabs it.", "Towers appear, one in each quadrant.", "Then he turns and slams the platform down."], ordered:true,
    split:true, boss:{x:50, y:50, f}, overlays:[...SPLIT_TOWERS, lastSpot(s, side, end)],
    steps:[
      {q:"Which tower, and which side of it?", zf:() => towerHalf(side, end, side === back ? "along" : "across"), knock:{from:SPLIT_TOWER[side][end], dist:TOWER_KNOCKBACK},
        a:[side === back
          ? "The " + way(knockDir(side, end, "along")) + " side of the " + quadrant(side, end) + " tower: stay on this platform."
          : "The " + way(knockDir(side, end, "across")) + " side of the " + quadrant(side, end) + " tower: get knocked across.",
        "Your tower is in the quadrant you ended in.", "End on the " + back + " platform, behind him."]},
      {q:"He turns over the " + swing + " side. Where do you go?", z:{rect:[x0, y0, x1, y1]}, cue:turn,
        a:["The " + safe + " end of the " + back + " platform, by waymark " + wm.n + ".", "He turns from the " + swing + ", so go to the other end."],
        reveal:[{t:"lane", rect:platformZone(face).rect}, {t:"tag", x:platformMid(face), y:50, s:"GRABBED"}]}],
    rule:["He grabs the platform he faces.", "Get knocked to the other platform.", "Go to its far end, away from his turn."]};
}
// TS note: the `Drill[]` annotation is what checks every drill below. Each build function
// must return a Scene, so a missing field or a misspelled one is a compile error.
/* Meteorain: where each meteor lands, as a rock. The spots are the app's choice, on the intercard
   lines, at the distances measured in Hector's guide video (https://youtu.be/w1uuwzhyf5A, 9:02 to
   12:04) and close to wtfdig's picture of the second set: the rocks near the boss are in his max
   melee, not under him (the owner, November 25). The SW row runs out along one line, so the
   three rocks there block Triple Tyrannhilation together. */
export const METEOR_ROCKS = {
  /** M1's, the first set. */
  ne: polar(45, 20),
  /** M2's, the first set: the start of the SW row. */
  sw: polar(225, 15.5),
  /** The best spot for H1's, the second set. Any spot NW in max melee is correct. */
  nw: polar(315, 20),
  /** H2's, the second set: farther out on the SW row. */
  sw2: [26, 74] as Point,
  /** R1's, the third set: the end of the SW row. */
  sw3: [10, 90] as Point,
  /** R2's, the third set. */
  ne2: polar(45, 18),
} as const;
/** How far from the boss the party stacks behind a rock to break it. The app's choice, from the video. */
export const BEHIND_ROCK = 30;
/** A rock on the arena. */
const rock = ([x, y]: Point): Overlay => ({t:"rock", x, y});
/** True when a meteor dropped at p lands far enough from M2's SW rock (ROCK_GAP). */
const clearOfSwRock = (p: Point): boolean => dist(p, METEOR_ROCKS.sw) >= ROCK_GAP;
/** H1's meteor: anywhere NW of the boss in his max melee, from 290 to 345 degrees. Closer to west
    than 290, the spot under his hitbox's edge is too close to M2's SW rock. */
const H1_METEOR: Zone = {
  fn:p => { const r = dist(p, CENTER), a = angOf([p[0] - 50, p[1] - 50]); return r >= HITBOX && r <= MELEE_R && a >= 290 && a <= 345 && clearOfSwRock(p); },
  label:METEOR_ROCKS.nw,
  show:[{poly:[...[290, 300, 315, 330, 345].map((a): Point => polar(a, HITBOX)), ...[345, 330, 315, 300, 290].map((a): Point => polar(a, MELEE_R))]}]};
/** The size of H2's drop spot around METEOR_ROCKS.sw2. The app's choice. */
const H2_METEOR_R = 8;
/** H2's meteor: SW, around METEOR_ROCKS.sw2, but never too close to M2's SW rock. Its picture is
    the circle with the part too close to the rock cut off along the gap. */
const H2_METEOR: Zone = {
  fn:p => dist(p, METEOR_ROCKS.sw2) <= H2_METEOR_R && clearOfSwRock(p),
  label:METEOR_ROCKS.sw2,
  show:[{poly:Array.from({length:36}, (_, i): Point => {
    const q = polar(i * 10, H2_METEOR_R, METEOR_ROCKS.sw2);
    return clearOfSwRock(q) ? q : addVec(METEOR_ROCKS.sw, unit([q[0] - METEOR_ROCKS.sw[0], q[1] - METEOR_ROCKS.sw[1]]), ROCK_GAP);
  })}]};
/** Foregone Fatality's tethers: two portals on random cardinals, each tethered to one of the two
    newest rocks. The MT picks up the tether to the northern rock and the OT the southern one
    (Hector's guide video, 9:51 to 11:40). Each tank stands halfway along its tether: the app's
    choice. The hits do not cleave, so the tanks' spots do not matter to the party. */
function fatality(north: Point, south: Point): Overlay[] {
  const [a, b] = shuffle<Wall>(["north", "east", "south", "west"]);
  return ([[a, north, "MT"], [b, south, "OT"]] as const).flatMap(([w, rockAt, l]): Overlay[] => {
    const p = ECL_PORTAL[w], tank = addVec(p, [rockAt[0] - p[0], rockAt[1] - p[1]], 0.5);
    return [{t:"portal", x:p[0], y:p[1], vert:w === "north" || w === "south"}, {t:"tether", x:p[0], y:p[1], x2:tank[0], y2:tank[1], fixed:true},
      {t:"mark", x:tank[0], y:tank[1], l, r:"T"}];
  });
}
/** The tanks in front of the party for the first Line Stack, out of the way of each other. The app's choice. */
const FIRST_STACK_TANKS = ([[303, "MT"], [327, "OT"]] as const).map(([a, l]): Overlay => { const [x, y] = polar(a, 14); return {t:"mark", x, y, l, r:"T"}; });
/** The two healers' meteors, for the one who is not you. */
const otherHealerRock = (s: Slot): Point => bySlot(s, {H1:METEOR_ROCKS.sw2, H2:METEOR_ROCKS.nw});
/** Where the party stands for a Line Stack behind the rock at angle `deg`, and the line through it. */
const stackBehind = (deg: number): Point => polar(deg, BEHIND_ROCK);
const lineThrough = (deg: number): Overlay => lineStack(CENTER, stackBehind(deg));

export const DRILLS: readonly Drill[] = [
  {id:"m-raw-axe", order:2, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: Axe", kind:"spread",
    build:s=>({setup:["The boss pulls out an axe.", "The two tanks stack for a Shared Tank Buster.", "The other six players each get an AoE, so they spread."],
      boss:BOSS, overlays:[...heldWeapon("axe"),{t:"mark",x:AXE_TANKS[0] - 3,y:AXE_TANKS[1],l:"MT",r:"T"},{t:"mark",x:AXE_TANKS[0] + 3,y:AXE_TANKS[1],l:"OT",r:"T"}],
      steps:[{q:"Click your spread spot.", z:{c:AXE_SPREAD_SPOTS[s], r:10}, a:bySlot(s, {H1:["SSW, far out."], H2:["SSE, far out."]})}],
      rule:RAW_STEEL_RULE})},
  {id:"m-raw-scythe", order:2.1, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: Scythe", kind:"roleStack",
    build:s=>({setup:["The boss pulls out a scythe.", "He cleaves three times.", "One cone on each tank, and one cone the rest of the party shares.", "So the tanks spread, and the rest of the party stacks."],
      boss:BOSS, overlays:[...heldWeapon("scythe"),{t:"mark",x:37,y:36,l:"MT",r:"T"},{t:"mark",x:63,y:36,l:"OT",r:"T"}],
      // The party takes the shared cone (the third), so only the two tank cones must miss it.
      steps:[{q:"Click where the party stacks.", z:SCYTHE_STACK, a:["South, directly behind the boss, inside the shared cone."], reveal:SCYTHE_CLEAVES, hits:SCYTHE_CLEAVES.slice(0, 2)}],
      rule:["Scythe: three cleaves.", "The tanks spread to the front.", "The party stacks behind."]})},
  {id:"m-assault", order:3, random:true, follows:{pick:"set1"}, phase:P1, time:"0:48", title:"Assault Evolved: Three Weapons", kind:["stack", "protean", "lightPartyStack"],
    build:(s, _v, pick)=>assaultScene(buildAssault(s, orderFrom(pick)), s)},
  // One drill for the whole stretch: the weapons spawn at 1:13, Void Stardust runs, then the boss
  // takes the same three weapons. A separate drill for the weapons would show a different set.
  {id:"m-void", order:4, random:true, variants:["stack","spread"], follows:{variant:"void", pick:"set2"}, phase:P1, time:"1:13 to 1:45", title:"Void Stardust into the Second Weapons", kind:"puddles",
    build:(s, v, pick)=>voidIntoWeapons(s, v === "spread", buildAssault2(s, orderFrom(pick)))},
  // The boss stands where the second set left him. Its variant is how this one ends, the
  // opposite of the first Void Stardust, so it follows only the weapon order.
  {id:"m-void-2", order:6, random:true, variants:["stack","spread"], follows:{pick:"set2"}, phase:P1, time:"1:50 to 1:56", title:"Void Stardust (Second Time)", kind:"puddles",
    build:(s, v, pick)=>{ const A = buildAssault2(s, orderFrom(pick)); return voidAgain(s, v === "spread", A.states[A.states.length - 1]); }},
  {id:"m-dance", order:8.1, rotate:true, phase:P1, time:"2:31", title:"Dance of Domination: Pairs", kind:"pairStack",
    build:s=>({setup:["The seven hits are over. The lines are on the floor.", "Find the side with no outer line.", "That open side is new south."], ordered:true,
      boss:{x:50, y:50, f:null}, overlays:DANCE_LINES.map((l): Overlay => ({t:"lineaoe", ...l})),
      steps:[{q:"Click your pair spot.", z:{c:DANCE_PAIRS[s], r:5}, a:bySlot(s, {H1:["Relative SW, the outer spot, with R1."], H2:["Relative SE, the outer spot, with R2."]}),
        // The lines explode as the pairs land (Hurricane Explosion, 10 yalms wide), and the pair
        // shares its stack where it stands.
        reveal:DANCE_LINES.map(l => hurricaneLine([l.x, l.y], [l.x2, l.y2])), revealAt:p => [eyeOfTheHurricane(p)]}],
      rule:["Open side = new south.", "H1 and R1: relative SW.", "H2 and R2: relative SE."]})},
  {id:"m-ultimate", order:11.5, random:true, follows:{pick:"ult"}, phase:P1, time:"3:05 to 3:40", title:"Ultimate Trophy Weapons: Six Weapons", kind:["stack", "protean", "lightPartyStack"],
    build:(s, _v, pick)=>ultimateScene(buildUltimate(s, pick ? pick === "cw" : undefined))},
  {id:"m-tornado", order:12, phase:P1, time:"3:46", title:"Ultimate Trophy Weapons: Tornadoes", kind:"bait",
    build:s=>({setup:["The sixth weapon resolved.", "Four tornadoes sit on the cardinals.", "Each one cones its two closest players."],
      boss:BOSS, overlays:TORNADO_BAITS.map(({tornado:[x, y]}): Overlay => ({t:"tornado", x, y})),
      steps:[{q:"Click your tornado bait spot.", z:bySlot(s, {H1:tornadoBait(TORNADO_BAITS[3].support, TORNADO_BAITS[3].tornado), H2:tornadoBait(TORNADO_BAITS[1].support, TORNADO_BAITS[1].tornado)}), a:bySlot(s, {H1:["West tornado, on its north side."], H2:["East tornado, on its south side."]}),
        // You bait the cone of your own tornado; the other seven must miss you.
        reveal:GUST_CONES, hits:gustsBut(bySlot(s, {H1:TORNADO_BAITS[3].support, H2:TORNADO_BAITS[1].support}))}],
      rule:["Face in from your tornado.", "Supports (tanks and healers) stand on the left, DPS on the right."]})},
  {id:"m-orbital", order:15, random:true, phase:P2, time:"4:26 and 8:24", title:"Orbital Omen", kind:"sequence",
    build:s=>{ const O = buildOrbital(); return {
      setup:["The main tank points the boss north.",
        "Portals on the north and east edges fire lines across the arena.", "They fire in the order shown, 1 to 4.",
        "Fire and Fury cleaves his front and back just after the #1 lines.",
        "Hector's dodge: stay in max melee.", "Cross under the boss to the middle square the next lines miss."],
      boss:BOSS, overlays:O.overlays, steps:O.steps,
      rule:ORBITAL_RULE}; }},
  {id:"m-meteor-1", order:16, phase:P2, time:"5:00", title:"Meteorain: First Line Stack", kind:"wildCharge",
    build:s=>({setup:["The melee bait the first two meteors.", "They drop them in max melee, NE and SW.", "The first Line Stack goes off next."], ordered:true,
      boss:BOSS, overlays:[{t:"target",x:METEOR_ROCKS.ne[0],y:METEOR_ROCKS.ne[1]},{t:"target",x:METEOR_ROCKS.sw[0],y:METEOR_ROCKS.sw[1]},
        {t:"mark",x:METEOR_ROCKS.ne[0],y:METEOR_ROCKS.ne[1],l:"M1",r:"D"},{t:"mark",x:METEOR_ROCKS.sw[0],y:METEOR_ROCKS.sw[1],l:"M2",r:"D"}, ...FIRST_STACK_TANKS],
      // The tanks take this first hit in front, at his hitbox, so the party stands past them, out of
      // the hitbox. The healers stay close: they bait the next meteors 3 seconds later.
      steps:[{q:"Where do you stand for the first Line Stack?", z:{c:polar(315, MELEE_R), r:7}, a:["NW, in the Line Stack, behind the tanks.", "The tanks stand in front for this first one."],
        reveal:[lineThrough(315), meteorHit(METEOR_ROCKS.ne), meteorHit(METEOR_ROCKS.sw)], hits:[]}],
      rule:METEOR_ORDER_RULE})},
  {id:"m-meteor-2", order:16.1, random:true, phase:P2, time:"5:03", title:"Meteorain: Your Meteor", kind:"bait",
    build:s=>({setup:["Healers bait the second set of meteors.", "The markers go on the two players closest to the boss.", "Two rocks are already down in max melee: one NE and one SW."],
      boss:BOSS, overlays:[rock(METEOR_ROCKS.ne), rock(METEOR_ROCKS.sw)],
      steps:[
        // The markers come at cactbot's "--Meteor Markers 2--": the healers must be the two closest
        // then (Hector's guide video, 9:43 to 9:59; wtfdig: "Bait meteor close").
        {q:"Healers bait the next meteors. Where do you go?", z:{c:CENTER, r:HITBOX},
          a:["Under the boss.", "Be one of the two closest players, so the marker goes to you."],
          // The tethers come just after the markers, to M1's and M2's rocks.
          revealAt:p => [{t:"target", x:p[0], y:p[1]}], reveal:fatality(METEOR_ROCKS.ne, METEOR_ROCKS.sw)},
        {q:"You have a meteor marker. Where do you drop it?",
        z:bySlot(s, {H1:H1_METEOR, H2:H2_METEOR}),
        a:bySlot(s, {H1:["NW, in max melee."], H2:["SW, in a row with the first SW rock.", "About halfway to the edge."]}),
        // The second Line Stack goes off NE, through the party, just before the meteors land.
        // The NE rock it breaks explodes 3 seconds later, once you have dropped yours.
        cue:[lineThrough(45)],
        revealAt:p => [meteorHit(p), rock(p)],
        reveal:[meteorHit(otherHealerRock(s)), rock(otherHealerRock(s)), rockExplosion(METEOR_ROCKS.ne)],
        hits:[lineThrough(45), meteorHit(otherHealerRock(s))]}],
      rule:[...bySlot(s, {H1:["H1 drops NW, in max melee."],
          H2:["H2 drops SW, in a row with the first rock.", "That rock is in max melee.", "Two rocks too close together explode, so yours goes farther out."]}),
        "Icy Veins swaps H1 and H2 here, so do not mix guides."]})},
  {id:"m-meteor-3", order:16.2, random:true, phase:P2, time:"5:20", title:"Meteorain: Third Line Stack", kind:"wildCharge",
    build:s=>({setup:["The ranged bait the third set.", "Rocks: NW (from H1), and a row of two SW.", "Each stack breaks the rock in front of it."],
      boss:BOSS, overlays:[rock(METEOR_ROCKS.nw), rock(METEOR_ROCKS.sw), rock(METEOR_ROCKS.sw2), ...fatality(METEOR_ROCKS.nw, METEOR_ROCKS.sw2)],
      // The stack breaks the NW rock, which explodes 3 seconds later. The ranged's meteors land
      // SW and NE as it does.
      steps:[{q:"Where do you stand for this Line Stack?", z:{c:stackBehind(315),r:7}, a:["NW, behind the NW rock.", "Farther from the boss than the rock."],
        reveal:[lineThrough(315), rockExplosion(METEOR_ROCKS.nw), meteorHit(METEOR_ROCKS.sw3), meteorHit(METEOR_ROCKS.ne2)], hits:[]}],
      rule:["Stack behind a rock to break it.", "The broken rock explodes: walk out.", "Keep the SW row of rocks whole."]})},
  {id:"m-meteor-4", order:16.3, random:true, phase:P2, time:"5:30 to 5:43", title:"Meteorain: Last Line Stack", kind:"wildCharge",
    build:s=>({setup:["The last stack has no meteor baits.", "Rocks: NE (from R2), and a row of three SW."],
      boss:BOSS, overlays:[rock(METEOR_ROCKS.ne2), rock(METEOR_ROCKS.sw), rock(METEOR_ROCKS.sw2), rock(METEOR_ROCKS.sw3), ...fatality(METEOR_ROCKS.ne2, METEOR_ROCKS.sw3)],
      steps:[
        // The broken NE rock explodes while you run SW.
        {q:"Where do you stand for the fourth Line Stack?", z:{c:stackBehind(45),r:7}, a:["Behind the NE rock, to break it."],
          reveal:[lineThrough(45), rockExplosion(METEOR_ROCKS.ne2)], hits:[]},
        {q:"Triple Tyrannhilation is next. Where do you hide?", z:{c:[5,96],r:6.5}, a:["SW, behind the row of three rocks."]}],
      rule:["After the fourth Line Stack: run SW.", "Hide behind the row of three rocks."]})},
  {id:"m-split-line", order:18, phase:P3, time:"6:02", title:"Arena Split: Lineup", kind:"knockback",
    build:s=>({setup:["Flatliner knocks the party back.", "It splits the arena into two platforms."], ordered:true,
      split:true, boss:BOSS, overlays:[],
      steps:[{q:"Click your lineup spot.", z:bySlot(s, {H1:{rect:[PLATFORM_X.west[0],52,PLATFORM_X.west[1],92]}, H2:{rect:[PLATFORM_X.east[0],52,PLATFORM_X.east[1],92]}}), a:bySlot(s, {H1:["West platform (light party 1), south end.", "Healers and melee go south."], H2:["East platform (light party 2), south end.", "Healers and melee go south."]})}],
      rule:["Light party 1 west, light party 2 east.", "Tanks and ranged north, healers and melee south."]})},
  {id:"m-split-tower", order:19, phase:P3, time:"6:29", title:"Arena Split: First Towers", kind:"towerKnockback", soak:SPLIT_SOAK,
    variants:["tether", "marker"], random:true,
    // A tether's portal is on either side, so the tether may need the knockback across or not.
    build:(s, v)=>firstTowersScene(s, v === "tether" ? {portal:portalAt(randomSide(), randomEnd(), randomEndsSide())} : null)},
  // A round of tethers and markers: a tether ends on either platform, across from its portal.
  {id:"m-split-fire", order:19.1, variants:["tether", "marker"], random:true, phase:P3, time:"6:35", title:"Arena Split: Fire Breath", kind:["bait", "chains"],
    build:(s, v)=>{ const tether = v === "tether", home = homeSide(s);
      return splitRound(s, {tether, side:tether ? randomSide() : home, end:randomEnd(), covered:randomHalf(), endsSide:randomEndsSide(), others:randomOthers(s, tether ? 3 : 4)}); }},
  // The second towers: you start in the quadrant where the first round ended, on either platform.
  {id:"m-split-towers2", order:19.2, variants:["tether", "marker"], random:true, phase:P3, time:"7:01", title:"Arena Split: Second Towers", kind:"towerKnockback", soak:SPLIT_SOAK,
    build:(s, v)=>{ const side = randomSide(), end = randomEnd();
      return splitTowers(s, side, end, v === "tether" ? {portal:portalAt(randomSide(), randomEnd(), randomEndsSide())} : null); }},
  {id:"m-massive", order:20, phase:P3, time:"7:25", title:"Massive Meteor", kind:"lightPartyStack",
    build:s=>massiveScene(otherSide(homeSide(s)))},
  {id:"m-avalanche", order:21, random:true, phase:P3, time:"7:39", title:"Arcadion Avalanche", kind:"towerKnockback", soak:SPLIT_SOAK,
    build:s=>avalancheScene(s, otherSide(homeSide(s)), randomEnd(), randomSide(), randomEnd())},
  // The variants are your puddles' wall, or "none": no puddles, with your tether in a random corner.
  {id:"m-ecl-start", order:26, variants:["south", "north", "none"], follows:{variant:"wall"}, phase:P4, time:"8:54 to 9:27", title:"Ecliptic Stampede: Puddles", kind:"puddles",
    build:(s, v)=>v === "none" ? eclipticFreeScene(s, randomCorner()) : eclipticScene(s, v === "north" ? "north" : "south")},
  {id:"m-ecl-two", order:26.5, variants:["north", "south", "none"], follows:{variant:"wall"}, phase:P4, time:"9:31", title:"Ecliptic Stampede: Two-way Fireball", kind:"lineStack",
    build:(_s, v)=>eclTwoWayScene(eclPlace(v))},
  {id:"m-ecl-four", order:26.6, variants:["north", "south", "none"], follows:{variant:"wall"}, phase:P4, time:"9:31", title:"Ecliptic Stampede: Four-way Fireball", kind:"pairStack",
    build:(_s, v)=>eclFourWayScene(eclPlace(v))},
  {id:"m-hb", order:28, variants:["party", "tanks"], follows:{variant:"kick"}, phase:P4, time:"9:53 to 10:47", title:"Heartbreak Kick", kind:"tower", soak:8,
    build:(_s, v)=>kickScene(v === "tanks" ? "tanks" : "party")}
];
