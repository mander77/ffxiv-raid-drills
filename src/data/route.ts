// The route your marker runs in the full fight: from spot to spot, leaving each spot right after
// its hit. "Watch the right moves" runs the right spots, and the run goes to your own clicks.
// The position comes from the fight time, so pausing, the slider and the speed setting stay in
// step with it.
//
// Scale: the arena is 100 units across. The M11S waymark presets put A to D 10 yalms from the
// center (100, 100) and the numbered marks about 16.3 yalms out, which is where this app draws them
// (25 and about 41 units out). So 1 unit is 0.4 yalm, and the arena is 40 x 40 yalms. No guide
// states the size; this follows from the waymarks.
import { dist, inZone, rot, rotZone, stepZone, zoneCenter } from "../geometry";
import type { Fight, FightSeg } from "./fight";
import type { Point, StepResult, Zone } from "../types";

/** Normal run speed, about 6 yalms a second, in arena units a second (6 / 0.4). Tune it here. */
export const RUN_SPEED = 15;
/** How long after a hit the player starts to move, in seconds. */
export const REACT = 0.2;
/** How long after a mechanic appears the player starts to move to its first spot, in seconds.
    Dance of Domination shows its lines only 4.5 seconds before the pair stacks, so this is short. */
export const LOOK = 0.5;
/** The default pre-position, and where the player starts: right up at the boss, inside his hitbox
    just south of his center. It is the most central spot, so any first weapon, any pair spot and
    so on is a short run away. Pre-positioning is a big part of the raid. */
export const HOME: Point = [50, 56];
/** A quiet stretch at least this long (seconds from a hit to the next mechanic) sends the player
    to HOME, when the next mechanic has no pre-position of its own. */
export const REST_GAP = 8;

/** One stop on the route: the spot `p`, the hit at `hit` (seconds into the fight) that the spot is
    for, and `show`, when that mechanic appears on the arena. `si` and `j` say which segment and
    step of the fight it answers. `pre` is the segment's own pre-position, when it has one: a
    first move known in advance. A `look` stop is a look-ahead step: it has an answer (the
    click), but the player does not move there, so the runner skips it. `click` is when you
    clicked the spot, for a route made of your own clicks: the runner goes there only then. */
export interface Stop { p: Point; hit: number; show: number; si: number; j: number; pre?: Point; look?: boolean; click?: number }


/** When step j of a mechanic appears for the player: when the mechanic does, but a weapon only
    once the boss turns to the first one. Before that, nobody can know where to go. */
export const showOf = (g: FightSeg, j: number): number =>
  g.turn && j >= g.scene.steps.length - g.turn.weapons ? Math.max(g.from, g.turn.at) : g.from;

/** The middle of the spot to stand on in zone z, coming from `from`. Mostly the middle of the
    zone (a circle or a box) or its shown point (an area with a rule), because standing on the edge
    of a spread or a stack can clip the players next to you. When a rule area shows several
    separate spots that are all right (the four open gaps for a spread), it is the middle of the
    nearest one, the way a player picks one. */
function middleOf(z: Zone, from: Point): Point {
  if(!("fn" in z)) return zoneCenter(z);
  const choices = z.show.flatMap((sh): Point[] => "c" in sh && z.fn(sh.c) ? [sh.c] : []);
  if(choices.length < 2) return z.label;
  return choices.reduce((a, b) => dist(a, from) <= dist(b, from) ? a : b);
}

/** The right spots of the whole fight, in time order. "Watch the right moves" answers with these
    same points. Each one is the middle of its spot (see middleOf). A step with a best spot goes
    there instead: a few steps in from the sword pocket's inner corner. A spot that depends on the
    steps before it (a puddle, for example) is worked out from these answers. */
export function rightRoute(f: Fight): Stop[] {
  return f.segs.flatMap((g, si) => {
    const res: StepResult[] = [], pre = g.pre;
    let from = pre ?? HOME;   // the player meets the mechanic at its pre-position
    return g.scene.steps.flatMap((st, j): Stop[] => {
      const base = stepZone(st, res);
      if(!base) return [];
      const z = rotZone(base, g.k), p = st.stand && !st.look ? rot(st.stand, g.k) : middleOf(z, from);
      res.push({p, ok:inZone(p, z), z, drop:st.drop ? p : null});
      if(!st.look) from = p;   // a look-ahead does not move the player
      return [{p, hit:g.due[j], show:showOf(g, j), si, j, ...(pre ? {pre} : {}), ...(st.look ? {look:true} : {})}];
    });
  }).sort((a, b) => a.hit - b.hit);
}

/** Your own clicks as a route, for the run. `j` is the step each click
    answered, and `t` is when you clicked. Only your clicks move the marker, so it takes no
    pre-position of its own: that could show where a mechanic starts before you click. */
export function clickRoute(f: Fight, clicks: Array<{si: number; j: number; p: Point; t?: number}>): Stop[] {
  return clicks.flatMap((c): Stop[] => {
    const g = f.segs[c.si], hit = g?.due[c.j];
    return g && hit != null ? [{p:c.p, hit, show:showOf(g, c.j), si:c.si, j:c.j, ...(c.t != null ? {click:c.t} : {}), look:g.scene.steps[c.j]?.look}] : [];
  }).sort((a, b) => a.hit - b.hit);
}

/** Where the runner is at time t, and its target: the stop for the next hit, once that mechanic is
    on the arena (null before it shows, and at the end). The runner waits on each spot until that
    spot's hit, plus REACT, then runs straight to the next spot at RUN_SPEED. It leaves for the
    first spot of a mechanic LOOK seconds after the mechanic appears, or, for your own click, right
    when you clicked (but not before the hit of the spot it stands on). Before a mechanic with its
    own pre-position (Stop.pre), it goes there right after the last hit. Before any other
    mechanic, after a quiet stretch of REST_GAP seconds or more, it goes to HOME. Look-ahead
    stops are skipped: the player does not move for them. */
export function runnerAt(route: Stop[], t: number): {at: Point; target: Stop | null} {
  const moves = route.filter(s => !s.look);
  const target = moves.find(s => s.hit > t && s.show <= t) ?? null;
  let at = HOME, lastHit = -Infinity, seg = -1;
  /* One straight run from `at` to p, leaving at `leave`. Returns where the runner is at t if t
     falls before the end of this run, or null when the run is over by t. */
  const leg = (p: Point, leave: number): Point | null => {
    const arrive = leave + dist(at, p) / RUN_SPEED;
    if(t < leave) return at;
    if(t < arrive){ const k = (t - leave) / (arrive - leave); return [at[0] + (p[0] - at[0]) * k, at[1] + (p[1] - at[1]) * k]; }
    at = p;
    return null;
  };
  for(const s of moves){
    if(s.si !== seg){   // the first move of a mechanic
      seg = s.si;
      const pre = s.pre ?? (s.show - lastHit >= REST_GAP ? HOME : null);
      const go = pre && dist(at, pre) > 0.5 ? leg(pre, lastHit + REACT) : null;
      if(go) return {at:go, target};
    }
    const step = leg(s.p, Math.max(lastHit + REACT, s.click ?? s.show + LOOK));
    if(step) return {at:step, target};
    lastHit = s.hit;
  }
  return {at, target};
}
