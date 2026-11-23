// The rules of the full fight's clock, as plain functions: when a step can be answered, when the
// run skips ahead, when a result shows, the 3-2-1 before a mechanic, and the look-ahead answer
// to look ahead to. The fight screen calls them on every frame; the tests call them too.

import { type Category, categoriesAt } from "../data/abilities";
import { PUDDLE_LIFE } from "../data/attacks";
import { facingNext, jumpsNext } from "../data/drills";
import { buildHits, type Fight, type FightSeg, type Hit } from "../data/fight";
import { clickRoute, correctRoute, type Stop, showOf } from "../data/route";
import { inZone, rotOverlay, rotZone, stepZone, zoneCenter } from "../geometry";
import type { Boss, Point, Scene, StepResult, Zone } from "../types";

/* ---------- times, in seconds ---------- */
// Each of these is the app's choice, not a fight time, unless its comment names a source.

/** With nothing on the floor, the run skips to this many seconds before the next mechanic. */
export const LEAD = 3;
/** The run: how long the result of a finished mechanic shows after its last hit. */
export const RESULT_HOLD = 2;
/** The run: how long the result of a step shows before the next question. */
export const RESULT_SHOW = 1.2;
/** How long "Watch the boss" stays after he starts to turn, so you see the arrow swing. */
export const TELL_HOLD = 1;
/** How long the boss's turn shows before a question (the turn itself takes half a second). */
export const TURN_SHOW = 0.6;
/** How long after a weapon hits the boss turns to face the next one. No source gives this time:
    cactbot has only the jump, about 2 seconds before the next hit, and the hits are about 5
    seconds apart. So it is an estimate, and he turns well before he jumps. */
export const TURN_AFTER = 1.0;
/** How long before a weapon hits the boss lands on it: cactbot's "--jump N--" lines come 2.0
    seconds before each "Assault Evolved N" hit, in both sets. */
export const JUMP_LEAD = 2.0;
/** Watch the correct moves: how long a green answer stays on the floor after its hit. */
export const GREEN_FOR = 1.5;
/** Watch the correct moves: how long before its due time a look-ahead step is answered. */
export const LOOK_SHOW = 4;
/** The last seconds before a hit, when the prompt and the countdown ring turn red. */
export const URGENT = 3;
/** The longest a cast bar takes to fill. */
export const CAST_MAX = 10;

/* The casts coming up scroll up a list toward a "now" line, like cactbot's raidboss timeline set
   in motion: a cast shows once it is 30 seconds away (cactbot's default), turns "soon" in its last
   6 seconds (cactbot's default), and stays above the line for 2 seconds after it happens (the
   app's choice, so you see it go by). The cast bar keeps a cast that just happened for 0.7
   seconds (cactbot's default). */
export const CASTS_AHEAD = 30;
export const CASTS_SOON = 6;
export const CASTS_PAST = 2;
export const TIMELINE_KEEP = 0.7;
/** In the player, a click on a cast coming up goes this many seconds before it, so you see it
    come and go off. The app's choice. */
export const CAST_GO_LEAD = 3;

/* ---------- the state of one run of the fight clock ---------- */

/** run: you click, like a game. watch: the correct moves play by themselves. */
export type FightMode = "run" | "watch";
/** A click in the run: mechanic si, step j, fight time t, arena spot p. */
export interface Click {
  si: number;
  j: number;
  t: number;
  p: Point;
}
/** A line of the fight timeline. */
export type TimelineLine = Fight["events"][number];

export interface FightState {
  mode: FightMode;
  fight: Fight;
  /** The fight time, in seconds. */
  t: number;
  paused: boolean;
  /** The run: the fight time of your last answer, so its result shows for a moment. */
  answeredAt: number;
  /** The run: stop at each new mechanic, so you can look before the clock runs. */
  stops: boolean;
  /** The run: the last mechanic it stopped at. */
  stoppedAt: number;
  /** The run: stopped at a new mechanic, waiting for Go. */
  look: boolean;
  /** One list of answers per mechanic. */
  results: StepResult[][];
  /** The run: your clicks, for the route your marker runs. */
  clicks: Click[];
  /** Every hit of the fight, in time order. */
  hits: Hit[];
  /** The first hit that has not shown yet. */
  nextHit: number;
  /** The timeline lines that show: cactbot's "--sync--" markers are left out. */
  lines: TimelineLine[];
  /** The route the marker runs: the correct spots (watch) or your clicks (run). */
  route: Stop[];
}

/** A new run of the clock. The run starts LEAD seconds before the first mechanic, as after each
    skip, so it opens with the 3-2-1 of the first mechanic. */
export function newFightState(mode: FightMode, fight: Fight, opts: { paused?: boolean; stops?: boolean } = {}): FightState {
  const t = mode === "run" ? Math.max(0, fight.segs[0].from - LEAD) : 0;
  const hits = buildHits(fight);
  return {
    mode,
    fight,
    t,
    paused: opts.paused ?? false,
    answeredAt: Number.NEGATIVE_INFINITY,
    stops: mode === "run" && (opts.stops ?? false),
    stoppedAt: -1,
    look: false,
    results: fight.segs.map(() => []),
    clicks: [],
    hits,
    nextHit: firstHitAfter(hits, t),
    lines: fight.events.filter((e) => !e.name.startsWith("--")),
    route: mode === "watch" ? correctRoute(fight) : clickRoute(fight, []),
  };
}

/* ---------- where the fight is ---------- */

/** The mechanic on the arena at time t, or -1 between mechanics. A mechanic stays 3 seconds after
    its last hit. */
export function activeSeg(f: Fight, t: number): number {
  for (let i = f.segs.length - 1; i >= 0; i--) {
    const g = f.segs[i];
    if (t >= g.from) return t <= g.due[g.due.length - 1] + 3 ? i : -1;
  }
  return -1;
}
/** The mechanic after mechanic si, or null after the last one. */
export const nextSeg = (f: Fight, si: number): FightSeg | null => f.segs[si + 1] ?? null;
/** The first mechanic that starts after time t. */
export const upcoming = (f: Fight, t: number): FightSeg | undefined => f.segs.find((x) => x.from > t);
/** The index of the first hit after time t, or hits.length when none is left. */
export function firstHitAfter(hits: readonly Hit[], t: number): number {
  const i = hits.findIndex((h) => h.t > t);
  return i < 0 ? hits.length : i;
}

/** The moment step j of a mechanic can be answered, on the player: the first step once the
    mechanic is on the floor (for the weapons, once the boss has turned to the first one), a later
    step once the hit before it landed and the boss turned to the next weapon. Always before the
    step's hit. Used to go to a mechanic while paused. */
export function askAt(g: FightSeg, j: number): number {
  const ready = j === 0 ? (g.turn ? g.turn.at + TURN_SHOW : g.from) : g.due[j - 1] + TURN_AFTER + TURN_SHOW;
  return Math.max(g.from, Math.min(g.due[j] - 0.1, ready));
}

/** The tell: when step j of a mechanic can be answered in the run. A weapon that waits for the
    boss's turn waits TELL_HOLD seconds more, so you see the arrow swing. */
export function askFrom(g: FightSeg, j: number): number {
  const s = showOf(g, j);
  return s > g.from ? s + TELL_HOLD : s;
}

/** The result hold: in the run, after you answer a step that is not the last of its mechanic (n
    steps answered), its result shows for RESULT_SHOW seconds before the next question. */
export const showingResult = (s: FightState, g: FightSeg, n: number): boolean =>
  s.mode === "run" && n > 0 && n < g.due.length && s.t < s.answeredAt + RESULT_SHOW;

/** Look ahead: on the player, from the early answer of a look-ahead step until its due time,
    the answer holds the screen. Returns that step, or -1. */
export function lookHold(s: FightState, si: number): number {
  if (s.mode !== "watch" || si < 0) return -1;
  const g = s.fight.segs[si];
  const j = s.results[si].length - 1;
  return j >= 0 && g.scene.steps[j].lookAhead && s.t < g.due[j] ? j : -1;
}

/** The countdown: the 3-2-1 before a mechanic in the run, in its last LEAD seconds, while no step
    is asked. Returns the number to show and the mechanic's name, or null. */
export function countdownOf(s: FightState): { n: number; name: string } | null {
  if (s.mode !== "run") return null;
  const si = activeSeg(s.fight, s.t);
  const g = si >= 0 ? s.fight.segs[si] : null;
  if (g && s.results[si].length < g.due.length) return null;
  const nx = upcoming(s.fight, s.t);
  const left = nx ? nx.from - s.t : 0;
  return nx && left > 0 && left <= LEAD ? { n: Math.ceil(left), name: nx.title } : null;
}

/* ---------- moving the clock ---------- */

/** Set the clock to `to` without showing the hits in between. */
export function jump(s: FightState, to: number): void {
  s.t = to;
  s.nextHit = firstHitAfter(s.hits, to);
}

/** Go to any moment on the player. Back: the answers to hits after that moment are forgotten.
    Forward: the next frames fill in the correct moves it jumped over. */
export function seek(s: FightState, to: number): void {
  const t = Math.max(0, Math.min(s.fight.end, to));
  if (t < s.t)
    s.fight.segs.forEach((g, si) => {
      const res = s.results[si];
      while (res.length && g.due[res.length - 1] > t) res.pop();
    });
  jump(s, t);
}

/** What answering a step did: correct, incorrect or too slow, and, when it finished a mechanic in the
    run, the drill whose score it counts for. */
export interface Answered {
  kind: "ok" | "bad" | "slow";
  scored: { drill: string; allCorrect: boolean } | null;
}

/** Answer the next step of mechanic si: a click at p, the correct spot (p null), or a step you were
    too slow for. In the run, your marker runs to each spot you click. */
export function answerFightStep(s: FightState, si: number, p: Point | null, missed = false): Answered | null {
  const g = s.fight.segs[si];
  const res = s.results[si];
  const step = g.scene.steps[res.length];
  const base = step ? stepZone(step, res) : undefined;
  if (!step || !base) return null;
  const zone = rotZone(base, g.k);
  const at: Point = p ?? zoneCenter(zone);
  const ok = !missed && inZone(at, zone);
  res.push({ p: at, ok, z: zone, drop: step.drop ? (ok ? at : zoneCenter(zone)) : null, missed });
  if (s.mode !== "run") return { kind: ok ? "ok" : "bad", scored: null };
  s.answeredAt = s.t;
  if (p) {
    s.clicks.push({ si, j: res.length - 1, t: s.t, p });
    s.route = clickRoute(s.fight, s.clicks);
  }
  const scored = res.length === g.due.length && g.drills[0] ? { drill: g.drills[0], allCorrect: res.every((x) => x.ok) } : null;
  return { kind: ok ? "ok" : missed ? "slow" : "bad", scored };
}

/** Can a click in the run answer now? Not while paused, not before the question shows (a weapon
    only once the boss turns to the first one), and not while the last result shows. */
export function clickTarget(s: FightState): number {
  if (s.mode !== "run" || s.paused) return -1;
  const si = activeSeg(s.fight, s.t);
  const g = si >= 0 ? s.fight.segs[si] : null;
  const j = g ? s.results[si].length : 0;
  if (!g || j >= g.due.length || s.t < askFrom(g, j) || showingResult(s, g, j)) return -1;
  return si;
}

/** What one frame of the clock did. */
export interface Tick {
  /** The hits the clock passed, to show. */
  hits: Hit[];
  /** The steps it answered by itself (watch) or missed (run). */
  answers: Answered[];
  /** The fight is over. */
  done: boolean;
}

/** Move the clock on by dt seconds of real time and apply the rules:
    - The skip: in the run, after your last click on a mechanic its last hit lands at once; once
      its result has shown for RESULT_HOLD seconds, or with nothing on the floor, the run goes on
      to LEAD seconds before the next mechanic, and it ends after the last one.
    - Watch the correct moves answers each step at its hit (a look-ahead step LOOK_SHOW seconds
      early), with the spot the marker ran to. In the run, a step not answered by its hit is too
      slow.
    - "Stop at each new mechanic": in the run, when a mechanic appears, the clock waits for Go. */
export function tickFight(s: FightState, dt: number, speed: number): Tick {
  const f = s.fight;
  const out: Tick = { hits: [], answers: [], done: false };
  if (!s.paused) s.t += dt * (s.mode === "run" ? 1 : speed);
  if (s.mode === "run" && !s.paused) {
    const si = activeSeg(f, s.t);
    const g = si >= 0 ? f.segs[si] : null;
    const last = g ? g.due[g.due.length - 1] : 0;
    const done = g != null && s.results[si].length >= g.due.length;
    if (done && s.t < last - 0.05) jump(s, last - 0.05);
    else if (!g || (done && s.t >= last + RESULT_HOLD)) {
      const nx = upcoming(f, s.t);
      if (!nx) return { ...out, done: true };
      if (nx.from - s.t > LEAD) jump(s, nx.from - LEAD);
    }
  }
  while (s.nextHit < s.hits.length && s.hits[s.nextHit].t <= s.t) out.hits.push(s.hits[s.nextHit++]);
  f.segs.forEach((g, si) => {
    const j = s.results[si].length;
    if (j >= g.due.length || s.t < g.from) return;
    const at = s.mode === "watch" && g.scene.steps[j].lookAhead ? Math.max(g.from, g.due[j] - LOOK_SHOW) : g.due[j];
    if (s.mode === "watch" && s.t >= at) {
      const a = answerFightStep(s, si, s.route.find((x) => x.si === si && x.j === j)?.p ?? null);
      if (a) out.answers.push(a);
      return;
    }
    if (s.t < g.due[j]) return;
    const a = answerFightStep(s, si, null, true);
    if (a) out.answers.push(a);
  });
  if (s.t >= f.end) return { ...out, done: true };
  if (s.stops && !s.paused) {
    const si = activeSeg(f, s.t);
    if (si > s.stoppedAt && s.results[si].length === 0) {
      s.stoppedAt = si;
      s.paused = true;
      s.look = true;
    }
  }
  return out;
}

/* ---------- what the arena shows ---------- */

/** Between mechanics the arena is empty, but it is two platforms from Flatliner until the Crown
    of Arcadia that joins them again. */
const IDLE: Scene = { setup: [], rule: [], steps: [], overlays: [], boss: { x: 50, y: 50, f: null } };
const IDLE_SPLIT: Scene = { ...IDLE, split: true };

/** What the arena and the panel show at this moment. It changes only now and then, so the screen
    draws again only when `key` changes. */
export interface FightView {
  key: string;
  /** The mechanic on the arena, or -1. */
  si: number;
  scene: Scene;
  k: number;
  results: StepResult[];
  /** Show the last answer on the floor. */
  showAnswer: boolean;
  boss: Boss | null;
  /** For each answer, whether its puddle has gone off. */
  wentOff: boolean[];
  /** The correct area of the marker's next spot (watch), in blue. */
  target: Zone | null;
  paused: boolean;
  look: boolean;
}

export function viewOf(s: FightState): FightView {
  const f = s.fight;
  const si = activeSeg(f, s.t);
  const g = si >= 0 ? f.segs[si] : null;
  const res = g ? s.results[si] : [];
  const turned = Boolean(g?.turn && s.t >= g.turn.at);
  const where = g ? String(si) : s.t >= f.split[0] && s.t < f.split[1] ? "split" : "idle";
  // On the player, the green answer shows for GREEN_FOR seconds after its hit. In the run, it
  // shows with its result for RESULT_SHOW seconds; at the end of a mechanic it stays.
  const lastHit = g && res.length ? g.due[res.length - 1] : Number.NEGATIVE_INFINITY;
  const showAnswer =
    res.length > 0 &&
    (s.mode === "watch" ? s.t - lastHit < GREEN_FOR : res.length >= (g?.due.length ?? 0) || s.t < s.answeredAt + RESULT_SHOW);
  // After a weapon hits, he turns to face the next one. He lands on it JUMP_LEAD seconds before it hits.
  const facing = res.length > 0 && s.t >= lastHit + TURN_AFTER;
  const jumped = Boolean(g && res.length < g.due.length && s.t >= g.due[res.length] - JUMP_LEAD && jumpsNext(g.scene, res.length));
  // A puddle goes off PUDDLE_LIFE seconds after it drops.
  const wentOff = res.map((r, i) => Boolean(g && r.drop && s.t >= g.due[i] + PUDDLE_LIFE));
  const gone = wentOff.filter(Boolean).length;
  const sc = g ? g.scene : where === "split" ? IDLE_SPLIT : IDLE;
  const k = g ? g.k : 0;
  let boss: Boss | null = sc.bossAt ? sc.bossAt(res.length + (jumped ? 1 : 0)) : sc.boss ? rotOverlay(sc.boss, k) : null;
  // In the middle, before his cast, he faces no weapon. When the cast starts he turns to the first one.
  if (boss && g?.turn && boss.x === 50 && boss.y === 50) boss = { ...boss, f: turned ? g.turn.f : null };
  // Once he has landed, he faces the way he jumped.
  if (boss && facing && !jumped) boss = facingNext(sc, res.length, boss);
  // The marker's next spot, in blue on the player, once the answers before it are in.
  const target = s.mode === "watch" ? targetZone(s) : null;
  const key = [where, res.length, turned, facing, jumped, showAnswer, s.paused, s.look, gone, target ? "t" : ""].join(":");
  return { key, si, scene: sc, k, results: [...res], showAnswer, boss, wentOff, target, paused: s.paused, look: s.look };
}

/** The correct area of the marker's next spot, when the answers before it are in. */
function targetZone(s: FightState): Zone | null {
  const moves = s.route.filter((x) => !x.lookAhead);
  const target = moves.find((x) => x.hit > s.t && x.show <= s.t);
  if (!target || lookHold(s, target.si) >= 0) return null;
  const g = s.fight.segs[target.si];
  const res = s.results[target.si];
  if (res.length !== target.j) return null;
  const base = stepZone(g.scene.steps[target.j], res);
  return base ? rotZone(base, g.k) : null;
}

/* ---------- the HUD and the timeline ---------- */

/** The prompt above the arena: its look, the number on its left, and its text, plus the countdown
    ring around the boss (null to hide it). */
export interface Prompt {
  look: "ask" | "urgent" | "idle" | "ok" | "bad" | "later";
  count: string;
  text: string;
  /** How much of the ring has emptied, from 0 to 1, and whether it is red. */
  ring: { empty: number; urgent: boolean } | null;
}

/** A step's question as the player shows it. You watch there and do not click, so "Click it." goes,
    and "Click where the party stacks." reads "Where the party stacks.". */
export function watchQuestion(q: string): string {
  return q
    .replace(/\s*Click it\.$/, "")
    .replace(/(^|\. )Click (\S)/g, (_m, before: string, first: string) => before + first.toUpperCase())
    .replace(/: click /g, ": ");
}

export function promptOf(s: FightState): Prompt {
  const f = s.fight;
  const si = activeSeg(f, s.t);
  const g = si >= 0 ? f.segs[si] : null;
  const j = g ? s.results[si].length : 0;
  const held = lookHold(s, si);
  if (g && showingResult(s, g, j)) {
    // The run: the result of the step you just answered, before the next question.
    const x = s.results[si][j - 1];
    const ahead = Boolean(g.scene.steps[j - 1].lookAhead);
    const text = x.ok
      ? "Correct"
      : x.missed
        ? "Too slow"
        : ahead
          ? "Not that one. Look ahead: the purple one is the first weapon."
          : "Not there. The green area was correct.";
    return { look: x.ok ? "ok" : "bad", count: x.ok ? "✓" : "✗", text, ring: null };
  }
  if (g && held >= 0) {
    // Look ahead: the first line of the look-ahead answer, up to its first colon or full stop.
    const a = g.scene.steps[held].a[0];
    const cut = a.search(/[:.]/);
    const what = cut > 0 ? a.slice(0, cut) : a;
    return { look: "later", count: "✓", text: `Look ahead: ${what.charAt(0).toLowerCase()}${what.slice(1)}.`, ring: null };
  }
  if (g && j < g.due.length && s.t < askFrom(g, j))
    // The tell: a weapon question waits for the boss to turn to the first weapon.
    return { look: "idle", count: "", text: "Watch the boss: the arrow on his ring turns to the first weapon.", ring: null };
  if (g && j < g.due.length) {
    const left = Math.max(0, g.due[j] - s.t);
    const start = j ? g.due[j - 1] : g.from;
    // On the player you watch, so the prompt gives the correct move, and nothing turns red.
    const watch = s.mode === "watch";
    const urgent = left <= URGENT && !s.paused && !watch;
    return {
      look: urgent ? "urgent" : "ask",
      count: s.paused ? `${j + 1}/${g.due.length}` : left.toFixed(1),
      // The HUD has room for the move itself: the first line of the answer.
      text: watch ? g.scene.steps[j].a[0] : g.scene.steps[j].q,
      ring: s.paused ? null : { empty: 1 - Math.min(1, left / Math.max(0.1, g.due[j] - start)), urgent: left <= URGENT && !watch },
    };
  }
  const nx = upcoming(f, s.t);
  const text = g
    ? `Done. ${nx ? `Next: ${nx.title}` : "No more mechanics"}`
    : nx
      ? `Next: ${nx.title} in ${Math.ceil(nx.from - s.t)} s`
      : "No more mechanics";
  return { look: "idle", count: "", text, ring: null };
}

/** The cast bar: the next timeline line. It fills from the line before it, like a cast that
    starts when the last one ends, but never over more than CAST_MAX seconds. */
export interface Cast {
  casting: boolean;
  fill: number;
  name: string;
  left: string;
}

export function castOf(s: FightState): Cast {
  const k = s.lines.findIndex((e) => e.t > s.t - TIMELINE_KEEP);
  const e = k >= 0 ? s.lines[k] : null;
  if (!e) return { casting: false, fill: 0, name: "No more casts", left: "" };
  const left = e.t - s.t;
  const span = Math.max(1, Math.min(CAST_MAX, e.t - (k > 0 ? s.lines[k - 1].t : 0)));
  const casting = left <= span;
  return {
    casting,
    fill: casting ? Math.min(1, 1 - left / span) : 0,
    name: casting ? e.name : `Next: ${e.name}`,
    left: left > 0 ? (casting ? left.toFixed(1) : `${Math.round(left)} s`) : "",
  };
}

/** One cast in the list of casts coming up. */
export interface CastMark {
  /** Its place in s.lines, which stays the same while it is in view. */
  i: number;
  name: string;
  /** When it goes off, in fight seconds. */
  t: number;
  cats: Category[];
  raidwide: boolean;
  /** The boss's own cast, which starts a mechanic, rather than a hit. */
  cast: boolean;
  /** Seconds to go; below 0 once it happened. */
  left: number;
}

/** The casts in view: from `past` seconds ago (CASTS_PAST unless you say) to CASTS_AHEAD seconds
    ahead, in time order. */
export function castsAhead(s: FightState, past = CASTS_PAST): CastMark[] {
  return s.lines.flatMap((e, i) => {
    const left = e.t - s.t;
    return left >= -past && left <= CASTS_AHEAD
      ? [{ i, name: e.name, t: e.t, cats: categoriesAt(e.t), raidwide: Boolean(e.raidwide), cast: Boolean(e.cast), left }]
      : [];
  });
}

/** The hits among `marks` that went off since the last frame, when the clock was at `was`: those
    whose time came after `was` and by now. None when the clock jumped (a seek, or more than a
    second since the last frame), so only a playing fight shows them go off. */
export function hitsGoneOff(marks: readonly CastMark[], was: number, t: number): CastMark[] {
  if (t <= was || t - was > 1) return [];
  return marks.filter((m) => !m.cast && m.left <= 0 && m.left > was - t);
}

/** Where each cast sits in a list `height` pixels tall, from its top: the now line is at `nowY`,
    and CASTS_AHEAD seconds away is the bottom, so the gaps show the time between casts. Casts to
    come that come close are pushed down to stay `rowH` apart, so their names never overlap. A cast
    that went off pushes nothing: it fades out past the now line, and if it pushed the next one, that
    one would jump back up as it left. */
export function castPositions(marks: readonly CastMark[], height: number, nowY: number, rowH: number): number[] {
  const perSecond = (height - nowY) / CASTS_AHEAD;
  let prev = Number.NEGATIVE_INFINITY;
  return marks.map((m) => {
    const at = nowY + m.left * perSecond;
    if (m.left < 0) return at;
    const y = Math.max(at, prev + rowH);
    prev = y;
    return y;
  });
}
