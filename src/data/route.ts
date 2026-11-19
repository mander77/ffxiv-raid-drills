// The route a player runs in Real time: from spot to spot, leaving each spot right after its hit.
// "Watch the right moves" runs the right spots, and "Your run, played back" runs your own clicks.
// The position comes from the fight time, so pausing, the slider and the speed setting stay in
// step with it.
//
// Scale: the arena is 100 units across. The M11S waymark presets put A to D 10 yalms from the
// center (100, 100) and the numbered marks about 16.3 yalms out, which is where this app draws them
// (25 and about 41 units out). So 1 unit is 0.4 yalm, and the arena is 40 x 40 yalms. No guide
// states the size; this follows from the waymarks.
import { inZone, rotZone, zoneCenter } from "../geometry";
import type { Fight } from "./fight";
import type { Point, StepResult, Zone } from "../types";

/** Normal run speed, about 6 yalms a second, in arena units a second (6 / 0.4). Tune it here. */
export const RUN_SPEED = 15;
/** How long after a hit the player starts to move, in seconds. */
export const REACT = 0.2;
/** How long after a mechanic appears the player starts to move to its first spot, in seconds. */
export const LOOK = 1;
/** Where the player stands between mechanics: just south of the boss, as for uptime. */
export const HOME: Point = [50, 64];
/** A quiet stretch at least this long (seconds from a hit to the next mechanic) sends the
    player back home. */
export const REST_GAP = 8;
/** How far inside an answer area the route stands, in arena units, so it is not on the edge. */
const INSET = 1.5;

/** One stop on the route: the spot `p`, the hit at `hit` (seconds into the fight) that the spot is
    for, and `show`, when that mechanic appears on the arena. `si` and `j` say which segment and
    step of the fight it answers. */
export interface Stop { p: Point; hit: number; show: number; si: number; j: number }

const dist = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clamp = (v: number, lo: number, hi: number): number => lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));

/** The point of zone z nearest to `from`, INSET units inside it: the short way a player takes,
    not a run to the middle of a big area. A rule zone has no simple shape, so a grid search finds
    the nearest point that is inside, with its neighbours INSET away inside too. */
export function nearestIn(z: Zone, from: Point): Point {
  if("c" in z){
    const d = dist(from, z.c), r = Math.max(0, z.r - INSET);
    return d <= r ? from : [z.c[0] + (from[0] - z.c[0]) * r / d, z.c[1] + (from[1] - z.c[1]) * r / d];
  }
  if("rect" in z) return [clamp(from[0], z.rect[0] + INSET, z.rect[2] - INSET), clamp(from[1], z.rect[1] + INSET, z.rect[3] - INSET)];
  const deep = (p: Point): boolean => z.fn(p) && z.fn([p[0] + INSET, p[1]]) && z.fn([p[0] - INSET, p[1]]) && z.fn([p[0], p[1] + INSET]) && z.fn([p[0], p[1] - INSET]);
  if(deep(from)) return from;
  // The nearest point well inside, else the nearest point inside at all (a thin area), else the
  // area's own shown spot.
  for(const ok of [deep, z.fn]){
    let best: Point | null = null, bestD = Infinity;
    for(let x = 0; x <= 100; x++) for(let y = 0; y <= 100; y++){
      const p: Point = [x, y], d = dist(from, p);
      if(d < bestD && ok(p)){ best = p; bestD = d; }
    }
    if(best) return best;
  }
  return z.label;
}

/** The right spots of the whole fight, in time order. Each one is the nearest point of its answer
    area to the spot before it, the way a player moves, and "Watch the right moves" answers with
    these same points. A puddle drop is the exception: puddles are baited in a fixed pattern, so a
    drop uses its usual spot, and the spots after it are worked out from those drops. */
export function rightRoute(f: Fight): Stop[] {
  // The segments in time order, so "the spot before" is the one the player just left.
  const order = f.segs.map((g, si) => ({g, si})).sort((a, b) => a.g.from - b.g.from);
  let from = HOME, lastHit = -Infinity;
  const stops: Stop[] = [];
  for(const {g, si} of order){
    const res: StepResult[] = [];
    if(g.from - lastHit >= REST_GAP) from = HOME;
    g.scene.steps.forEach((st, j) => {
      const base = st.zf ? st.zf(res) : st.z;
      if(!base) return;
      const z = rotZone(base, g.k), p = st.drop ? zoneCenter(z) : nearestIn(z, from);
      res.push({p, ok:inZone(p, z), z, drop:st.drop ? p : null});
      stops.push({p, hit:g.due[j], show:g.from, si, j});
      from = p; lastHit = g.due[j];
    });
  }
  return stops.sort((a, b) => a.hit - b.hit);
}

/** Your own clicks as a route, for the played-back run. `j` is the step each click answered. */
export function clickRoute(f: Fight, clicks: Array<{si: number; j: number; p: Point}>): Stop[] {
  return clicks.flatMap((c): Stop[] => {
    const g = f.segs[c.si], hit = g?.due[c.j];
    return g && hit != null ? [{p:c.p, hit, show:g.from, si:c.si, j:c.j}] : [];
  }).sort((a, b) => a.hit - b.hit);
}

/** Where the runner is at time t, and where it is going next (null when it has nowhere to go
    yet). It waits on each spot until that spot's hit, plus REACT, then runs straight to the next
    spot at RUN_SPEED. It leaves for the first spot of a mechanic LOOK seconds after the mechanic
    appears. In a quiet stretch of REST_GAP seconds or more, it first goes home. While it waits,
    `to` already shows the next spot, once that mechanic is on the arena. */
export function runnerAt(route: Stop[], t: number): {at: Point; to: Point | null} {
  let at = HOME, lastHit = -Infinity;
  /* One straight run from `at` to p, leaving at `leave`. Returns where the runner is at t if t
     falls before the end of this run, or null when the run is over by t. */
  const leg = (p: Point, leave: number, to: Point | null): {at: Point; to: Point | null} | null => {
    const arrive = leave + dist(at, p) / RUN_SPEED;
    if(t < leave) return {at, to};
    if(t < arrive){ const k = (t - leave) / (arrive - leave); return {at:[at[0] + (p[0] - at[0]) * k, at[1] + (p[1] - at[1]) * k], to:p}; }
    at = p;
    return null;
  };
  for(const s of route){
    if(s.show - lastHit >= REST_GAP && dist(at, HOME) > 0.5){
      const home = leg(HOME, lastHit + REACT, HOME);
      if(home) return home;
    }
    const step = leg(s.p, Math.max(lastHit + REACT, s.show + LOOK), t >= s.show ? s.p : null);
    if(step) return step;
    lastHit = s.hit;
  }
  return {at, to:null};
}
