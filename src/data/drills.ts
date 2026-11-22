// Map drills: the arena scenes and the rules that decide each answer zone.
import { bySlot, shuffle, random } from "../util";
import { P1, P2, P3, P4 } from "./timeline";
import { DEG, unit, addVec, leftOf, angOf, inArena, zoneCenter, COMPASS, polar, dist } from "../geometry";
import { HITBOX, MELEE_R, SWORD_HALF, SPREAD_R, PUDDLE_R, PROTEAN_HALF, PROTEAN_LEN, TOWER_R, ATOMIC_R, RAW_TANK_HALF, RAW_STACK_HALF, SCYTHE_SAFE, HURRICANE_W, axeHit, cleave, donut, lineTo, safeRing, swordCross, swordPocket } from "./attacks";
import type { Boss, Drill, Overlay, Point, RectZone, Scene, Slot, Step, StepResult, Zone } from "../types";

export type WeaponType = "axe" | "sword" | "scythe";
/** One weapon in a jump set. `a` is its direction from the arena center, in degrees clockwise from north.
    `axis`, when set, turns the icon: it is the long side, from the handle end to the tip. */
export interface Weapon { a: number; p: Point; type: WeaponType; where?: string; tornado?: boolean; axis?: Point }
/** Everything a jump-set drill needs: the weapons, where the boss stands after each jump, the steps and the drawing. */
export interface JumpSet { W: Weapon[]; states: Boss[]; steps: Step[]; overlays: Overlay[] }

const WEAPON_TYPES: WeaponType[] = ["axe", "sword", "scythe"];
const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
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
    const where = w.where || COMPASS[Math.round(w.a / 45) % 8];
    let z: Zone, a: string, reveal: Overlay[], stand: Point | undefined;
    if(w.type === "axe"){
      z = {c:addVec(P, unit([50 - P[0], 50 - P[1]]), 28), r:7};
      a = "Axe, " + where + ": stack with the whole party in the middle, outside the axe AoE.";
      reveal = [axeHit(P)];
    } else if(w.type === "scythe"){
      // H1 at the butt end, H2 at the point end, as the scythe is drawn.
      z = {c:addVec(P, scytheAxis(w, i), -9.5 * side), r:5};
      a = "Scythe, " + where + ": close in at the " + bySlot(s, {H1:"butt (the handle end)", H2:"point (the blade end)"}) + " of the scythe.";
      // Proteans: a cone on every player, so each player takes a clock spot close around him.
      // The point and the butt (H2 and H1) are two of the eight spots, opposite each other.
      const pointAt = angOf(scytheAxis(w, i));
      // And a donut: only close to him is out of it, so the clock spots are close in. Its inner
      // edge shows as a green ring. Each player still takes their own protean cone there.
      reveal = [donut(P, SCYTHE_SAFE), safeRing(P, SCYTHE_SAFE),
        ...Array.from({length:8}, (_x, k) => cleave(P, pointAt + k * 45, PROTEAN_HALF, PROTEAN_LEN))];
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
      a = "Sword, " + where + ": the pocket behind him on his " + own + ", on the side he jumped from, a few steps in from its inner corner. " + bySlot(s, {H1:"G1", H2:"G2"}) + " stacks on you.";
      reveal = swordCross(P, d);
    }
    const leave: Overlay | null = w.tornado ? {t:"tornado", x:P[0], y:P[1]} : null;
    return {q:ORDINALS[i] + " weapon: click where you go.", z, a, reveal, leave, stand};
  });
  return {W, states, steps, overlays};
}

/* Assault Evolved: three weapons. The boss faces the first, then goes clockwise.
   `order` forces the weapon types in the order he takes them (the fight pattern picks); without it,
   the order is random. */
export function buildAssault(s: Slot, order?: WeaponType[]): JumpSet {
  return buildJumpSet(s, assaultWeapons(order));
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

/* Assault Evolved, second set (1:33, after Void Stardust). The boss does not face a weapon until
   his cast starts, but the weapons show the order (cactbot reads it from their facing): the one
   that faces the middle, square to the boss, goes first. Then clockwise. */
export function buildAssault2(s: Slot, order?: WeaponType[]): JumpSet {
  const W = faceApproach(assaultWeapons(order));
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
  const names = cw ? ["south, slightly west", "northwest", "east", "south", "west", "north"]
                   : ["south, slightly east", "northeast", "west", "south", "east", "north"];
  const types = shuffle([...WEAPON_TYPES]).concat(shuffle([...WEAPON_TYPES]));
  const set = buildJumpSet(s, angles.map((a, i): Weapon => ({a, p:atAngle(a), type:types[i], where:names[i], tornado:i >= 2})));
  set.states[0].f = null;   // no facing arrow, so the spawn order is the only clue
  return {...set, cw};
}

/** A picked weapon order ("sword-axe-scythe") as weapon types, or undefined for Random.
    The picks were checked against the known orders when they were saved. */
const orderFrom = (pick?: string): WeaponType[] | undefined => pick ? pick.split("-") as WeaponType[] : undefined;

/** True when the boss jumps once `n` steps of the scene are done: his next place is elsewhere. */
export function jumpsNext(sc: Scene, n: number): boolean {
  const now = sc.bossAt?.(n), next = sc.bossAt?.(n + 1);
  return Boolean(now && next && (next.x !== now.x || next.y !== now.y));
}
/** The boss before a jump: he turns to face the weapon he jumps to next. `n` steps of the scene
    are done. He stays as he is when no jump comes next. */
export function facingNext(sc: Scene, n: number, boss: Boss): Boss {
  const next = sc.bossAt?.(n + 1);
  return next && next.f != null && (next.x !== boss.x || next.y !== boss.y) ? {...boss, f:next.f} : boss;
}

/* The scenes around a jump set. Practice and the full fight both use them, so a
   fight can pass in a set built with the player's choices. */
export function assaultScene(A: JumpSet, s: Slot): Scene {
  return {
    setup:"Three weapons are on the floor. The boss is in the middle, and the red arrow points at the weapon he faces. He jumps to that one first, then goes clockwise. For the sword, watch where he jumps from. For the scythe, read the weapon: the butt is the end with the upright handle, the point is the blade tip.",
    overlays:A.overlays,
    bossAt:n => A.states[Math.min(n, A.states.length - 1)],
    steps:A.steps,
    rule:"First = the weapon he faces, then clockwise. Sword: the pocket on the side he jumped from, " + bySlot(s, {H1:"G1 on his left", H2:"G2 on his right"}) + ", a few steps in from its inner corner. Scythe: " + bySlot(s, {H1:"H1 at the butt", H2:"H2 at the point"}) + ", close in. Axe: the whole party stacks in the middle (not like Raw Steel Trophy's axe, where the party spreads)."};
}
export function ultimateScene(U: JumpSet): Scene {
  return {
    setup:"Everyone is at 1 HP after Charybdistopia. Six weapons spawn one after another, and the boss resolves them in spawn order. He starts on the first weapon before the last ones spawn: three show now, and each hit brings in the next one. Watch where the first one spawns: south and slightly west means clockwise, south and slightly east means counterclockwise.",
    spawnPlay:true, spawnAhead:3, overlays:U.overlays, bossAt:n => U.states[Math.min(n, U.states.length - 1)], steps:U.steps,
    rule:"First weapon south: slightly west = clockwise, slightly east = counterclockwise. The second is NW or NE, then the cardinals. Use the normal rule for each weapon."};
}

/* Void Stardust: each puddle goes just outside the previous one, one small step clockwise
   around the boss at c. The next spot is judged from where the last puddle actually dropped. */
const CENTER: Point = [50, 50];
function puddleAfter(c: Point = CENTER): (results: StepResult[]) => Zone {
  const rel = (p: Point): Point => [p[0] - c[0], p[1] - c[1]];
  return results => {
    const q: Point = results[results.length - 1].drop ?? [c[0], c[1] - OUTSIDE];
    const rq = Math.max(8, Math.hypot(...rel(q)));
    const step = 2 * Math.asin(Math.min(1, (PUDDLE_R + 2.5) / (2 * rq))) / DEG, ia = (angOf(rel(q)) + step) * DEG;
    const ideal: Point = [c[0] + rq * Math.sin(ia), c[1] - rq * Math.cos(ia)];
    const fn = (p: Point): boolean => {
      const dq = dist(p, q), r = Math.hypot(...rel(p)), cw = (angOf(rel(p)) - angOf(rel(q)) + 360) % 360;
      return inArena(p) && dq >= PUDDLE_R && dq <= PUDDLE_R + 6 && r >= 6 && r <= 32 && cw > 3 && cw < 110;
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
  for(let x = 0; x <= 100; x += 0.5) for(let y = 0; y <= 100; y += 0.5){
    const p: Point = [x, y], d = dist(p, t);
    if(d < bd && fn(p)){ best = p; bd = d; }
  }
  return best;
}

/* Comet, the spread that can end Void Stardust. Only the tanks and melee have fixed spots,
   at the intercardinals just outside the hitbox. Healers and ranged take any open spot.
   Nobody stands on a puddle that is still there (Amanda). Each one goes off PUDDLE_LIFE (3)
   seconds after it drops (BossMod: Cometite, 3.0 s cast) and then it is gone, and they drop 2
   seconds apart. So by the stack or spread only the last one is still on the floor: you leave
   it as it goes off, on the way to your spot. The first two have faded from the map. */
const FIXED_SPREAD: {l: string; r: "T" | "D"; off: Point}[] = [
  {l:"MT", r:"T", off:[-15, -15]}, {l:"OT", r:"T", off:[15, -15]}, {l:"M1", r:"D", off:[-15, 15]}, {l:"M2", r:"D", off:[15, 15]}];
/** The tank and melee spread spots around a boss at c. */
const fixedAround = (c: Point): Array<{l: string; r: "T" | "D"; p: Point}> => FIXED_SPREAD.map(m => ({...m, p:addVec(c, m.off)}));
const spreadMarks = (c: Point = CENTER): Overlay[] => fixedAround(c).map((m): Overlay => ({t:"mark", x:m.p[0], y:m.p[1], l:m.l, r:m.r}));
export const FIXED_SPREAD_MARKS = spreadMarks();
/** The open ground north, east, south and west of a boss at c, between the fixed spots. Any of
    them is a good spread spot. */
const gapsAround = (c: Point): Point[] => ([[0, -33], [33, 0], [0, 33], [-33, 0]] as Point[]).map(o => addVec(c, o));
const far = (p: Point, q: Point, d: number): boolean => dist(p, q) >= d;
/** Degrees between two spots, as seen from the arena center (0 to 180). */
const apart = (p: Point, q: Point): number => { const d = Math.abs(angOf([p[0] - 50, p[1] - 50]) - angOf([q[0] - 50, q[1] - 50])) % 360; return Math.min(d, 360 - d); };

/* With `toward` set (a sword or scythe goes first next), the spread spot can be anywhere on
   that weapon's side of the arena, so the way to it is short. That side shows as one shaded
   area. Any spot in it is correct if it is out of the hitbox, out of the last puddle and not on a
   tank or melee spot. A spread is 6 yalms (15 units), so a spot closer than that to a tank or
   melee spot hits them. */
const POINT_AT = (deg: number, r: number): Point => polar(deg, r);
export function cometSpread(s: Slot, toward: Point | null = null, c: Point = CENTER): (results: StepResult[]) => Zone {
  const fixed = fixedAround(c), gaps = gapsAround(c);
  return results => {
    const drops = results.flatMap(r => r.drop ? [r.drop] : []), last = drops[drops.length - 1];
    const open = (p: Point): boolean => inArena(p) && far(p, c, HITBOX + 2.5) &&
      fixed.every(m => far(p, m.p, SPREAD_R)) && (!last || far(p, last, PUDDLE_R + 1));
    if(!toward){
      // H1 shows the west gap first, H2 the east one. Next to a wall a gap can be off the arena,
      // and the last puddle can cover one, so only the open gaps show.
      const pref = bySlot(s, {H1:[3, 1, 0, 2], H2:[1, 3, 0, 2]}).map(i => gaps[i]), shown = gaps.filter(open);
      const label = pref.find(open) ?? nearestTo(pref[0], open) ?? pref[0];
      return {fn:open, label, show:(shown.length ? shown : [label]).map(g => ({c:g, r:6}))};
    }
    const aw = angOf([toward[0] - 50, toward[1] - 50]);
    const fn = (p: Point): boolean => open(p) && apart(p, toward) <= 70;
    // The area: from just outside the hitbox to past the arena edge, 70 degrees each side of the weapon.
    const arc = (r: number, a0: number, a1: number): Point[] => Array.from({length:15}, (_x, i) => POINT_AT(a0 + (a1 - a0) * i / 14, r));
    const poly = [...arc(15, aw - 70, aw + 70), ...arc(75, aw + 70, aw - 70)];
    // The shown spot: well inside that side, turned up to 45 degrees from the weapon toward the
    // last puddle, so the spread is in reach in the 2 seconds after the last puddle.
    const toPuddle = last ? ((angOf([last[0] - 50, last[1] - 50]) - aw + 540) % 360) - 180 : 0;
    const turn = Math.sign(toPuddle) * Math.min(45, Math.abs(toPuddle));
    const label = [turn, turn * 2 / 3, turn / 3, 0].flatMap(t => [26, 32, 22].map(r => POINT_AT(aw + t, r))).concat(gaps).find(fn) ?? toward;
    return {fn, label, show:[{poly}]};
  };
}

/* The stack after the puddles, from Amanda's three rules:
   1. In the boss's max melee range, so the melee keep their uptime.
   2. Off every puddle that is still there: only the last one (see the Comet note above; the
      first two went off and faded, so their ground is free again).
   3. As close as you can get to where you go next: your safe spot for the first weapon, or,
      with no weapon next, one more small step clockwise.
   The area is the band from his hitbox ring out to max melee range, less the last puddle, and of
   that only the part within STACK_SLACK of the spot that is closest to the target. It is drawn
   one degree at a time, so its outline follows the puddle's edge. The spot shown, where the
   moving marker runs, is the one closest to the target that is a yalm inside max melee range
   and a yalm clear of the puddle, so it is not on the area's edge. */
const STACK_SLACK = 10;   // units (4 yalms): how much farther than the closest spot still counts
export function stackNear(target: Point | ((results: StepResult[]) => Point), c: Point = CENTER): (results: StepResult[]) => Zone {
  const ray = (deg: number): Point => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];
  const at = (deg: number, r: number): Point => polar(deg, r, c);
  /** Where the ray at `deg` is inside the circle around q with radius rad: from b - h to b + h
      units along the ray (from solving |c + r * ray - q| = rad for r), or null if it misses. */
  const cross = (deg: number, q: Point, rad: number): [number, number] | null => {
    const u = ray(deg), v: Point = [q[0] - c[0], q[1] - c[1]], b = u[0] * v[0] + u[1] * v[1], disc = b * b - (v[0] * v[0] + v[1] * v[1] - rad * rad);
    return disc > 0 ? [b - Math.sqrt(disc), b + Math.sqrt(disc)] : null;
  };
  const longest = (parts: Array<[number, number]>): Array<[number, number]> => parts.filter(([lo, hi]) => hi - lo > 0.3).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]));
  return results => {
    const T = typeof target === "function" ? target(results) : target;
    // The puddles still on the floor: the last one.
    const drops = results.flatMap(r => r.drop ? [r.drop] : []).slice(-1);
    // Rules 1 and 2 on one ray: the parts of the band that are off that puddle.
    const free = (deg: number): Array<[number, number]> => drops.reduce((parts: Array<[number, number]>, q) => {
      const x = cross(deg, q, PUDDLE_R);
      return x ? longest(parts.flatMap(([lo, hi]): Array<[number, number]> => [[lo, Math.min(hi, x[0])], [Math.max(lo, x[1]), hi]])) : parts;
    }, [[HITBOX, MELEE_R]]);
    // Rule 3: how close to the target the band gets, then everything within STACK_SLACK of that.
    const rays = Array.from({length:360}, (_x, d) => d);
    let best = Infinity;
    for(const d of rays) for(const [lo, hi] of free(d)){
      const u = ray(d), r = Math.max(lo, Math.min(hi, u[0] * (T[0] - c[0]) + u[1] * (T[1] - c[1])));
      best = Math.min(best, dist(at(d, r), T));
    }
    const limit = best + STACK_SLACK;
    const fn = (p: Point): boolean => { const r = dist(p, c); return inArena(p) && r >= HITBOX && r <= MELEE_R && drops.every(q => far(p, q, PUDDLE_R)) && dist(p, T) <= limit; };
    // The area on one ray: its longest free part, cut to what is close enough to the target.
    const area = (deg: number): [number, number] | null => {
      const near = cross(deg, T, limit);
      return near ? longest(free(deg).map(([lo, hi]): [number, number] => [Math.max(lo, near[0]), Math.min(hi, near[1])]))[0] ?? null : null;
    };
    // The outline, one degree at a time from a ray outside the area, so no piece is cut in two.
    const pieces: Point[][] = [];
    let inner: Point[] = [], outer: Point[] = [];
    const flush = (): void => { if(inner.length > 1) pieces.push([...inner, ...outer.reverse()]); inner = []; outer = []; };
    const from = rays.find(d => !area(d)) ?? 0;
    for(const d of rays.map(x => x + from)){
      const f = area(d);
      if(!f){ flush(); continue; }
      inner.push(at(d, f[0])); outer.push(at(d, f[1]));
    }
    flush();
    const ring = rays.map(d => at(d, MELEE_R - 2.5)), byNear = (a: Point, b: Point): number => dist(a, T) - dist(b, T);
    const roomy = (p: Point): boolean => fn(p) && drops.every(q => far(p, q, PUDDLE_R + 2.5));
    const label = ring.filter(roomy).sort(byNear)[0] ?? ring.filter(fn).sort(byNear)[0] ?? at(angOf([T[0] - c[0], T[1] - c[1]]), MELEE_R - 2.5);
    return {fn, label, show:pieces.map(poly => ({poly}))};
  };
}

/* Orbital Omen, simplified to 4 lanes each way. Each set fires one north lane and one east lane.
   Set 2 always crosses in one of the four middle squares. */
export function buildOrbital(): {overlays: Overlay[]; steps: Step[]} {
  // V[i] is the column (0-3) the #(i+1) north portal fires down. H[i] is the row the #(i+1) east portal fires across.
  const outer = shuffle([0, 3]), inner = shuffle([1, 2]);
  const V = [outer[0], inner[0]].concat(shuffle([outer[1], inner[1]]));
  const H = shuffle([1, 2]).concat(shuffle([0, 3]));
  const lane = (n: number, vert: boolean): RectZone => vert ? {rect:[n * 25, 0, n * 25 + 25, 100]} : {rect:[0, n * 25, 100, n * 25 + 25]};
  const inV = (p: Point, n: number): boolean => p[0] >= n * 25 && p[0] <= n * 25 + 25;
  const inH = (p: Point, n: number): boolean => p[1] >= n * 25 && p[1] <= n * 25 + 25;
  /* Hector's dodge: stay in the four middle squares against the boss hitbox and cross it
     to whichever middle square the next lines miss. */
  const mid = (p: Point): boolean => p[0] >= 25 && p[0] <= 75 && p[1] >= 25 && p[1] <= 75;
  const side = (p: Point): boolean => Math.abs(p[0] - 50) > Math.abs(p[1] - 50);
  const misses = (p: Point, sets: number[]): boolean => sets.every(i => !inV(p, V[i]) && !inH(p, H[i]));
  const cellRect = (c: number, r: number): RectZone => ({rect:[c * 25, r * 25, c * 25 + 25, r * 25 + 25]});
  const spot = (c: number, r: number): Point => [c === 1 ? 38 : 62, r === 1 ? 44 : 56];
  const c2 = V[1], r2 = H[1], cOpp = 3 - V[1], r1 = H[0];
  const overlays: Overlay[] = [];
  V.forEach((n, i) => overlays.push({t:"guide", x:n * 25 + 12.5, y:0, x2:n * 25 + 12.5, y2:100}, {t:"portal", x:n * 25 + 12.5, y:2.6, vert:true, n:i + 1}));
  H.forEach((n, i) => overlays.push({t:"guide", x:0, y:n * 25 + 12.5, x2:100, y2:n * 25 + 12.5}, {t:"portal", x:97.4, y:n * 25 + 12.5, vert:false, n:i + 1}));
  const lanes = (sets: number[], soft = false): Overlay[] =>
    sets.flatMap((i): Overlay[] => [{t:"lane", rect:lane(V[i], true).rect, soft}, {t:"lane", rect:lane(H[i], false).rect, soft}]);
  const fireAndFury: Overlay[] = [{t:"poly", pts:[[50, 50], [0, 0], [100, 0]]}, {t:"poly", pts:[[50, 50], [0, 100], [100, 100]]}];
  return {
    overlays,
    steps:[
      {q:"Before the #1 lines and Fire and Fury: where do you stand?",
        z:{fn:p => mid(p) && side(p) && misses(p, [0]), label:spot(c2, r2), show:[cellRect(1, r2), cellRect(2, r2)]},
        a:"Against the boss hitbox at his side, in a middle square the #1 lines miss. Best start: the square where the #2 lines cross.",
        reveal:[...fireAndFury, ...lanes([0])]},
      {q:"The #1 lines and Fire and Fury went off. The #2 lines are next. Where do you go?",
        z:{fn:p => mid(p) && misses(p, [1]), label:spot(cOpp, r1), show:[cellRect(cOpp, r1)]},
        a:"Across the boss hitbox to the opposite middle square. The #2 lines miss it.",
        reveal:lanes([1])},
      {q:"The #2 lines went off. Where do you go now?",
        z:{fn:p => mid(p) && misses(p, [2, 3]), label:spot(c2, r2), show:[{rect:[c2 * 25, 25, c2 * 25 + 25, 75]}]},
        a:"Back across the hitbox, into the column the #2 line already hit. The #3 and #4 lines miss it, so you stay there.",
        reveal:lanes([2, 3], true)}
    ]
  };
}

/* Void Stardust: three puddles, then the spread (Comet) or the stack (Crushing Comet).
   `toward` is the first weapon of the next set when it is a sword or scythe: the spread then
   moves toward it. `safe` is your safe spot for the first weapon of the next set, which the
   stack gets as close to as it can (see stackNear). The second Void Stardust has no weapons
   after it. `c` is where the boss stands, and `start` is the first puddle spot with its answer. */
const NORTH_START = {p:FIRST_PUDDLE, a:"North of the boss, just outside the hitbox."};
function voidSteps(s: Slot, spread: boolean, toward: Point | null, c: Point = CENTER, start = NORTH_START, safe: Point | null = null): Step[] {
  const next = puddleAfter(c);
  return [
    {q:"Where do you drop the first puddle?", z:{c:start.p, r:9}, a:start.a, drop:true},
    {q:"Second puddle?", zf:next, a:"Just outside your first puddle, one small step clockwise.", drop:true},
    {q:"Third puddle?", zf:next, a:"Just outside the second puddle, clockwise again.", drop:true},
    spread
      ? {q:"Puddles done. Comet: everyone spreads, and the tanks and melee go to their fixed spots. Where do you go?",
          zf:cometSpread(s, toward, c), cue:spreadMarks(c),
          a:toward ? "Anywhere on the first weapon's side of the arena (the shaded area), out of the last puddle and not on a tank or melee spot."
                   : "Any open spot. Healers and ranged have no fixed spread spot. Keep away from the tank and melee spots and out of the last puddle."}
      : safe ? {q:"Puddles done. Where does the group stack?", zf:stackNear(safe, c),
          a:"In his max melee range, out of the third puddle (the first two are gone), as close as you can get to your spot for the first weapon (the shaded area)."}
             : {q:"Puddles done. Where does the group stack?", zf:stackNear(res => zoneCenter(next(res)), c),
          a:"In his max melee range, out of the third puddle (the first two are gone), one more small step clockwise (the shaded area)."}];
}

/** Where a step's zone is: the shown spot, for a weapon your safe spot. */
const safeSpot = (st: Step): Point | null => { const z = st.z ?? st.zf?.([]); return z ? zoneCenter(z) : null; };

/* The first Void Stardust runs straight into the second weapon set: the weapons are already
   out, so the party finds the first one early. A sword or scythe first means a sprint, so the
   stack or spread moves toward it. An axe first keeps the usual spots. Then the scene goes on
   through all three weapons of this second set, so one drill covers the whole stretch. */
export function voidIntoWeapons(s: Slot, spread: boolean, A: JumpSet): Scene {
  const first = A.W[0], sprint = first.type !== "axe", where = COMPASS[Math.round(first.a / 45) % 8];
  const steps: Step[] = [
    // A look-ahead: you spot the first weapon now, so you know what to do when the puddles are
    // done, but you go to A for the first puddle, not to the weapon.
    {q:"Before the puddles: which weapon goes first after Void Stardust? Click it.", z:{c:first.p, r:9}, lookAhead:true,
      a:"The " + first.type + ", " + where + ": its flat side is square to the boss. " +
        (sprint ? "A sword or scythe first means a sprint, so the stack or spread moves toward it." : "An axe first means the party stacks in the middle, so the usual spots work.")},
    ...voidSteps(s, spread, sprint ? first.p : null, CENTER, NORTH_START, safeSpot(A.steps[0])),
    // The weapons start here, and the puddles are gone.
    {...A.steps[0], clearDrops:true, q:"The " + (spread ? "spread" : "stack") + " went off. The boss goes to the first weapon. Click where you go.",
      a:A.steps[0].a + " If you cannot make it in time, use Sprint or a movement ability. A scholar can use Expedient for the whole party."}];
  steps.push(...A.steps.slice(1));
  return {
    setup:"The second set of weapons is out, each one facing where he will jump from, and Void Stardust starts. Three puddles drop under every player, one after another. After the third one, this time it is " +
      (spread ? "a spread marker on every player (Comet)." : "a stack on a healer (Crushing Comet).") + " Then the boss goes to the first weapon, and on clockwise to the other two.",
    overlays:A.overlays.map(o => ({...o, spawn:undefined})),   // no fading: these steps are not one per weapon
    // The boss stays in the middle for the pick, the puddles and the stack or spread (5 steps).
    bossAt:n => A.states[Math.max(0, Math.min(n - 5, A.states.length - 1))],
    steps,
    rule:"Find the first weapon before the puddles: flat side square to the boss. Puddles start north, each just outside the last, clockwise. Sword or scythe first: stack or spread toward it, and use Expedient, Sprint or a movement ability if it is far. Then the other two weapons go clockwise, with the normal rule for each." +
      (spread ? " Comet spread fixed spots: MT NW, OT NE, M1 SW, M2 SE." : "")};
}

/* The second Void Stardust: the same puddles, ending the other way from the first one. The boss
   stays on the third weapon of the second set: he does not jump to the middle until Dance of
   Domination (cactbot's "--middle--"). The first puddle drops 2.3 seconds after the third weapon,
   so the group stands at his butt, directly behind him, and drops it there. The puddles then go
   clockwise around him. */
/** The spot directly behind the boss, at his butt, just outside his hitbox. */
export function behind(boss: Boss): Point {
  const f = (boss.f ?? 0) * DEG;
  return [boss.x - OUTSIDE * Math.sin(f), boss.y + OUTSIDE * Math.cos(f)];
}
export function voidAgain(s: Slot, spread: boolean, boss: Boss): Scene {
  const c: Point = [boss.x, boss.y], butt = behind(boss);
  return {
    setup:"Void Stardust again. The boss stays on the third weapon. The group stands at his butt, directly behind him, and drops the first puddle there. Three puddles, then this time " +
      (spread ? "a spread (Comet)." : "a stack on a healer (Crushing Comet).") + " It always ends the other way from the first one.",
    boss, overlays:[], steps:voidSteps(s, spread, null, c, {p:butt, a:"At his butt, directly behind him, just outside the hitbox."}),
    rule:"The boss stays on the third weapon. Puddles start at his butt, each just outside the last, clockwise around him. The second Void Stardust ends the other way from the first."};
}

/** True when a new try at this drill can look different: random parts, a variant or a turn. */
export const changes = (m: Drill): boolean => Boolean(m.random || m.variants || m.rotate);

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
export const SCYTHE_CLEAVES: Overlay[] = [cleave([50, 50], 317, RAW_TANK_HALF), cleave([50, 50], 43, RAW_TANK_HALF), cleave([50, 50], 180, RAW_STACK_HALF)];
const STACK_EDGE = [-1, -0.5, 0, 0.5, 1].map(k => 180 + k * RAW_STACK_HALF);
const SCYTHE_STACK: Zone = {
  fn:p => { const v: Point = [p[0] - 50, p[1] - 50], r = Math.hypot(v[0], v[1]); return r >= 11 && r <= 40 && Math.abs(angOf(v) - 180) <= RAW_STACK_HALF; },
  label:[50, 69], show:[{poly:[...STACK_EDGE.map(a => POINT_AT(a, 11)), ...[...STACK_EDGE].reverse().map(a => POINT_AT(a, 34))]}]};
// TS note: `(x): Overlay => (...)` gives the arrow function a return type. Without it,
// TypeScript would type t as plain string, and "puddle" would not fit the Overlay union.
const NPUD = [22, 34, 46, 58, 70, 82].map((x): Overlay => ({t:"puddle", x, y:5, r:ATOMIC_R}));
const SPUD = [18, 30, 42, 54, 66, 78].map((x): Overlay => ({t:"puddle", x, y:95, r:ATOMIC_R}));
// TS note: the `Drill[]` annotation is what checks every drill below. Each build function
// must return a Scene, so a missing field or a misspelled one is a compile error.
export const DRILLS: readonly Drill[] = [
  {id:"m-raw-axe", order:2, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: axe", kind:"spread",
    build:s=>({setup:"The boss pulls out an axe. The two tanks stack for a shared buster. The other six players each get an AoE, so everyone else spreads.",
      boss:BOSS, overlays:[...heldWeapon("axe"),{t:"mark",x:AXE_TANKS[0] - 3,y:AXE_TANKS[1],l:"MT",r:"T"},{t:"mark",x:AXE_TANKS[0] + 3,y:AXE_TANKS[1],l:"OT",r:"T"}],
      steps:[{q:"Click your spread spot.", z:{c:AXE_SPREAD_SPOTS[s], r:10}, a:bySlot(s, {H1:"South-southwest, far out.", H2:"South-southeast, far out."})}],
      rule:"Raw Steel Trophy (he holds the weapon). Axe: tanks stack, party spreads. Scythe: tanks spread, party stacks."})},
  {id:"m-raw-scythe", order:2.1, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: scythe", kind:"roleStack",
    build:s=>({setup:"The boss pulls out a scythe and cleaves three times: one cone on each tank, and one cone that everyone else shares. So the tanks spread, and the rest of the party stacks.",
      boss:BOSS, overlays:[...heldWeapon("scythe"),{t:"mark",x:37,y:36,l:"MT",r:"T"},{t:"mark",x:63,y:36,l:"OT",r:"T"}],
      steps:[{q:"Click where the party stacks.", z:SCYTHE_STACK, a:"South, directly behind the boss, inside the shared cone.", reveal:SCYTHE_CLEAVES}],
      rule:"Scythe: three cleaves. The tanks spread to the front, and the party stacks behind."})},
  {id:"m-assault", order:3, random:true, follows:{pick:"set1"}, phase:P1, time:"0:48", title:"Assault Evolved: three weapons", kind:"sequence",
    build:(s, _v, pick)=>assaultScene(buildAssault(s, orderFrom(pick)), s)},
  // One drill for the whole stretch: the weapons spawn at 1:13, Void Stardust runs, then the boss
  // takes the same three weapons. A separate drill for the weapons would show a different set.
  {id:"m-void", order:4, random:true, variants:["stack","spread"], follows:{variant:"void", pick:"set2"}, phase:P1, time:"1:13 to 1:45", title:"Void Stardust into the second weapons", kind:"later",
    build:(s, v, pick)=>voidIntoWeapons(s, v === "spread", buildAssault2(s, orderFrom(pick)))},
  {id:"m-dance", order:8.1, rotate:true, phase:P1, time:"2:31", title:"Dance of Domination: pairs", kind:"pairStack",
    build:s=>({setup:"The seven hits are over and the lines are on the floor. Find the side with no outer line. That open side is new south.",
      boss:{x:50, y:50, f:null}, overlays:DANCE_LINES.map((l): Overlay => ({t:"lineaoe", ...l})),
      steps:[{q:"Click your pair spot.", z:{c:DANCE_PAIRS[s], r:5}, a:bySlot(s, {H1:"Relative southwest, the outer spot, with R1.", H2:"Relative southeast, the outer spot, with R2."}),
        // The lines explode as the pairs land (Hurricane Explosion, 10 yalms wide).
        reveal:DANCE_LINES.map((l): Overlay => ({t:"band", ...l, w:HURRICANE_W}))}],
      rule:"Open side = new south. H1 and R1 relative SW, H2 and R2 relative SE."})},
  {id:"m-ultimate", order:11.5, random:true, follows:{pick:"ult"}, phase:P1, time:"3:05 to 3:41", title:"Ultimate Trophy Weapons: six weapons", kind:"sequence",
    build:(s, _v, pick)=>ultimateScene(buildUltimate(s, pick ? pick === "cw" : undefined))},
  {id:"m-tornado", order:12, phase:P1, time:"3:46", title:"Ultimate Trophy Weapons: tornadoes", kind:"bait",
    build:s=>({setup:"The sixth weapon resolved. Four tornadoes sit on the cardinals. Each one cones its two closest players.",
      boss:BOSS, overlays:[{t:"tornado",x:50,y:16},{t:"tornado",x:20,y:50},{t:"tornado",x:80,y:50},{t:"tornado",x:50,y:84}],
      steps:[{q:"Click your tornado bait spot.", z:bySlot(s, {H1:{c:[12,42],r:6.5}, H2:{c:[88,58],r:6.5}}), a:bySlot(s, {H1:"West tornado, on its north side.", H2:"East tornado, on its south side."})}],
      rule:"Supports stand on the left, DPS on the right, as you face in from your tornado."})},
  {id:"m-orbital", order:15, random:true, phase:P2, time:"4:26 and 8:24", title:"Orbital Omen", kind:"dodge",
    build:s=>{ const O = buildOrbital(); return {
      setup:"Orbital Omen. The main tank points the boss north. Portals on the north and east edges fire lines across the arena in the order shown (1 to 4). Fire and Fury cleaves his front and back just after the #1 lines. Use Hector's dodge: stay against his hitbox and cross it to the middle square the next lines miss.",
      boss:BOSS, overlays:O.overlays, steps:O.steps,
      rule:"Hector's dodge: stay against the boss hitbox. Start where the #2 lines cross, at his side. After #1 and Fire and Fury, cross the hitbox to the opposite middle square. After #2, cross back and stay."}; }},
  {id:"m-meteor-1", order:16, phase:P2, time:"5:00", title:"Meteorain: first stack", kind:"wildCharge",
    build:s=>({setup:"Meteorain. The melee bait the first two meteors and drop them inside the boss hitbox, NE and SW. The first line stack goes off next.",
      boss:BOSS, overlays:[{t:"target",x:57,y:43},{t:"target",x:43,y:57},{t:"mark",x:57,y:43,l:"M1",r:"D"},{t:"mark",x:43,y:57,l:"M2",r:"D"}],
      steps:[{q:"Where do you stand for the first line stack?", z:{c:[36,37],r:8}, a:"NW, in the line stack. The tanks stand in front for this first one."}],
      rule:"Meteor bait order: melee, then healers, then ranged."})},
  {id:"m-meteor-2", order:16.1, phase:P2, time:"5:03", title:"Meteorain: your meteor", kind:"bait",
    build:s=>({setup:"Healers bait the second set, and you have a meteor marker. Two rocks are already down inside the boss hitbox: one NE and one SW.",
      boss:BOSS, overlays:[{t:"rock",x:57,y:43},{t:"rock",x:43,y:57}],
      steps:[{q:"Where do you drop your meteor?",
        // S<Zone>: the H1 answer is a rule zone and the H2 answer is a circle, so name the shared type.
        z:bySlot<Zone>(s, {H1:{fn:p => { const r = Math.hypot(p[0] - 50, p[1] - 50), a = angOf([p[0] - 50, p[1] - 50]); return r >= 3 && r <= 11.5 && a >= 285 && a <= 345; },
                label:[43, 43], show:[{poly:[[50, 50], ...[285, 300, 315, 330, 345].map((a): Point => polar(a, 11))]}]}, H2:{c:[26, 74], r:8}}),
        a:bySlot(s, {H1:"Inside the boss hitbox, on his NW side.", H2:"SW, in line with the first SW rock, about halfway to the edge."})}],
      rule:bySlot(s, {H1:"H1 drops NW, inside the boss hitbox.", H2:"H2 drops SW in line with the first rock. That rock already sits inside the hitbox, and two rocks too close together explode, so yours goes farther out."}) + " Icy Veins swaps H1 and H2 here, so do not mix guides."})},
  {id:"m-meteor-3", order:16.2, phase:P2, time:"5:20", title:"Meteorain: third stack", kind:"wildCharge",
    build:s=>({setup:"The ranged bait the third set. The rocks are NW (from H1, inside the hitbox) and two SW in a line. Each stack breaks the rock in front of it.",
      boss:BOSS, overlays:[{t:"rock",x:43,y:43},{t:"rock",x:43,y:57},{t:"rock",x:26,y:74}],
      steps:[{q:"Where do you stand for this line stack?", z:{c:[35,35],r:7}, a:"NW, behind the NW rock (farther from the boss than the rock)."}],
      rule:"Stack behind a rock to break it. Keep the SW line whole."})},
  {id:"m-meteor-4", order:16.3, phase:P2, time:"5:30 to 5:43", title:"Meteorain: last stack, then hide", kind:"wildCharge",
    build:s=>({setup:"The last stack has no meteor baits. The rocks are NE (from R2) and three SW in a line.",
      boss:BOSS, overlays:[{t:"rock",x:57,y:43},{t:"rock",x:43,y:57},{t:"rock",x:26,y:74},{t:"rock",x:10,y:90}],
      steps:[
        {q:"Where do you stand for the fourth line stack?", z:{c:[65,35],r:7}, a:"Behind the NE rock, to blow it up."},
        {q:"Triple Tyrannhilation is next. Where do you hide?", z:{c:[5,96],r:6.5}, a:"SW, behind the line of three rocks."}],
      rule:"After the 4th stack, run SW and hide behind the three rocks."})},
  {id:"m-split-line", order:18, phase:P3, time:"6:02", title:"Arena Split: line up", kind:"knockback",
    build:s=>({setup:"Flatliner knocks everyone back and splits the arena into two platforms.",
      split:true, boss:BOSS, overlays:[],
      steps:[{q:"Click where you line up.", z:bySlot(s, {H1:{rect:[0,8,26,48]}, H2:{rect:[74,52,100,92]}}), a:bySlot(s, {H1:"West platform (G1), north end. Supports go NW.", H2:"East platform (G2), south end. Supports go SE."})}],
      rule:"G1 west, G2 east. Supports NW and SE, DPS SW and NE. Hector's video puts tanks and ranged north, healers and melee south, so ask your lead which one you use."})},
  {id:"m-split-tower", order:19, phase:P3, time:"6:29", title:"Arena Split: first towers", kind:"towerKnockback",
    build:s=>({setup:"Four towers appear, two on each platform. Every player takes a tower.",
      split:true, boss:BOSS, overlays:[{t:"tower",x:11,y:23},{t:"tower",x:89,y:23},{t:"tower",x:11,y:77},{t:"tower",x:89,y:77}],
      steps:[{q:"Which tower do you take?", z:bySlot(s, {H1:{c:[11,23],r:TOWER_R}, H2:{c:[89,77],r:TOWER_R}}), a:bySlot(s, {H1:"The NW tower, with the MT.", H2:"The SE tower, with the OT."})}],
      rule:"Tethered: get knocked to the other platform. Not tethered: get knocked to the same platform."})},
  {id:"m-ecl-start", order:26, phase:P4, time:"8:54", title:"Ecliptic Stampede: start", kind:"bait",
    build:s=>({setup:"Ecliptic Stampede. The melee and tanks stack under the boss. The ranged and healers stay out to bait the markers.",
      boss:BOSS, overlays:[{t:"mark",x:25,y:25,l:"R1",r:"D"},{t:"mark",x:75,y:25,l:"R2",r:"D"}],
      steps:[{q:"Where do you stand?", z:bySlot(s, {H1:{c:[25,74],r:9}, H2:{c:[75,74],r:9}}), a:bySlot(s, {H1:"Southwest, outside.", H2:"Southeast, outside."})}],
      rule:"Marked? Go to the safe corner on your wall. Two marked on one side? The one closer to the proximity AoE moves."})},
  {id:"m-ecl-two", order:26.5, variants:["north","south"], follows:{variant:"wall"}, phase:P4, time:"9:31", title:"Ecliptic Stampede: Two-way Fireball", kind:"lineStack",
    build:(_s, v)=>({setup:"You were marked and dropped your puddles along the " + (v ?? "north").toUpperCase() + " wall. Now the boss casts Two-way Fireball: two line stacks, east and west.",
      boss:BOSS, overlays:[...NPUD, ...SPUD],
      steps:[{q:"Which line stack do you join? Click it.", z: v === "south" ? {rect:[60,43,84,57]} : {rect:[16,43,40,57]}, a: v === "south" ? "The east line stack." : "The west line stack.",
        reveal:[lineTo([50, 50], [0, 50]), lineTo([50, 50], [100, 50])]}],
      rule:"Two-way: north puddles = west, south puddles = east."})},
  {id:"m-ecl-four", order:26.6, variants:["north","south"], follows:{variant:"wall"}, phase:P4, time:"9:31", title:"Ecliptic Stampede: Four-way Fireball", kind:"pairStack",
    build:(_s, v)=>({setup:"You were marked and dropped your puddles along the " + (v ?? "north").toUpperCase() + " wall. Now the boss casts Four-way Fireball: two-player stacks on the four closest.",
      boss:BOSS, overlays:[...NPUD, ...SPUD],
      steps:[{q:"Where do you bait?", z: v === "south" ? {c:[57,43],r:5.5} : {c:[43,43],r:5.5}, a: v === "south" ? "NE, on the boss hitbox ring." : "NW, on the boss hitbox ring.",
        // Four line stacks from the boss through the four closest pairs: NW, NE, SW and SE.
        reveal:[315, 45, 225, 135].map(a => lineTo([50, 50], POINT_AT(a, 10)))}],
      rule:"Four-way: north puddles = NW, south puddles = NE. M1 is always SW, M2 always SE."})}
];
