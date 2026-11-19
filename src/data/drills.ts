// Map drills: the arena scenes and the rules that decide each answer zone.
import { S, shuffle, random } from "../util";
import { P1, P2, P3, P4 } from "./timeline";
import { DEG, unit, vadd, leftOf, angOf, inArena, COMPASS } from "../geometry";
import { HITBOX, SWORD_HALF, SPREAD_R, PUDDLE_R, PROTEAN_HALF, PROTEAN_LEN, TOWER_R, ATOMIC_R, RAW_TANK_HALF, RAW_STACK_HALF, SCYTHE_SAFE, HURRICANE_W, axeHit, cleave, donut, lineTo, safeRing, swordCross, swordPocket } from "./attacks";
import type { Boss, MapDrill, Overlay, Point, RectZone, Scene, Slot, Step, StepResult, Zone } from "../types";

export type WeaponType = "axe" | "sword" | "scythe";
/** One weapon in a jump run. `a` is its direction from the arena center, in degrees clockwise from north.
    `axis`, when set, turns the icon: it is the long side, from the handle end to the tip. */
export interface Weapon { a: number; p: Point; type: WeaponType; where?: string; tornado?: boolean; axis?: Point }
/** Everything a jump-run drill needs: the weapons, where the boss stands after each jump, the steps and the drawing. */
export interface Run { W: Weapon[]; states: Boss[]; steps: Step[]; overlays: Overlay[] }

const WEAPON_TYPES: WeaponType[] = ["axe", "sword", "scythe"];
const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
/** A weapon spot: 29 units from the arena center, `a` degrees clockwise from north. */
export const atAngle = (a: number): Point => [50 + 29 * Math.sin(a * DEG), 50 - 29 * Math.cos(a * DEG)];
/** Just outside the boss's hitbox: where the first puddle and his butt spot are. */
const OUTSIDE = HITBOX + 4.5;
/** The first Void Stardust puddle: north of the boss, just outside his hitbox. */
export const FIRST_PUDDLE: Point = [50, 50 - OUTSIDE];

/* A jump run: the boss starts in the middle and jumps to each weapon in order.
   He faces the way he jumped, so relative north at each weapon = his travel direction. */
export function buildRun(s: Slot, W: Weapon[]): Run {
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
    if(w.type === "scythe"){
      const u = scytheAxis(w, i), d: Point = [u[1], -u[0]];
      // A turned scythe can face any way, so its label goes outward, clear of the waymarks.
      const tag = w.axis ? vadd(w.p, unit([w.p[0] - 50, w.p[1] - 50]), 14) : vadd(w.p, d, -9);
      overlays.push({t:"scythe", spawn:i, x:w.p[0], y:w.p[1], ux:u[0], uy:u[1], dx:d[0], dy:d[1]}, {t:"tag", spawn:i, x:tag[0], y:tag[1], s:"SCYTHE"});
    } else {
      // A turned icon or the upright sword reaches farther, so the label sits farther out.
      const out = vadd(w.p, unit([w.p[0] - 50, w.p[1] - 50]), w.axis ? 13 : w.type === "sword" ? 12.5 : 7.5);
      const turn = w.axis ? {ux:w.axis[0], uy:w.axis[1]} : {};
      overlays.push({t:"tag", spawn:i, x:out[0], y:out[1], s:w.type.toUpperCase()}, {t:w.type, spawn:i, x:w.p[0], y:w.p[1], ...turn});
    }
  });
  const HW = SWORD_HALF, side = S(s, 1, -1), own = S(s, "left", "right");
  const steps = W.map((w, i): Step => {
    const st = states[i + 1], P: Point = [st.x, st.y], d = dirs[i], L = leftOf(d), sv: Point = [L[0] * side, L[1] * side];
    const where = w.where || COMPASS[Math.round(w.a / 45) % 8];
    let z: Zone, a: string, reveal: Overlay[], stand: Point | undefined;
    if(w.type === "axe"){
      z = {c:vadd(P, unit([50 - P[0], 50 - P[1]]), 28), r:7};
      a = "Axe, " + where + ": stack with the whole party in the middle, outside the axe AoE.";
      reveal = [axeHit(P)];
    } else if(w.type === "scythe"){
      // H1 at the butt end, H2 at the point end, as the scythe is drawn.
      z = {c:vadd(P, scytheAxis(w, i), -9.5 * side), r:5};
      a = "Scythe, " + where + ": close in at the " + S(s, "butt (the handle end)", "point (the blade end)") + " of the scythe.";
      // Proteans: a cone on every player, so each player takes a clock spot close around him.
      // The point and the butt (H2 and H1) are two of the eight spots, opposite each other.
      const pointAt = angOf(scytheAxis(w, i));
      // And a donut: only close to him is safe, so the clock spots are close in. The safe circle
      // shows in green and stays clear, as the donut's telegraph does in the game. The cones run
      // out from its edge, so you can see each player's lane.
      reveal = [donut(P, SCYTHE_SAFE), safeRing(P, SCYTHE_SAFE),
        ...Array.from({length:8}, (_x, k) => cleave(P, pointAt + k * 45, PROTEAN_HALF, PROTEAN_LEN, SCYTHE_SAFE))];
    } else {
      // Safe pocket: behind him (f < -HW) and on your side (sd > HW), outside both arms of the
      // cross. Anywhere in it inside the arena is right, and the drawn pocket is the same area.
      const fn = (p: Point): boolean => { const v: Point = [p[0] - P[0], p[1] - P[1]], f = v[0] * d[0] + v[1] * d[1], sd = v[0] * sv[0] + v[1] * sv[1]; return inArena(p) && f < -HW && sd > HW; };
      const poly = swordPocket(P, d, sv);
      // Where to stand: on the pocket's diagonal, 2 yalms (5 units) clear of each arm, so in the
      // moment you can see that you are safe. That is about 25 units (9.9 yalms) from him. The
      // sword's stack is a line from him through you, so the melee can stand closer in that line.
      const CLEAR = 5;
      stand = vadd(vadd(P, d, -(HW + CLEAR)), sv, HW + CLEAR);
      z = {fn, show:[{poly}], label:vadd(P, unit(vadd([-d[0], -d[1]], sv)), (HW + CLEAR) * Math.SQRT2 + 4)};
      a = "Sword, " + where + ": the pocket behind him on his " + own + ", on the side he jumped from, a few steps in from its inner corner. " + S(s, "G1", "G2") + " stacks on you.";
      reveal = swordCross(P, d);
    }
    const leave: Overlay | null = w.tornado ? {t:"tornado", x:P[0], y:P[1]} : null;
    return {q:ORDINALS[i] + " weapon: click where you go.", z, a, reveal, leave, stand};
  });
  return {W, states, steps, overlays};
}

/* Assault Evolved: three weapons. The boss faces the first, then goes clockwise.
   `order` forces the weapon types in the order he takes them (Real time choices); without it,
   the order is random. */
export function buildAssault(s: Slot, order?: WeaponType[]): Run {
  return buildRun(s, assaultWeapons(order));
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
export function buildAssault2(s: Slot, order?: WeaponType[]): Run {
  const W = faceApproach(assaultWeapons(order));
  // The weapons used to get a random turn and flip. Those random numbers are still drawn, so a
  // fight code made before this change builds the rest of the fight the same way.
  for(let i = 0; i < W.length; i++){ if(i){ random(); random(); } random(); }
  const run = buildRun(s, W);
  run.states[0].f = null;
  return run;
}

/* Ultimate Trophy Weapons: six weapons, resolved in spawn order.
   The first spawns south, slightly west (then clockwise) or slightly east (then counterclockwise).
   The second spawns northwest or northeast. The rest sit on cardinals.
   The first three are all different, and so are the last three. The last four leave tornadoes. */
export function buildUltimate(s: Slot, forceCw?: boolean): Run & {cw: boolean} {
  // The coin is always tossed, so a forced direction leaves the other random calls in place.
  const toss = random() < 0.5, cw = forceCw ?? toss;
  const angles = cw ? [200, 315, 90, 180, 270, 0] : [160, 45, 270, 180, 90, 0];
  const names = cw ? ["south, slightly west", "northwest", "east", "south", "west", "north"]
                   : ["south, slightly east", "northeast", "west", "south", "east", "north"];
  const types = shuffle([...WEAPON_TYPES]).concat(shuffle([...WEAPON_TYPES]));
  const run = buildRun(s, angles.map((a, i): Weapon => ({a, p:atAngle(a), type:types[i], where:names[i], tornado:i >= 2})));
  run.states[0].f = null;   // no facing arrow, so the spawn order is the only clue
  return {...run, cw};
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

/* The scenes around a weapon run. The drill list and the Real time fight both use them, so a
   fight can pass in a run built with the player's choices. */
export function assaultScene(A: Run, s: Slot): Scene {
  return {
    setup:"Three weapons are on the floor. The boss is in the middle, and the red arrow points at the weapon he faces. He jumps to that one first, then goes clockwise. For the sword, watch where he jumps from. For the scythe, read the weapon: the butt has the round knob, the point is the blade end.",
    overlays:A.overlays,
    bossAt:n => A.states[Math.min(n, A.states.length - 1)],
    steps:A.steps,
    rule:"First = the weapon he faces, then clockwise. Sword: the pocket on the side he jumped from, " + S(s, "G1 on his left", "G2 on his right") + ", a few steps in from its inner corner. Scythe: " + S(s, "H1 at the butt", "H2 at the point") + ", close in. Axe: stack in the middle."};
}
export function ultimateScene(U: Run): Scene {
  return {
    setup:"Everyone is at 1 HP after Charybdistopia. Six weapons spawn one after another, and the boss resolves them in spawn order. He starts on the first weapon before the last ones spawn: three show now, and each hit brings in the next one. Watch where the first one spawns: south and slightly west means clockwise, south and slightly east means counterclockwise.",
    spawnPlay:true, spawnAhead:3, overlays:U.overlays, bossAt:n => U.states[Math.min(n, U.states.length - 1)], steps:U.steps,
    rule:"First weapon south: slightly west = clockwise, slightly east = counterclockwise. The second is NW or NE, then the cardinals. Use the normal rule for each weapon."};
}

/* Void Stardust: each puddle goes just outside the previous one, one small step clockwise
   around the boss at c. The next spot is judged from where the last puddle actually dropped. */
const CENTER: Point = [50, 50];
export function puddleAfter(c: Point = CENTER): (results: StepResult[]) => Zone {
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
    // Next to a wall the ideal spot can be off the arena. Then the shown spot is the nearest right one.
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
   Each puddle goes off once, 3 seconds after it drops, so by the stack or spread all three are
   gone. Only the last one matters: you leave it as it goes off, on the way to your spot. */
const FIXED_SPREAD: {l: string; r: "T" | "D"; off: Point}[] = [
  {l:"MT", r:"T", off:[-15, -15]}, {l:"OT", r:"T", off:[15, -15]}, {l:"M1", r:"D", off:[-15, 15]}, {l:"M2", r:"D", off:[15, 15]}];
/** The tank and melee spread spots around a boss at c. */
const fixedAround = (c: Point): Array<{l: string; r: "T" | "D"; p: Point}> => FIXED_SPREAD.map(m => ({...m, p:vadd(c, m.off)}));
export const spreadMarks = (c: Point = CENTER): Overlay[] => fixedAround(c).map((m): Overlay => ({t:"mark", x:m.p[0], y:m.p[1], l:m.l, r:m.r}));
export const FIXED_SPREAD_MARKS = spreadMarks();
/** The open ground north, east, south and west of a boss at c, between the fixed spots. Any of
    them is a good spread spot. */
const gapsAround = (c: Point): Point[] => ([[0, -33], [33, 0], [0, 33], [-33, 0]] as Point[]).map(o => vadd(c, o));
const far = (p: Point, q: Point, d: number): boolean => Math.hypot(p[0] - q[0], p[1] - q[1]) >= d;
const dist = (p: Point, q: Point): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
/** Degrees between two spots, as seen from the arena center (0 to 180). */
const apart = (p: Point, q: Point): number => { const d = Math.abs(angOf([p[0] - 50, p[1] - 50]) - angOf([q[0] - 50, q[1] - 50])) % 360; return Math.min(d, 360 - d); };

/* With `toward` set (a sword or scythe goes first next), the spread spot can be anywhere on
   that weapon's side of the arena, so the run to it is short. That side shows as one shaded
   area. Any spot in it is right if it is out of the hitbox, out of the last puddle and not on a
   tank or melee spot. A spread is 6 yalms (15 units), so a spot closer than that to a tank or
   melee spot hits them. */
const POINT_AT = (deg: number, r: number): Point => [50 + r * Math.sin(deg * DEG), 50 - r * Math.cos(deg * DEG)];
export function cometSpread(s: Slot, toward: Point | null = null, c: Point = CENTER): (results: StepResult[]) => Zone {
  const fixed = fixedAround(c), gaps = gapsAround(c);
  return results => {
    const drops = results.flatMap(r => r.drop ? [r.drop] : []), last = drops[drops.length - 1];
    const open = (p: Point): boolean => inArena(p) && far(p, c, HITBOX + 2.5) &&
      fixed.every(m => far(p, m.p, SPREAD_R)) && (!last || far(p, last, PUDDLE_R + 1));
    if(!toward){
      // H1 shows the west gap first, H2 the east one. Next to a wall a gap can be off the arena,
      // and the last puddle can cover one, so only the open gaps show.
      const pref = S(s, [3, 1, 0, 2], [1, 3, 0, 2]).map(i => gaps[i]), shown = gaps.filter(open);
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

/* The stack after the third puddle when a sword or scythe goes first next: the group moves
   from the third puddle toward that weapon. Any spot out of the third puddle and the hitbox,
   within a short move of the third puddle and clearly closer to the weapon, is right, right
   up to the weapon itself. The spot shown is the one in reach that is closest to the weapon,
   but it stops short of the weapon, so it does not hide under the weapon's icon. */
export function stackToward(w: Point): (results: StepResult[]) => Zone {
  return results => {
    const q: Point = results[results.length - 1].drop ?? [50, 33];
    const fn = (p: Point): boolean => inArena(p) && far(p, [50, 50], HITBOX + 1.5) && far(p, q, PUDDLE_R) &&
      dist(p, q) <= PUDDLE_R + 16 && dist(p, w) <= dist(q, w) - 4;
    let label: Point = q, best = Infinity;
    for(let x = 0; x <= 100; x += 1.5) for(let y = 0; y <= 100; y += 1.5){
      const p: Point = [x, y];
      if(dist(p, q) <= PUDDLE_R + 10 && fn(p) && far(p, w, 8) && dist(p, w) < best){ best = dist(p, w); label = p; }
    }
    return {fn, label, show:[{c:label, r:5}]};
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
   `toward` is the first weapon of the next set when it is a sword or scythe: the stack or
   spread then moves toward it. The second Void Stardust has no weapons after it.
   `c` is where the boss stands, and `start` is the first puddle spot with its answer. */
const NORTH_START = {p:FIRST_PUDDLE, a:"North of the boss, just outside the hitbox."};
function voidSteps(s: Slot, spread: boolean, toward: Point | null, c: Point = CENTER, start = NORTH_START): Step[] {
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
      : toward ? {q:"Puddles done. Where does the group stack?", zf:stackToward(toward), a:"From the third puddle, move toward the first weapon, out of that puddle."}
               : {q:"Puddles done. Where does the group stack?", zf:next, a:"Just outside the third puddle, one more small step clockwise."}];
}

/* The first Void Stardust runs straight into the second weapon set: the weapons are already
   out, so the party finds the first one early. A sword or scythe first means a run, so the
   stack or spread moves toward it. An axe first keeps the usual spots. Then the scene goes on
   through all three weapons of this second set, so one drill covers the whole stretch. */
export function voidIntoWeapons(s: Slot, spread: boolean, A: Run): Scene {
  const first = A.W[0], run = first.type !== "axe", where = COMPASS[Math.round(first.a / 45) % 8];
  const steps: Step[] = [
    // A look-ahead: you spot the first weapon now, so you know what to do when the puddles are
    // done, but you go to A for the first puddle, not to the weapon.
    {q:"Before the puddles: which weapon goes first after Void Stardust? Click it.", z:{c:first.p, r:9}, look:true,
      a:"The " + first.type + ", " + where + ": its flat side is square to the boss. " +
        (run ? "A sword or scythe first means a run, so the stack or spread moves toward it." : "An axe first means the party stacks in the middle, so the usual spots work.")},
    ...voidSteps(s, spread, run ? first.p : null),
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
   so the group stands at his butt, right behind him, and drops it there. The puddles then go
   clockwise around him. */
/** The spot right behind the boss, at his butt, just outside his hitbox. */
export function behind(boss: Boss): Point {
  const f = (boss.f ?? 0) * DEG;
  return [boss.x - OUTSIDE * Math.sin(f), boss.y + OUTSIDE * Math.cos(f)];
}
export function voidAgain(s: Slot, spread: boolean, boss: Boss): Scene {
  const c: Point = [boss.x, boss.y], butt = behind(boss);
  return {
    setup:"Void Stardust again. The boss stays on the third weapon. The group stands at his butt, right behind him, and drops the first puddle there. Three puddles, then this time " +
      (spread ? "a spread (Comet)." : "a stack on a healer (Crushing Comet).") + " It always ends the other way from the first one.",
    boss, overlays:[], steps:voidSteps(s, spread, null, c, {p:butt, a:"At his butt, right behind him, just outside the hitbox."}),
    rule:"The boss stays on the third weapon. Puddles start at his butt, each just outside the last, clockwise around him. The second Void Stardust ends the other way from the first."};
}

/** True when a new run of this drill can look different: random parts, a variant or a turn. */
export const changes = (m: MapDrill): boolean => Boolean(m.random || m.variants || m.rotate);

/* ---------- map drills ---------- */
export const BOSS: Boss = {x:50, y:50, f:0};
/** Where the name of the weapon the boss holds goes, below the weapon. */
export const HELD_TAG: Point = [75, 58.5];   // below waymark B, clear of the M2 axe spread spot
/** The weapon the boss holds for Raw Steel Trophy: the same icon as the weapons on the floor,
    upright at his east side just outside his hitbox, with the head or blade turned east. */
export function heldWeapon(type: WeaponType): Overlay[] {
  const x = 63, y = 50;
  // TS note: `t:type` is "axe" or "sword" here. TypeScript checks the object against both
  // matching members of the Overlay union, so one line covers both weapons.
  const icon: Overlay = type === "scythe" ? {t:"scythe", x, y, ux:0, uy:-1, dx:1, dy:0} : {t:type, x, y, ux:0, uy:-1};
  return [icon, {t:"tag", x:HELD_TAG[0], y:HELD_TAG[1], s:type.toUpperCase()}];
}
/* Raw Steel Trophy, axe: the tanks stack in front of the boss for a shared buster, and the other
   six spread, as on wtfdig (Toxic): the melee just outside his hitbox SW and SE, the ranged at the
   west and east walls, and the healers far out south-southwest and south-southeast. The drill and
   the Mechanics pictures both use these spots. */
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
export const NPUD = [22, 34, 46, 58, 70, 82].map((x): Overlay => ({t:"puddle", x, y:5, r:ATOMIC_R}));
export const SPUD = [18, 30, 42, 54, 66, 78].map((x): Overlay => ({t:"puddle", x, y:95, r:ATOMIC_R}));
// TS note: the `MapDrill[]` annotation is what checks every drill below. Each build function
// must return a Scene, so a missing field or a misspelled one is a compile error.
export const MAPS: MapDrill[] = [
  {id:"m-raw-axe", order:2, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: axe",
    build:s=>({setup:"The boss pulls out an axe. The two tanks stack for a shared buster. The other six players each get an AoE, so everyone else spreads.",
      boss:BOSS, overlays:[...heldWeapon("axe"),{t:"mark",x:AXE_TANKS[0] - 3,y:AXE_TANKS[1],l:"MT",r:"T"},{t:"mark",x:AXE_TANKS[0] + 3,y:AXE_TANKS[1],l:"OT",r:"T"}],
      steps:[{q:"Click your spread spot.", z:{c:AXE_SPREAD_SPOTS[s], r:10}, a:S(s,"South-southwest, far out.","South-southeast, far out.")}],
      rule:"Axe: tanks stack, party spreads. Scythe: tanks spread, party stacks."})},
  {id:"m-raw-scythe", order:2.1, phase:P1, time:"0:18 or 2:36", title:"Raw Steel Trophy: scythe",
    build:s=>({setup:"The boss pulls out a scythe and cleaves three times: one cone on each tank, and one cone that everyone else shares. So the tanks spread, and the rest of the party stacks.",
      boss:BOSS, overlays:[...heldWeapon("scythe"),{t:"mark",x:37,y:36,l:"MT",r:"T"},{t:"mark",x:63,y:36,l:"OT",r:"T"}],
      steps:[{q:"Click where the party stacks.", z:SCYTHE_STACK, a:"South, right behind the boss, inside the shared cone.", reveal:SCYTHE_CLEAVES}],
      rule:"Scythe: three cleaves. The tanks spread to the front, and the party stacks behind."})},
  {id:"m-assault", order:3, random:true, follows:{pick:"set1"}, phase:P1, time:"0:48", title:"Assault Evolved: three weapons",
    build:(s, _v, pick)=>assaultScene(buildAssault(s, orderFrom(pick)), s)},
  // One drill for the whole stretch: the weapons spawn at 1:13, Void Stardust runs, then the boss
  // takes the same three weapons. A separate drill for the weapons would show a different set.
  {id:"m-void", order:4, random:true, variants:["stack","spread"], follows:{variant:"void", pick:"set2"}, phase:P1, time:"1:13 to 1:45", title:"Void Stardust into the second weapons",
    build:(s, v, pick)=>voidIntoWeapons(s, v === "spread", buildAssault2(s, orderFrom(pick)))},
  {id:"m-dance", order:8.1, rotate:true, phase:P1, time:"2:31", title:"Dance of Domination: pairs",
    build:s=>({setup:"The seven hits are over and the lines are on the floor. Find the side with no outer line. That open side is new south.",
      boss:{x:50, y:50, f:null}, overlays:DANCE_LINES.map((l): Overlay => ({t:"lineaoe", ...l})),
      steps:[{q:"Click your pair spot.", z:{c:DANCE_PAIRS[s], r:5}, a:S(s,"Relative southwest, the outer spot, with R1.","Relative southeast, the outer spot, with R2."),
        // The lines explode as the pairs land (Hurricane Explosion, 10 yalms wide).
        reveal:DANCE_LINES.map((l): Overlay => ({t:"band", ...l, w:HURRICANE_W}))}],
      rule:"Open side = new south. H1 and R1 relative SW, H2 and R2 relative SE."})},
  {id:"m-ultimate", order:11.5, random:true, follows:{pick:"ult"}, phase:P1, time:"3:05 to 3:41", title:"Ultimate Trophy Weapons: six weapons",
    build:(s, _v, pick)=>ultimateScene(buildUltimate(s, pick ? pick === "cw" : undefined))},
  {id:"m-tornado", order:12, phase:P1, time:"3:46", title:"Ultimate Trophy Weapons: tornadoes",
    build:s=>({setup:"The sixth weapon resolved. Four tornadoes sit on the cardinals. Each one cones its two closest players.",
      boss:BOSS, overlays:[{t:"tornado",x:50,y:16},{t:"tornado",x:20,y:50},{t:"tornado",x:80,y:50},{t:"tornado",x:50,y:84}],
      steps:[{q:"Click your tornado bait spot.", z:S(s,{c:[12,42],r:6.5},{c:[88,58],r:6.5}), a:S(s,"West tornado, on its north side.","East tornado, on its south side.")}],
      rule:"Supports stand on the left, DPS on the right, as you face in from your tornado."})},
  {id:"m-orbital", order:15, random:true, phase:P2, time:"4:26 and 8:24", title:"Orbital Omen",
    build:s=>{ const O = buildOrbital(); return {
      setup:"Orbital Omen. The main tank points the boss north. Portals on the north and east edges fire lines across the arena in the order shown (1 to 4). Fire and Fury cleaves his front and back right after the #1 lines. Use Hector's dodge: stay against his hitbox and cross it to the middle square the next lines miss.",
      boss:BOSS, overlays:O.overlays, steps:O.steps,
      rule:"Hector's dodge: stay against the boss hitbox. Start where the #2 lines cross, at his side. After #1 and Fire and Fury, cross the hitbox to the opposite middle square. After #2, cross back and stay."}; }},
  {id:"m-meteor-1", order:16, phase:P2, time:"5:00", title:"Meteorain: first stack",
    build:s=>({setup:"Meteorain. The melee bait the first two meteors and drop them inside the boss hitbox, NE and SW. The first line stack goes off next.",
      boss:BOSS, overlays:[{t:"target",x:57,y:43},{t:"target",x:43,y:57},{t:"mark",x:57,y:43,l:"M1",r:"D"},{t:"mark",x:43,y:57,l:"M2",r:"D"}],
      steps:[{q:"Where do you stand for the first line stack?", z:{c:[36,37],r:8}, a:"NW, in the line stack. The tanks stand in front for this first one."}],
      rule:"Meteor bait order: melee, then healers, then ranged."})},
  {id:"m-meteor-2", order:16.1, phase:P2, time:"5:03", title:"Meteorain: your meteor",
    build:s=>({setup:"Healers bait the second set, and you have a meteor marker. Two rocks are already down inside the boss hitbox: one NE and one SW.",
      boss:BOSS, overlays:[{t:"rock",x:57,y:43},{t:"rock",x:43,y:57}],
      steps:[{q:"Where do you drop your meteor?",
        // S<Zone>: the H1 answer is a rule zone and the H2 answer is a circle, so name the shared type.
        z:S<Zone>(s, {fn:p => { const r = Math.hypot(p[0] - 50, p[1] - 50), a = angOf([p[0] - 50, p[1] - 50]); return r >= 3 && r <= 11.5 && a >= 285 && a <= 345; },
                label:[43, 43], show:[{poly:[[50, 50], ...[285, 300, 315, 330, 345].map((a): Point => [50 + 11 * Math.sin(a * DEG), 50 - 11 * Math.cos(a * DEG)])]}]},
               {c:[26, 74], r:8}),
        a:S(s, "Inside the boss hitbox, on his NW side.", "SW, in line with the first SW rock, about halfway to the edge.")}],
      rule:S(s, "H1 drops NW, inside the boss hitbox.", "H2 drops SW in line with the first rock. That rock already sits inside the hitbox, and two rocks too close together explode, so yours goes farther out.") + " Icy Veins swaps H1 and H2 here, so do not mix guides."})},
  {id:"m-meteor-3", order:16.2, phase:P2, time:"5:20", title:"Meteorain: third stack",
    build:s=>({setup:"The ranged bait the third set. The rocks are NW (from H1, inside the hitbox) and two SW in a line. Each stack breaks the rock in front of it.",
      boss:BOSS, overlays:[{t:"rock",x:43,y:43},{t:"rock",x:43,y:57},{t:"rock",x:26,y:74}],
      steps:[{q:"Where do you stand for this line stack?", z:{c:[35,35],r:7}, a:"NW, behind the NW rock (farther from the boss than the rock)."}],
      rule:"Stack behind a rock to break it. Keep the SW line whole."})},
  {id:"m-meteor-4", order:16.3, phase:P2, time:"5:30 to 5:43", title:"Meteorain: last stack, then hide",
    build:s=>({setup:"The last stack has no meteor baits. The rocks are NE (from R2) and three SW in a line.",
      boss:BOSS, overlays:[{t:"rock",x:57,y:43},{t:"rock",x:43,y:57},{t:"rock",x:26,y:74},{t:"rock",x:10,y:90}],
      steps:[
        {q:"Where do you stand for the fourth line stack?", z:{c:[65,35],r:7}, a:"Behind the NE rock, to blow it up."},
        {q:"Triple Tyrannhilation is next. Where do you hide?", z:{c:[5,96],r:6.5}, a:"SW, behind the line of three rocks."}],
      rule:"After the 4th stack, run SW and hide behind the three rocks."})},
  {id:"m-split-line", order:18, phase:P3, time:"6:02", title:"Arena Split: line up",
    build:s=>({setup:"Flatliner knocks everyone back and splits the arena into two platforms.",
      split:true, boss:BOSS, overlays:[],
      steps:[{q:"Click where you line up.", z:S(s,{rect:[0,8,26,48]},{rect:[74,52,100,92]}), a:S(s,"West platform (G1), north end. Supports go NW.","East platform (G2), south end. Supports go SE.")}],
      rule:"G1 west, G2 east. Supports NW and SE, DPS SW and NE. Hector's video puts tanks and ranged north, healers and melee south, so ask your lead which one you use."})},
  {id:"m-split-tower", order:19, phase:P3, time:"6:29", title:"Arena Split: first towers",
    build:s=>({setup:"Four towers appear, two on each platform. Every player takes a tower.",
      split:true, boss:BOSS, overlays:[{t:"tower",x:11,y:23},{t:"tower",x:89,y:23},{t:"tower",x:11,y:77},{t:"tower",x:89,y:77}],
      steps:[{q:"Which tower do you take?", z:S(s,{c:[11,23],r:TOWER_R},{c:[89,77],r:TOWER_R}), a:S(s,"The NW tower, with the MT.","The SE tower, with the OT.")}],
      rule:"Tethered: get knocked to the other platform. Not tethered: get knocked to the same platform."})},
  {id:"m-ecl-start", order:26, phase:P4, time:"8:54", title:"Ecliptic Stampede: start",
    build:s=>({setup:"Ecliptic Stampede. The melee and tanks stack under the boss. The ranged and healers stay out to bait the markers.",
      boss:BOSS, overlays:[{t:"mark",x:25,y:25,l:"R1",r:"D"},{t:"mark",x:75,y:25,l:"R2",r:"D"}],
      steps:[{q:"Where do you stand?", z:S(s,{c:[25,74],r:9},{c:[75,74],r:9}), a:S(s,"Southwest, outside.","Southeast, outside.")}],
      rule:"Marked? Go to the safe corner on your wall. Two marked on one side? The one closer to the proximity AoE moves."})},
  {id:"m-ecl-two", order:26.5, variants:["north","south"], follows:{variant:"wall"}, phase:P4, time:"9:31", title:"Ecliptic Stampede: Two-way Fireball",
    build:(_s, v)=>({setup:"You were marked and dropped your puddles along the " + (v ?? "north").toUpperCase() + " wall. Now the boss casts Two-way Fireball: two line stacks, east and west.",
      boss:BOSS, overlays:[...NPUD, ...SPUD],
      steps:[{q:"Which line stack do you join? Click it.", z: v === "south" ? {rect:[60,43,84,57]} : {rect:[16,43,40,57]}, a: v === "south" ? "The east line stack." : "The west line stack.",
        reveal:[lineTo([50, 50], [0, 50]), lineTo([50, 50], [100, 50])]}],
      rule:"Two-way: north puddles = west, south puddles = east."})},
  {id:"m-ecl-four", order:26.6, variants:["north","south"], follows:{variant:"wall"}, phase:P4, time:"9:31", title:"Ecliptic Stampede: Four-way Fireball",
    build:(_s, v)=>({setup:"You were marked and dropped your puddles along the " + (v ?? "north").toUpperCase() + " wall. Now the boss casts Four-way Fireball: two-player stacks on the four closest.",
      boss:BOSS, overlays:[...NPUD, ...SPUD],
      steps:[{q:"Where do you bait?", z: v === "south" ? {c:[57,43],r:5.5} : {c:[43,43],r:5.5}, a: v === "south" ? "NE, on the boss hitbox ring." : "NW, on the boss hitbox ring.",
        // Four line stacks from the boss through the four closest pairs: NW, NE, SW and SE.
        reveal:[315, 45, 225, 135].map(a => lineTo([50, 50], POINT_AT(a, 10)))}],
      rule:"Four-way: north puddles = NW, south puddles = NE. M1 is always SW, M2 always SE."})}
];
