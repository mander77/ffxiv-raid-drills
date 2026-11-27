// The route your marker runs in the full fight: from spot to spot, leaving each spot just after
// its hit. "Watch the Correct Moves" runs the correct spots, and the run goes to your own clicks.
// The position comes from the fight time, so pausing, the slider and the speed setting stay in
// step with it.
//
// Scale: the arena is 100 units across. The M11S waymark presets put A to D 10 yalms from the
// center (100, 100) and the numbered marks about 16.3 yalms out, which is where this app draws them
// (25 and about 41 units out). So 1 unit is 0.4 yalm, and the arena is 40 x 40 yalms. No guide
// states the size; this follows from the waymarks.
import { addVec, dist, inZone, rot, rotZone, stepZone, zoneCenter } from "../geometry";
import type { Fight, FightSeg, Point, StepResult, Zone } from "../types";

/** Normal movement speed, about 6 yalms a second, in arena units a second (6 / 0.4). Tune it here. */
export const MOVEMENT_SPEED = 15;
/** How long after a hit the player starts to move, in seconds. */
export const REACT = 0.2;
/** How long after a mechanic appears the player starts to move to its first spot, in seconds.
    Dance of Domination shows its lines only 4.5 seconds before the pair stacks, so this is short. */
export const LOOK = 0.5;
/** The default pre-position, and where the player starts: up close to the boss, inside his hitbox
    just south of his center. It is the most central spot, so any first weapon, any pair spot and
    so on is a short run away. Pre-positioning is a big part of the raid. */
export const HOME: Point = [50, 56];
/** A quiet stretch at least this long (seconds from a hit to the next mechanic) sends the player
    to HOME, when the next mechanic has no pre-position of its own. */
export const REST_GAP = 8;
/** How long a knockback takes to throw you to where you land, in seconds: the app's choice, a
    quick flight that you can follow by eye. */
export const THROW_TIME = 0.6;

/** One stop on the route: the spot `p`, the hit at `hit` (seconds into the fight) that the spot is
    for, and `show`, when that mechanic appears on the arena. `si` and `j` say which segment and
    step of the fight it answers. `pre` is the segment's own pre-position, when it has one: a
    first move known in advance. A `lookAhead` stop is a look-ahead step: it has an answer (the
    click), but the player does not move there, so the runner skips it. `click` is when you
    clicked the spot, for a route made of your own clicks: the runner goes there only then.
    `knock` is a knockback at the hit: it throws the runner `dist` units straight away from `from`. */
export interface Stop { p: Point; hit: number; show: number; si: number; j: number; pre?: Point; lookAhead?: boolean; click?: number; knock?: {from: Point; dist: number} }

/** Where a knockback from `from` throws a player standing at p: `d` units straight away from it. */
export const thrownTo = (from: Point, d: number, p: Point): Point => {
  const r = dist(p, from);
  return r < 1e-6 ? p : addVec(p, [(p[0] - from[0]) / r, (p[1] - from[1]) / r], d);
};
/** A step's knockback, turned with the arena, for its stop. */
const knockOf = (k: {from: Point; dist: number} | undefined, turn: number): Pick<Stop, "knock"> =>
  k ? {knock:{from:rot(k.from, turn), dist:k.dist}} : {};


/** When step j of a mechanic appears for the player: when the mechanic does, but a weapon only
    once the boss turns to the first one, or once it spawns. Before that, nobody can know where
    to go. */
export const showOf = (g: FightSeg, j: number): number => {
  const turn = g.turn && j >= g.scene.steps.length - g.turn.weapons ? g.turn.at : g.from;
  return Math.max(g.from, turn, g.spawns?.[j] ?? g.from);
};

/** The middle of the spot to stand on in zone z, coming from `from`. Mostly the middle of the
    zone (a circle or a box) or its shown point (an area with a rule), because standing on the edge
    of a spread or a stack can clip the players next to you. When a rule area shows several
    separate spots that are all correct (the four open gaps for a spread), it is the middle of the
    nearest one, the way a player picks one. */
function middleOf(z: Zone, from: Point): Point {
  if(!("fn" in z)) return zoneCenter(z);
  const choices = z.show.flatMap((sh): Point[] => "c" in sh && z.fn(sh.c) ? [sh.c] : []);
  if(choices.length < 2) return z.label;
  return choices.reduce((a, b) => dist(a, from) <= dist(b, from) ? a : b);
}

/** The correct spots of the whole fight, in time order. "Watch the Correct Moves" answers with these
    same points. Each one is the middle of its spot (see middleOf). A step with a best spot goes
    there instead: a few steps in from the sword pocket's inner corner. A spot that depends on the
    steps before it (a puddle, for example) is worked out from these answers. */
export function correctRoute(f: Fight): Stop[] {
  return f.segs.flatMap((g, si) => {
    const res: StepResult[] = [], pre = g.pre;
    let from = pre ?? HOME;   // the player meets the mechanic at its pre-position
    return g.scene.steps.flatMap((st, j): Stop[] => {
      const base = stepZone(st, res);
      if(!base) return [];
      const z = rotZone(base, g.k), p = st.stand && !st.lookAhead ? rot(st.stand, g.k) : middleOf(z, from);
      res.push({p, ok:inZone(p, z), z, drop:st.drop ? p : null});
      if(!st.lookAhead) from = p;   // a look-ahead does not move the player
      return [{p, hit:g.due[j], show:showOf(g, j), si, j, ...(pre ? {pre} : {}), ...(st.lookAhead ? {lookAhead:true} : {}), ...knockOf(st.knock, g.k)}];
    });
  }).sort((a, b) => a.hit - b.hit);
}

/** Your own clicks as a route, for the run. `j` is the step each click
    answered, and `t` is when you clicked. Only your clicks move the marker, so it takes no
    pre-position of its own: that could show where a mechanic starts before you click. */
export function clickRoute(f: Fight, clicks: Array<{si: number; j: number; p: Point; t?: number}>): Stop[] {
  return clicks.flatMap((c): Stop[] => {
    const g = f.segs[c.si], hit = g?.due[c.j];
    return g && hit != null ? [{p:c.p, hit, show:showOf(g, c.j), si:c.si, j:c.j, ...(c.t != null ? {click:c.t} : {}), lookAhead:g.scene.steps[c.j]?.lookAhead, ...knockOf(g.scene.steps[c.j]?.knock, g.k)}] : [];
  }).sort((a, b) => a.hit - b.hit);
}

/** Where the runner is at time t, and its target: the stop for the next hit, once that mechanic is
    on the arena (null before it shows, and at the end). The runner waits on each spot until that
    spot's hit, plus REACT, then runs straight to the next spot at MOVEMENT_SPEED. It leaves for the
    first spot of a mechanic LOOK seconds after the mechanic appears, or, for your own click, as soon as
    you clicked (but not before the hit of the spot it stands on). Before a mechanic with its
    own pre-position (Stop.pre), it goes there just after the last hit. Before any other
    mechanic, after a quiet stretch of REST_GAP seconds or more, it goes to HOME. Look-ahead
    stops are skipped: the player does not move for them. A stop with a knockback throws the
    runner at its hit, over THROW_TIME, to where it lands; it moves on from there. `home` is where
    the runner starts and rests: HOME for you, a rest spot for another player. */
export function runnerAt(route: Stop[], t: number, home: Point = HOME): {at: Point; target: Stop | null} {
  const moves = route.filter(s => !s.lookAhead);
  const target = moves.find(s => s.hit > t && s.show <= t) ?? null;
  let at = home, lastHit = -Infinity, seg = -1;
  /* One straight run from `at` to p, leaving at `leave`. Returns where the runner is at t if t
     falls before the end of this run, or null when the run is over by t. */
  const leg = (p: Point, leave: number): Point | null => {
    const arrive = leave + dist(at, p) / MOVEMENT_SPEED;
    if(t < leave) return at;
    if(t < arrive){ const k = (t - leave) / (arrive - leave); return [at[0] + (p[0] - at[0]) * k, at[1] + (p[1] - at[1]) * k]; }
    at = p;
    return null;
  };
  for(const s of moves){
    if(s.si !== seg){   // the first move of a mechanic
      seg = s.si;
      const pre = s.pre ?? (s.show - lastHit >= REST_GAP ? home : null);
      const go = pre && dist(at, pre) > 0.5 ? leg(pre, lastHit + REACT) : null;
      if(go) return {at:go, target};
    }
    const step = leg(s.p, Math.max(lastHit + REACT, s.click ?? s.show + LOOK));
    if(step) return {at:step, target};
    if(s.knock){
      if(t < s.hit) return {at, target};
      const from = at, land = thrownTo(s.knock.from, s.knock.dist, at), k = (t - s.hit) / THROW_TIME;
      if(k < 1) return {at:[from[0] + (land[0] - from[0]) * k, from[1] + (land[1] - from[1]) * k], target};
      at = land;
      lastHit = s.hit + THROW_TIME;
      continue;
    }
    lastHit = s.hit;
  }
  return {at, target};
}
