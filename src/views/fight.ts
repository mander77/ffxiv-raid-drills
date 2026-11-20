// The full fight, under Pressure, in two ways.
// The run: every mechanic in fight order at real speed, like a game. Click your spot before each
// hit lands. The quiet time between mechanics is skipped, and at the end you see your score and
// the mechanics to practice.
// Watch the right moves: the player. A marker with your role runs the right spots, with a timeline
// like cactbot's. Its play bar pauses it, changes the speed and jumps to any moment, and Settings
// holds the fight pattern picks.
import { LS, esc, el } from "../util";
import { state, view, app, stopTimer, setChoices, record } from "../core";
import { rotZone, rotOverlay, inZone, zoneCenter } from "../geometry";
import { sceneSVG, drawOverlay, zoneSVG, layerIn } from "../arena";
import { paintArena } from "./map";
import { tabHead } from "./common";
import { patternRows, wirePattern } from "./pattern";
import { buildFight, buildHits, clock, choicesText, CHOICE_ROWS, RANDOM, type Choices, type Fight, type FightSeg, type Hit } from "../data/fight";
import { BOSS, facingNext, jumpsNext } from "../data/drills";
import { PUDDLE_LIFE, busterPieces } from "../data/attacks";
import { ABILITIES, CATS, catsAt } from "../data/abilities";
import { marks, catNames } from "./tlnav";
import { rightRoute, clickRoute, runnerAt, showOf, type Stop } from "../data/route";
import { routeLink, showRoute } from "../router";
import type { Boss, Point, Scene, Slot, StepResult } from "../types";

/** run = you click, like a game; watch = the right moves play by themselves on the player. */
type Mode = "run" | "watch";
/** A click in the run: segment si, step j, fight time t, arena spot p. */
interface Click { si: number; j: number; t: number; p: Point }
/* One run of the fight clock. */
interface Run {
  mode: Mode;
  fight: Fight;
  slot: Slot;                // the role the fight was built for; another role builds a new fight
  t: number;                 // fight time in seconds
  answeredAt: number;        // the run: fight time of your last answer, so its result shows for a moment
  stops: boolean;            // the run: stop at each new mechanic, so you can look before the clock runs
  stoppedAt: number;         // the run: the last segment it stopped at
  look: boolean;             // the run: stopped at a new mechanic, waiting for Go
  results: StepResult[][];   // one list per segment
  clicks: Click[];           // the run: your clicks, for the route your marker runs
  paused: boolean;
  last: number;              // performance.now() at the last frame
  shown: string;             // what the arena and panel show, so they redraw only on a change
  hits: Hit[];               // every hit of this fight, in time order (see buildHits)
  nextHit: number;           // the first hit in `hits` that has not shown yet
  bossAt: Point;             // where the boss stands on the arena now, for the tank buster pulse
  route: Stop[] | null;      // the route the marker runs: the right spots (watch) or your clicks (run)
  zoneKey: string;           // the target whose blue area is drawn ("si:j:answers"), so it redraws only on a change
  settings: boolean;         // the player's panel shows Settings instead of the fight
  setupOpen: boolean;        // the mechanic's setup text is unfolded
  setupSeg: number;          // the segment whose setup was unfolded; another segment folds it again
}

// Half speed is for learning the moves. The faster speeds are to see the whole fight quickly.
const SPEEDS = [0.5, 1, 1.5, 2];
const savedSpeed = LS.get("fspeed", 1);
let speed = SPEEDS.includes(savedSpeed) ? savedSpeed : 1;
// TS note: module-level `let` with a `| null` type. Every function that reads R first checks it,
// for example `const r = R; if(!r) return;`. After that check TypeScript knows r is a Run.
let R: Run | null = null;
/* A fight asked for by a link (/pressure/K3PZ/raw=axe?t=48.2): its code, and the moment to open
   it at. The link's picks replace the saved ones, so the same code builds the same fight. */
let wanted: { code: string; t?: number } | null = null;
export function openFight(code: string, picked: Choices, t?: number): void {
  wanted = {code, t};
  setChoices(picked);
}
/* Between mechanics the arena is empty, but it is two platforms from Flatliner until the
   Crown of Arcadia that joins them again. */
const IDLE: Scene = {setup:"", rule:"", steps:[], overlays:[], boss:BOSS};
const IDLE_SPLIT: Scene = {...IDLE, split:true};

/* ---------- opening the full fight ---------- */
/** True when a link asked for a fight that has not opened yet. */
export const fightWanted = (): boolean => wanted != null;
/** True when the full fight is on screen and was built for the other role (H1 or H2). */
export const fightNeedsSlot = (): boolean => R != null && state.cur?.kind === "fight" && R.slot !== state.slot;
/** Start the run: a new fight, from the pull. */
export function startFightRun(): void { startRun("run", buildFight(state.slot, undefined, state.choices)); }
/** Watch the right moves: a new fight on the player, playing from the pull. */
export function watchFight(): void { startRun("watch", buildFight(state.slot, undefined, state.choices)); }
/* A link opens its fight on the player, paused at its moment. Another role (H1 or H2) gets the
   same fight with its own spots: the player stays at the same moment, and a run starts again. */
export function renderFight(): void {
  stopTimer();
  const ask = wanted, was = R;
  wanted = null;
  if(ask || !was){
    startRun("watch", buildFight(state.slot, ask?.code, state.choices), true);
    if(ask?.t) seekTo(ask.t);
  } else if(was.slot !== state.slot){
    startRun(was.mode, buildFight(state.slot, was.fight.code, state.choices), was.mode === "watch", was.settings);
    if(was.mode === "watch") seekTo(was.t);
  } else {
    was.paused = true;
    mount();
  }
}

/** A screen of the full fight that is not the run or the player: the end screens. */
function show(inner: string): void {
  view.innerHTML = tabHead() + inner;
}

function goToSeg(r: Run, g: FightSeg): void {
  r.settings = false;
  seekTo(r.paused ? askAt(g, 0) : g.from);
}

/** How long the boss's turn shows before a question, in seconds (the turn takes half a second,
    see .turn in styles.css). */
const TURN_SHOW = 0.6;
/** The moment step j of a mechanic can be answered: the first step once the mechanic is on the
    floor (for the weapons, once the boss has turned to the first one), a later step once the
    hit before it landed and the boss turned to the next weapon. Always before the step's hit. */
function askAt(g: FightSeg, j: number): number {
  const ready = j === 0 ? (g.turn ? g.turn.at + TURN_SHOW : g.from) : g.due[j - 1] + TURN_AFTER + TURN_SHOW;
  return Math.max(g.from, Math.min(g.due[j] - 0.1, ready));
}

/** The next mechanic after segment si, or null after the last one. */
const nextSeg = (f: Fight, si: number): FightSeg | null => f.segs[si + 1] ?? null;

/** Enter on the player: paused at the end of a mechanic, go to the next one. */
export function enterKey(): boolean {
  const r = R;
  if(!r || r.mode !== "watch") return false;
  const si = activeSeg(r.fight, r.t), nx = si >= 0 ? nextSeg(r.fight, si) : null;
  if(r.paused && nx && r.results[si].length >= r.fight.segs[si].due.length){ goToSeg(r, nx); return true; }
  return false;
}

/* ---------- settings ---------- */
/* The fight pattern: every pick. A pick builds the same fight again with it, at the same moment. */
function pickRows(): string {
  return '<h3 class="fpick">Fight pattern</h3><p class="hint">Pick a part to practice it on purpose. Parts left on Random still come from the fight code. For a weapon order, press Set order, then drag the cards into the order the boss takes them.</p>' +
    patternRows(CHOICE_ROWS.map(r => r.key)) +
    (choicesText(state.choices) ? '<p style="margin-top:10px"><button type="button" class="linkbtn" id="f-allrandom">Set all to Random</button></p>' : "");
}

/* Build the fight again on the player: with a code, the same fight (after a pick changed);
   without one, a new fight. It stays at the same moment and keeps paused or playing. */
function rebuild(code?: string): void {
  const r = R;
  if(!r) return;
  const t = r.t;
  startRun(r.mode, buildFight(state.slot, code, state.choices), r.paused, r.settings);
  seekTo(t);
}

function drawSettings(r: Run): void {
  el("f-panel").innerHTML = '<div class="eyebrow"><b>Settings</b><span>Fight ' + r.fight.code + "</span></div><h2>Settings</h2>" + pickRows() +
    '<div class="actions"><button type="button" class="btn" id="f-done">Done</button></div>';
  wirePattern(() => rebuild(r.fight.code));
  document.getElementById("f-allrandom")?.addEventListener("click", () => { setChoices({...RANDOM}); rebuild(r.fight.code); });
  el("f-done").addEventListener("click", () => { r.settings = false; r.shown = ""; frame(); });
}

/** Save the player's speed when one of its buttons is clicked. */
function wireSpeed(root: Element): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-set="fspeed"]');
  buttons.forEach(b => b.addEventListener("click", () => {
    const r = R;
    if(!r) return;
    speed = Number(b.dataset.val);
    LS.set("fspeed", speed);
    buttons.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    r.shown = ""; r.last = performance.now();
    frame();
  }));
}

/* ---------- the run and the player ---------- */
function startRun(mode: Mode, fight: Fight, paused = false, settingsOpen = false): void {
  stopTimer();
  // The run starts LEAD seconds before the first mechanic, as after each skip, so it opens with
  // the 3-2-1 of the first mechanic.
  const t = mode === "run" ? Math.max(0, fight.segs[0].from - LEAD) : 0, hits = buildHits(fight), after = hits.findIndex(h => h.t > t);
  R = {mode, fight, slot:state.slot, t, answeredAt:-Infinity, stops:mode === "run" && LS.get("fstops", false), stoppedAt:-1, look:false,
       results:fight.segs.map(() => []), clicks:[], paused,
       last:performance.now(), shown:"", hits, nextHit:after < 0 ? hits.length : after, bossAt:[50, 50],
       // In the run the marker runs to your clicks; on the player it shows the right moves.
       route:mode === "watch" ? rightRoute(fight) : clickRoute(fight, []), zoneKey:"",
       settings:settingsOpen, setupOpen:false, setupSeg:-1};
  mount();
}

/* Put the fight on the page.
   The run: the HUD, the arena, and a bar with your progress, Pause and Quit. Over the arena: the
   3-2-1, your result for a moment, and the pause screen.
   The player: the HUD, the arena and the play bar on one side, the panel on the other.
   The flash and the hit's name sit over the arena, outside #f-arena, so a new scene does not
   remove them. */
function mount(): void {
  const r = R;
  if(!r) return;
  state.cur = {kind:"fight"};
  const box = '<div class="fxbox"><div id="f-arena"></div><div class="hitlbl" id="f-hit" role="status"></div>';
  if(r.mode === "run"){
    view.innerHTML = tabHead() + '<div class="runwrap"><div class="arena">' + HUD + box +
      '<div class="runfb" id="f-fb" role="status"></div><div class="runcount" id="f-count" hidden><b id="f-count-n"></b><span id="f-count-name"></span></div>' +
      '<div class="runpause" id="f-pause" hidden><button type="button" class="btn" id="f-resume">Resume</button></div>' +
      // With "stop at each new mechanic": a bar at the bottom of the arena, which leaves the floor in view.
      '<div class="runlook" id="f-look" hidden><span>New mechanic: <b id="f-look-name"></b>. Look at the floor, then press Go.</span><button type="button" class="btn" id="f-go">Go</button></div></div>' +
      '<div class="runbar"><span id="f-prog"></span><button type="button" class="btn ghost" id="f-play">Pause</button>' +
      '<button type="button" class="btn ghost" id="f-quit">Quit</button></div></div></div>';
    el("f-play").addEventListener("click", togglePause);
    el("f-resume").addEventListener("click", togglePause);
    el("f-quit").addEventListener("click", quit);
    el("f-go").addEventListener("click", togglePause);
  } else {
    // Paused, a badge shows in the row above the arena floor, beside the N.
    view.innerHTML = tabHead() + '<div class="stage"><div class="arena">' + HUD + box +
      '<div class="fpaused" id="f-paused" hidden><b>&#10074;&#10074; Paused</b><span>&middot; click the map to play</span></div></div>' + playBar(r.fight) + "</div>" +
      '<div class="panel" id="f-panel"></div></div>';
    const seek = el<HTMLInputElement>("f-seek");
    seek.addEventListener("pointerdown", () => { dragging = true; });
    seek.addEventListener("pointerup", () => { dragging = false; });
    seek.addEventListener("input", () => seekTo(Number(seek.value)));
    el("f-play").addEventListener("click", togglePause);
    el("f-gear").addEventListener("click", () => { const x = R; if(x){ x.settings = !x.settings; x.shown = ""; frame(); } });
    wireSpeed(el("f-bar"));
    // Start over: the same fight from the pull. New fight: a new one, at the same moment.
    el("f-restart").addEventListener("click", () => { const x = R; if(x) startRun(x.mode, x.fight, x.paused, x.settings); });
    el("f-new").addEventListener("click", () => rebuild());
  }
  r.shown = ""; r.zoneKey = ""; r.last = performance.now();
  frame();
  syncRoute();
  state.raf = requestAnimationFrame(tick);
}

/** Quit the run: your score so far, or the start screen of Pressure when you answered nothing. */
function quit(): void {
  const r = R;
  stopTimer();
  R = null;
  if(r && r.results.some(x => x.length)) return renderResult(r, true);
  app.render();
}

/* The play bar stays under the arena, outside the parts that redraw, so a drag is never cut off:
   play or pause, a slider for the fight time (its ticks mark where each mechanic starts), the
   time, Settings, then the speed and the buttons to start over or get a new fight. */
let dragging = false;
function playBar(f: Fight): string {
  // The bar sticks to the bottom of the screen while the arena is in view (.fplaybar).
  return '<div class="fplaybar"><div class="fctl"><button type="button" class="btn fplay" id="f-play" aria-label="Play">&#9654;</button>' +
    '<input type="range" id="f-seek" min="0" max="' + f.end + '" step="0.1" value="0" list="f-marks" aria-label="Fight time">' +
    '<span class="ftime" id="f-time"></span><button type="button" class="btn ghost fgear" id="f-gear" aria-pressed="false">Settings</button></div>' +
    '<datalist id="f-marks">' + f.segs.map(g => '<option value="' + g.from + '"></option>').join("") + "</datalist>" +
    '<div class="fbar" id="f-bar"><div class="seg small" role="group" aria-label="Speed">' +
    SPEEDS.map(n => '<button type="button" data-set="fspeed" data-val="' + n + '" aria-pressed="' + (n === speed) + '">' + n + "x</button>").join("") + "</div>" +
    '<span class="fbtns"><button type="button" class="btn ghost" id="f-restart">Start over</button><button type="button" class="btn ghost" id="f-new">New fight</button></span>' +
    '<span class="hint">Click the map<span class="keys"> or <kbd>Space</kbd></span>: play or pause<span class="keys"> &middot; <kbd>&larr;</kbd> <kbd>&rarr;</kbd> 5 seconds</span></span></div></div>';
}

/** The address bar on the player holds the fight, its picks and, while paused, the moment, so a
    copied link opens the same place. The run is not a place to link to: it shows the tab. */
function syncRoute(): void {
  const r = R;
  if(!r) return;
  if(r.mode === "run") return showRoute({tab:"pressure"});
  showRoute({tab:"pressure", code:r.fight.code, picks:choicesText(r.fight.choices) || undefined, t:r.paused && r.t > 0 ? Math.round(r.t * 10) / 10 : undefined});
}

/* Go to any moment on the player. Back: the answers to hits after that moment are forgotten.
   Forward: the player fills in the right moves it jumped over by itself. */
function seekTo(to: number): void {
  const r = R;
  if(!r) return;
  const f = r.fight;
  to = Math.max(0, Math.min(f.end, to));
  if(to < r.t) f.segs.forEach((g, si) => { const res = r.results[si]; while(res.length && g.due[res.length - 1] > to) res.pop(); });
  jump(r, to);
  syncRoute();
}
/** The arrow keys on the player. The run has no jumps. */
export function seekBy(d: number): void { if(R?.mode === "watch") seekTo(R.t + d); }

/** Set the clock to `to` without showing the hits in between, and build the arena again (the
    weapons that have not spawned yet must hide again). */
function jump(r: Run, to: number): void {
  r.t = to;
  const after = r.hits.findIndex(h => h.t > to);
  r.nextHit = after < 0 ? r.hits.length : after;
  r.shown = "";
  r.last = performance.now();
  frame();
}

/** The segment on the arena at time t, or -1 between mechanics. */
function activeSeg(f: Fight, t: number): number {
  for(let i = f.segs.length - 1; i >= 0; i--){
    const g = f.segs[i];
    if(t >= g.from) return t <= g.due[g.due.length - 1] + 3 ? i : -1;
  }
  return -1;
}

/** With nothing on the floor, the run skips to this many seconds before the next mechanic. */
const LEAD = 3;
/** The run: how long the result of a finished mechanic shows after its last hit, in seconds. */
const RESULT_HOLD = 2;

function tick(now: number): void {
  const r = R;
  if(!r) return;
  // A long gap (a hidden tab) does not jump the fight. The frame time `now` can be a little
  // earlier than a performance.now() taken in a click handler during the same frame, so dt
  // can come out below zero. The clock never runs back, or a jump to the start of a
  // mechanic lands a hair before it.
  const dt = Math.max(0, Math.min(0.25, (now - r.last) / 1000));
  r.last = now;
  const f = r.fight;
  // The run is at real speed. The player runs at the speed you picked.
  if(!r.paused) r.t += dt * (r.mode === "run" ? 1 : speed);
  // The run skips the waits. After your last click on a mechanic, its last hit lands at once.
  // Once its result has shown for RESULT_HOLD seconds, or with nothing on the floor, the run
  // goes on to LEAD seconds before the next mechanic (its 3-2-1, see countdown), and it ends
  // after the last one.
  if(r.mode === "run" && !r.paused){
    const si = activeSeg(f, r.t), g = si >= 0 ? f.segs[si] : null, last = g ? g.due[g.due.length - 1] : 0;
    const done = g != null && r.results[si].length >= g.due.length;
    if(done && r.t < last - 0.05) jump(r, last - 0.05);
    else if(!g || (done && r.t >= last + RESULT_HOLD)){
      const nx = f.segs.find(x => x.from > r.t);
      if(!nx) return finish();
      if(nx.from - r.t > LEAD) jump(r, nx.from - LEAD);
    }
  }
  // Damage going out: each hit shows once, on the frame the clock passes it.
  while(r.nextHit < r.hits.length && r.hits[r.nextHit].t <= r.t) showHit(r, r.hits[r.nextHit++]);
  f.segs.forEach((g, si) => {
    const j = r.results[si].length;
    if(j >= g.due.length || r.t < g.from) return;
    // The player answers at the hit, with the spot the marker ran to (see data/route.ts):
    // the blue target turns green as the mechanic goes off. A look-ahead step (which weapon is
    // first) has no hit, and the next step follows it closely, so the player answers it
    // LOOK_SHOW seconds early: the right weapon then stays on the floor before the next question.
    const at = r.mode === "watch" && g.scene.steps[j].look ? Math.max(g.from, g.due[j] - LOOK_SHOW) : g.due[j];
    if(r.mode === "watch" && r.t >= at) return answer(si, r.route?.find(s => s.si === si && s.j === j)?.p ?? null);
    if(r.t < g.due[j]) return;
    answer(si, null, true);
  });
  if(r.t >= f.end) return finish();
  // "Stop at each new mechanic": when a mechanic appears on the floor, the run waits for Go.
  if(r.stops && !r.paused){
    const si = activeSeg(f, r.t);
    if(si > r.stoppedAt && r.results[si].length === 0){ r.stoppedAt = si; r.paused = true; r.look = true; r.shown = ""; }
  }
  frame();
  state.raf = requestAnimationFrame(tick);
}

/** Score the next step of segment si: a click at p, the right spot (p null), or a step you were
    too slow for. In the run, a mechanic counts in your stats once all its steps are done. */
function answer(si: number, p: Point | null, missed = false): void {
  const r = R;
  if(!r) return;
  const g = r.fight.segs[si], res = r.results[si], step = g.scene.steps[res.length];
  const base = step.zf ? step.zf(res) : step.z;
  if(!base) return;
  const zone = rotZone(base, g.k), at: Point = p ?? zoneCenter(zone);
  const ok = !missed && inZone(at, zone);
  res.push({p:at, ok, z:zone, drop:step.drop ? (ok ? at : zoneCenter(zone)) : null, missed});
  if(r.mode !== "run") return;
  r.answeredAt = r.t;
  // Your marker runs to each spot you click, from the moment you click it.
  if(p){ r.clicks.push({si, j:res.length - 1, t:r.t, p}); r.route = clickRoute(r.fight, r.clicks); }
  if(res.length === g.due.length && g.drills[0]) record(g.drills[0], res.every(x => x.ok));
  result(ok ? "ok" : missed ? "slow" : "bad");
}

/** The run: your result over the arena for a moment. The right area shows on the floor too. */
function result(kind: "ok" | "bad" | "slow"): void {
  const n = document.getElementById("f-fb");
  if(!n) return;
  n.textContent = kind === "ok" ? "✓ Right" : kind === "bad" ? "✗ Not there" : "✗ Too slow";
  restart(n, "runfb show " + kind);
}

/** The run: how long the result of a step shows before the next question, in seconds. */
const RESULT_SHOW = 1.2;
/** How long "Watch the boss" stays after he starts to turn, so you see the arrow swing, in seconds. */
const TELL_HOLD = 1;
/** When step j of segment g can be answered: when it shows (see showOf in data/route.ts). A
    weapon that waits for the boss's turn waits TELL_HOLD seconds more. */
function askFrom(g: FightSeg, j: number): number {
  const s = showOf(g, j);
  return s > g.from ? s + TELL_HOLD : s;
}
/** The run, after you answer a step that is not the last of its mechanic (n steps answered): its
    result shows for RESULT_SHOW seconds, then it clears and the next question comes. */
const showingResult = (r: Run, g: FightSeg, n: number): boolean => r.mode === "run" && n > 0 && n < g.due.length && r.t < r.answeredAt + RESULT_SHOW;

function onClick(e: MouseEvent): void {
  const r = R;
  if(!r) return;
  // On the player, a click on the map pauses it or plays it again, like a video.
  if(r.mode === "watch") return togglePause();
  // The run takes your spots, but not during the 3-2-1 or a pause.
  if(r.paused) return;
  const si = activeSeg(r.fight, r.t), g = si >= 0 ? r.fight.segs[si] : null, j = g ? r.results[si].length : 0;
  // No answer before the question shows (a weapon only once the boss turns to the first one),
  // or while the last result shows.
  if(!g || j >= g.due.length || r.t < askFrom(g, j) || showingResult(r, g, j)) return;
  const svg = e.currentTarget as SVGSVGElement, ctm = svg.getScreenCTM();
  if(!ctm) return;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  answer(si, [q.x, q.y]);
  frame();
}

/** Pause or go on (the buttons and the space bar). */
export function togglePause(): void {
  const r = R;
  if(!r) return;
  r.paused = !r.paused;
  r.look = false;   // Go after a stop at a new mechanic works the same way
  r.last = performance.now();
  r.shown = "";
  frame();
  syncRoute();
}

/* Redraw the arena and the panel when what they show has changed, and update the clock,
   the cast bar and the countdown on every frame. */
function frame(): void {
  const r = R;
  if(!r) return;
  const f = r.fight, si = activeSeg(f, r.t), g = si >= 0 ? f.segs[si] : null, res = g ? r.results[si] : [];
  const turned = Boolean(g?.turn && r.t >= g.turn.at);
  // What the arena shows: a mechanic's scene, or the empty arena, whole or split.
  const where = g ? String(si) : r.t >= f.split[0] && r.t < f.split[1] ? "split" : "idle";
  // On the player, the green answer and what the mechanic did show for GREEN_FOR seconds after
  // the hit, then clear, so the next blue target is the only area on the floor.
  // In the run, the green answer shows with its result for RESULT_SHOW seconds, then clears so
  // it is not taken for the answer to the next question. At the end of a mechanic it stays.
  const lastHit = g && res.length ? g.due[res.length - 1] : -Infinity;
  const showAnswer = res.length > 0 && (r.mode === "watch" ? r.t - lastHit < GREEN_FOR : res.length >= (g?.due.length ?? 0) || r.t < r.answeredAt + RESULT_SHOW);
  // After a weapon hits, he turns to face the next weapon. He lands on it JUMP_LEAD seconds
  // before it hits.
  const facing = res.length > 0 && r.t >= lastHit + TURN_AFTER;
  const jumped = Boolean(g && res.length < g.due.length && r.t >= g.due[res.length] - JUMP_LEAD && jumpsNext(g.scene, res.length));
  // A puddle goes off PUDDLE_LIFE seconds after it drops, and then fades from the floor.
  const gone = (i: number): boolean => Boolean(g && res[i]?.drop && r.t >= g.due[i] + PUDDLE_LIFE);
  const goneN = res.filter((_x, i) => gone(i)).length;
  const key = [where, res.length, turned, facing, jumped, showAnswer, r.paused, r.settings, r.setupOpen, speed, goneN].join(":");
  if(key !== r.shown){
    const fresh = r.shown.split(":")[0] !== where;   // a new scene: build the arena again
    r.shown = key;
    const sc = g ? g.scene : where === "split" ? IDLE_SPLIT : IDLE, k = g ? g.k : 0;
    if(fresh){
      el("f-arena").innerHTML = sceneSVG(sc, k);
      el("arena-svg").addEventListener("click", onClick);
      // The flash for damage going out and the countdown ring go over the arena, but under the
      // player marks. Both let clicks through (see .hitfx and .tring).
      layerIn(el("arena-svg"), "effects")?.insertAdjacentHTML("beforeend",
        '<rect id="f-fx" class="hitfx" x="0" y="0" width="100" height="100" aria-hidden="true"/>' +
        '<circle id="tring" class="tring" r="16" pathLength="100" stroke-dasharray="100"/>');
    }
    let boss: Boss | null = sc.bossAt ? sc.bossAt(res.length + (jumped ? 1 : 0)) : (sc.boss ? rotOverlay(sc.boss, k) : null);
    // In the middle, before his cast, he faces no weapon. When the cast starts he turns to the first one.
    if(boss && g?.turn && boss.x === 50 && boss.y === 50) boss = {...boss, f:turned ? g.turn.f : null};
    // Once he has landed, he faces the way he jumped.
    if(boss && facing && !jumped) boss = facingNext(sc, res.length, boss);
    // On the player your marker walks into each spot, so the green area needs no "Right spot" tag.
    paintArena(el("arena-svg"), sc, k, res, showAnswer, boss, gone, r.mode !== "watch");
    // The ring sits around the boss, and moves with him when he jumps. It starts at the top.
    const c = boss ?? {x:50, y:50};
    r.bossAt = [c.x, c.y];
    const ring = el("tring");
    ring.setAttribute("cx", String(c.x)); ring.setAttribute("cy", String(c.y));
    ring.setAttribute("transform", "rotate(-90 " + c.x + " " + c.y + ")");
    if(r.mode === "watch") drawPanel(r, si);
  }
  updateLive(r);
}

function lastBox(g: FightSeg, i: number, x: StepResult): string {
  return '<div class="lastans ' + (x.ok ? "ok" : "bad") + '"><span class="tag">' + (x.ok ? "Right" : "Not there") + "</span><b>" + esc(g.scene.steps[i].q) + "</b> " + esc(g.scene.steps[i].a) + "</div>";
}

/* The player's panel: what the clock is doing, the timeline, then the mechanic on the arena.
   Its setup folds after the first hit, the steps show as chips, and at the end the rule shows
   with the way on to the next mechanic. Between mechanics: the next mechanic and the next ability. */
function drawPanel(r: Run, si: number): void {
  if(r.settings) return drawSettings(r);
  const f = r.fight, g = si >= 0 ? f.segs[si] : null, res = g ? r.results[si] : [];
  let h = '<div class="eyebrow"><b>The right moves</b><span id="f-clock"></span><span>' + speed + "x</span></div>";
  h += '<ol class="ftl" id="f-tl" aria-label="Fight timeline"></ol>';
  if(g){
    const j = res.length, n = g.due.length, done = j >= n;
    if(r.setupSeg !== si){ r.setupSeg = si; r.setupOpen = false; }
    h += "<h2>" + esc(g.title) + "</h2>";
    if(g.scene.setup){
      if(j === 0) h += '<p class="setup">' + esc(g.scene.setup) + "</p>";
      else h += '<p class="setup' + (r.setupOpen ? "" : " folded") + '">' + esc(g.scene.setup) + '</p><button type="button" class="linkbtn" id="setup-toggle">' + (r.setupOpen ? "Less" : "More") + "</button>";
    }
    if(n > 1) h += '<ol class="chips" aria-label="Steps">' + g.due.map((_d, i) => {
      const x = res[i];
      if(!x) return '<li><span class="chip' + (i === j ? " now" : "") + '">' + (i + 1) + "</span></li>";
      return '<li><span class="chip ' + (x.ok ? "ok" : "bad") + '">' + (i + 1) + (x.ok ? " &#10003;" : " &#10007;") + "</span></li>";
    }).join("") + "</ol>";
    if(!done) h += '<div class="nowq"><span>Step ' + (j + 1) + " of " + n + (r.paused ? "" : ' &middot; hits in <b id="f-due"></b>') + "</span>" + esc(g.scene.steps[j].q) + "</div>";
    if(j > 0) h += lastBox(g, j - 1, res[j - 1]);
    if(done){
      const nx = nextSeg(f, si);
      if(g.scene.rule) h += '<div class="rule"><span>Rule</span><strong>' + esc(g.scene.rule) + "</strong></div>";
      h += '<div class="actions">' + (nx ? '<button type="button" class="btn" id="f-nextseg">Next: ' + esc(nx.title) + "</button>" : "") +
        '<button type="button" class="btn ghost" id="f-again">Watch it again</button>' + (nx && r.paused ? '<span class="hint keys"><kbd>Enter</kbd> next</span>' : "") + "</div>";
    } else if(g.scene.spawnPlay) h += '<div class="actions"><button type="button" class="btn ghost" id="f-spawns">Watch the spawns again</button></div>';
  } else {
    const nx = f.segs.find(x => x.from > r.t), a = ABILITIES.find(x => x.t >= r.t);
    h += "<h2>Between mechanics</h2>";
    if(nx) h += '<p class="setup">Next mechanic: ' + esc(nx.title) + " at " + clock(nx.from) + '.</p><div class="actions"><button type="button" class="btn" id="f-goto">Go to ' + esc(nx.title) + "</button></div>";
    if(a) h += '<div class="lastans"><span class="tag">Next ability &middot; ' + clock(a.t) + "</span><b>" + esc(a.name) + '</b><p class="cmline">' + marks(a.cats) + esc(catNames(a.cats)) + "</p>" + esc(a.note) + "</div>";
    if(r.paused) h += '<p class="hint" style="margin-top:10px">Paused. Press Play to run the fight clock.</p>';
  }
  el("f-panel").innerHTML = h;
  document.getElementById("setup-toggle")?.addEventListener("click", () => { r.setupOpen = !r.setupOpen; frame(); });
  document.getElementById("f-nextseg")?.addEventListener("click", () => { const nx = nextSeg(f, si); if(nx) goToSeg(r, nx); });
  document.getElementById("f-again")?.addEventListener("click", () => { if(g) goToSeg(r, g); });
  document.getElementById("f-goto")?.addEventListener("click", () => { const nx = f.segs.find(x => x.from > r.t); if(nx) goToSeg(r, nx); });
  // The spawns play again when the scene is built again.
  document.getElementById("f-spawns")?.addEventListener("click", () => { r.shown = ""; frame(); });
}

/* The timeline works like cactbot's raidboss timeline, with its default settings: a line
   shows once it is 30 seconds away, at most 6 lines show, a line turns "soon" in its last
   6 seconds, and a line that just happened stays for 0.7 seconds. Each bar fills as its
   line comes closer. */
const SHOW_AT = 30, SOON = 6, KEEP = 0.7, ROWS = 6;

function updateLive(r: Run): void {
  const f = r.fight, set = (id: string, s: string): void => { const n = document.getElementById(id); if(n && n.textContent !== s) n.textContent = s; };
  const si = activeSeg(f, r.t), play = document.getElementById("f-play");
  if(r.mode === "run"){
    // The 3-2-1 before each mechanic: in the last LEAD seconds before it, while no step is asked.
    // It runs on the fight clock, so a pause stops it too.
    const g = si >= 0 ? f.segs[si] : null, asking = g != null && r.results[si].length < g.due.length;
    const nx = asking ? null : f.segs.find(x => x.from > r.t), left = nx ? nx.from - r.t : 0;
    document.getElementById("f-count")?.toggleAttribute("hidden", !(nx && left > 0 && left <= LEAD));
    if(nx && left > 0 && left <= LEAD){ set("f-count-n", String(Math.ceil(left))); set("f-count-name", nx.title); }
    // The pause screen, the Pause button and your progress.
    // A stop at a new mechanic shows the Go bar, which leaves the floor in view; Pause covers it.
    document.getElementById("f-pause")?.toggleAttribute("hidden", !r.paused || r.look);
    document.getElementById("f-look")?.toggleAttribute("hidden", !r.look);
    if(r.look && si >= 0) set("f-look-name", f.segs[si].title);
    if(play) set("f-play", r.look ? "Go" : r.paused ? "Resume" : "Pause");
    const i = si >= 0 ? si : f.segs.findIndex(x => x.from > r.t);
    set("f-prog", "Mechanic " + (i < 0 ? f.segs.length : i + 1) + " of " + f.segs.length);
  } else {
    set("f-clock", clock(r.t));
    set("f-time", clock(r.t) + " / " + clock(f.end));
    const seek = document.getElementById("f-seek") as HTMLInputElement | null;
    if(seek && !dragging) seek.value = r.t.toFixed(1);
    if(play){
      play.innerHTML = r.paused ? "&#9654;" : "&#10074;&#10074;";
      play.setAttribute("aria-label", r.paused ? "Play" : "Pause");
    }
    document.getElementById("f-paused")?.toggleAttribute("hidden", !r.paused);
    document.getElementById("f-gear")?.setAttribute("aria-pressed", String(r.settings));
  }
  const tl = document.getElementById("f-tl");
  if(tl){
    // cactbot's "--sync--" lines (like "--middle--") are markers, not attacks, so they do not show.
    const lines = f.events.filter(e => !e.name.startsWith("--"));
    const rows = lines.filter(e => e.t >= r.t - KEEP && e.t - r.t <= SHOW_AT).slice(0, ROWS);
    const next = lines.find(e => e.t > r.t);
    tl.innerHTML = rows.length ? rows.map(e => {
      const left = e.t - r.t, fill = Math.max(0, Math.min(1, 1 - left / SHOW_AT));
      const cls = (left <= 0 ? "now" : left <= SOON ? "soon" : "") + (e.raidwide ? " rw" : ""), cats = catsAt(e.t);
      // A line that names an ability in the ability list gets its colour marks.
      return '<li class="' + cls + '"><i style="width:' + (fill * 100).toFixed(1) + '%"></i><span>' + (cats.length ? marks(cats) : "") + esc(e.name) + "</span><b>" + (left > 0 ? left.toFixed(1) : "") + "</b></li>";
    }).join("") : '<li class="idle"><span>' + (next ? "Next: " + esc(next.name) + " in " + Math.round(next.t - r.t) + " s" : "No more lines") + "</span></li>";
  }
  if(si >= 0){
    const g = f.segs[si], j = r.results[si].length;
    if(j < g.due.length) set("f-due", Math.max(0, g.due[j] - r.t).toFixed(1) + " s");
  }
  updateHud(r, si);
  drawRunner(r);
}

/* ---------- the moving marker ---------- */
/** How long the player keeps a green answer on the floor after its hit, in seconds. */
const GREEN_FOR = 1.5;
/** How long before its due time the player answers a look-ahead step, in seconds. */
const LOOK_SHOW = 4;
/** On the player, from the early answer of a look-ahead step until its due time, the answer holds
    the screen: the HUD shows it, and the next step's question and blue area wait. Returns the
    look-ahead step, or -1. */
function lookHold(r: Run, si: number): number {
  if(r.mode !== "watch" || si < 0) return -1;
  const g = r.fight.segs[si], j = r.results[si].length - 1;
  return j >= 0 && g.scene.steps[j].look && r.t < g.due[j] ? j : -1;
}
/** How long after a weapon hits the boss turns to face the next one, in seconds. No source
    gives this time: cactbot has only the jump itself, about 2 seconds before the next hit, and
    the hits are about 5 seconds apart. So this is an estimate, and he turns well before he jumps. */
const TURN_AFTER = 1.0;
/** How long before a weapon hits the boss lands on it, in seconds: cactbot's "--jump N--" lines
    come 2.0 seconds before each "Assault Evolved N" hit, in both sets. */
const JUMP_LEAD = 2.0;
/* A marker with your role runs a route: the right spots on the player, and your own clicks in
   the run (it goes to a spot when you click it). It waits on each spot until the hit lands,
   then runs to the next one at run speed. Its target (the spot for the next hit) shows in blue:
   a dotted line from the marker and a ring on the exact spot, and on the player also the whole
   area that is right. At the hit, the answer turns that area green (see frame). The arena is
   built again for each mechanic, so the marker is added back when it is missing. */
function drawRunner(r: Run): void {
  const svg = document.getElementById("arena-svg");
  if(!svg || !r.route) return;
  if(!document.getElementById("f-runner")){
    // The target area goes with the other zones, under the answer zone. The marker, line and
    // ring go on top of everything, over your own click.
    layerIn(svg, "zones")?.insertAdjacentHTML("afterbegin", '<g id="f-runzone" aria-hidden="true"></g>');
    layerIn(svg, "me")?.insertAdjacentHTML("beforeend", '<g id="f-runner" aria-hidden="true"><line class="runpath" id="f-runpath"/><circle class="runnext" id="f-runnext" r="2.6"/>' +
      '<g id="f-runme"><circle class="runhalo" r="4.2"/>' + drawOverlay({t:"mark", x:0, y:0, l:state.slot, r:"H"}) + "</g></g>");
    r.zoneKey = "";
  }
  const {at, target} = runnerAt(r.route, r.t), to = target?.p;
  const me = document.getElementById("f-runme"), path = document.getElementById("f-runpath"), next = document.getElementById("f-runnext");
  me?.setAttribute("transform", "translate(" + at[0].toFixed(2) + " " + at[1].toFixed(2) + ")");
  // The line shows while the marker still has to get there; the ring shows until the hit.
  const away = Boolean(to) && Math.hypot((to?.[0] ?? 0) - at[0], (to?.[1] ?? 0) - at[1]) > 0.5;
  path?.toggleAttribute("hidden", !away);
  next?.toggleAttribute("hidden", !to);
  if(to && path && next){
    path.setAttribute("x1", at[0].toFixed(2)); path.setAttribute("y1", at[1].toFixed(2));
    path.setAttribute("x2", to[0].toFixed(2)); path.setAttribute("y2", to[1].toFixed(2));
    next.setAttribute("cx", to[0].toFixed(2)); next.setAttribute("cy", to[1].toFixed(2));
  }
  // The right area for the target, in blue, on the player. It is drawn again only when the
  // target changes. It needs the answers before it in that mechanic (a puddle depends on the last).
  // The key holds the number of answers too: right after a jump with the slider, the player
  // fills in the earlier answers on the next frame, and the area can only be drawn after that.
  const key = r.mode === "watch" && target && lookHold(r, target.si) < 0 ? target.si + ":" + target.j + ":" + r.results[target.si].length : "";
  if(key !== r.zoneKey){
    r.zoneKey = key;
    const layer = document.getElementById("f-runzone"), g = target ? r.fight.segs[target.si] : null;
    const step = g && target ? g.scene.steps[target.j] : null, res = target ? r.results[target.si] : [];
    const base = step && target && res.length === target.j ? (step.zf ? step.zf(res) : step.z) : undefined;
    if(layer) layer.innerHTML = key && g && base ? zoneSVG(rotZone(base, g.k), "pick") : "";
  }
}

/* ---------- damage going out ---------- */
/* Each hit (buildHits in data/fight.ts) shows over the arena for a moment, with the ability
   list's category: its colour mark and name, the same as in the colour key. */

/** Start a CSS animation again on an element that may still run it: drop the classes, make the
    browser lay the page out (reading its size does that), then add them back. It works for HTML
    and SVG elements. */
function restart(n: Element, cls: string): void {
  n.setAttribute("class", "");
  void n.getBoundingClientRect();
  n.setAttribute("class", cls);
}

function showHit(r: Run, h: Hit): void {
  const fx = document.getElementById("f-fx"), label = document.getElementById("f-hit");
  if(label){ label.innerHTML = marks([h.cat]) + "<span>" + esc(CATS[h.cat] + " · " + h.name) + "</span>"; restart(label, "hitlbl show"); }
  // The flash takes the category's colour (see .hitfx in styles.css).
  if(fx && (h.kind === "raid" || h.kind === "shared" || h.kind === "enrage")) restart(fx, "hitfx " + h.kind + " " + h.cat);
  if(h.kind === "tank"){
    // The tanks, where they take the buster, and the hit on them, under the other player marks.
    // It removes itself when it has faded.
    const svg = document.getElementById("arena-svg");
    if(svg) layerIn(svg, "effects")?.insertAdjacentHTML("beforeend", '<g class="fx-buster">' + busterPieces(h.name, r.bossAt).map(drawOverlay).join("") + "</g>");
    const hit = document.querySelector("#arena-svg .fx-buster:last-of-type");
    setTimeout(() => hit?.remove(), BUSTER_MS);
  }
}

const BUSTER_MS = 1500;
/* ---------- the HUD ---------- */
/* In the game, the boss cast bar and the floor are in the middle of the screen. The HUD puts
   the same things right above the arena floor: a cast bar for the next timeline line, your
   prompt, and the seconds left to your hit (the step number while paused). The ring around the
   boss shows that time too. The HUD is built once per run; each frame only changes its text,
   widths and classes. */
const HUD = '<div class="hud"><div class="hcast" id="h-cast"><i id="h-fill"></i><span id="h-name"></span><b id="h-left"></b></div>' +
  '<div class="hq" id="h-q"><b class="hcount" id="h-count"></b><span id="h-text"></span></div></div>';
const CAST_MAX = 10;   // the longest a cast bar takes to fill, in seconds
const URGENT = 3;      // the last seconds before a hit turn the prompt and the ring red

function updateHud(r: Run, si: number): void {
  const f = r.fight, put = (id: string, s: string): void => { const n = document.getElementById(id); if(n && n.textContent !== s) n.textContent = s; };
  const box = document.getElementById("h-q"), cast = document.getElementById("h-cast"), fill = document.getElementById("h-fill"), ring = document.getElementById("tring");
  if(!box || !cast || !fill) return;
  // The cast bar: the next line that is not a "--sync--" marker. It fills from the line before it,
  // like a cast that starts when the last one ends, but never over more than CAST_MAX seconds.
  const lines = f.events.filter(e => !e.name.startsWith("--")), k = lines.findIndex(e => e.t > r.t - KEEP);
  const e = k >= 0 ? lines[k] : null;
  if(e){
    const left = e.t - r.t, span = Math.max(1, Math.min(CAST_MAX, e.t - (k > 0 ? lines[k - 1].t : 0)));
    const casting = left <= span;
    cast.classList.toggle("idle", !casting);
    fill.style.width = casting ? (Math.min(1, 1 - left / span) * 100).toFixed(1) + "%" : "0%";
    put("h-name", casting ? e.name : "Next: " + e.name);
    put("h-left", left > 0 ? (casting ? left.toFixed(1) : Math.round(left) + " s") : "");
  } else { cast.classList.add("idle"); fill.style.width = "0%"; put("h-name", "No more casts"); put("h-left", ""); }
  // Your prompt and the time left (the step number while paused), or the next mechanic.
  const g = si >= 0 ? f.segs[si] : null, j = g ? r.results[si].length : 0, held = lookHold(r, si);
  if(g && showingResult(r, g, j)){
    // The run: the result of the step you just answered, before the next question.
    const x = r.results[si][j - 1];
    box.className = "hq done " + (x.ok ? "ok" : "bad");
    put("h-count", x.ok ? "✓" : "✗");
    // A look-ahead answer (which weapon is first) is drawn in purple, saved for later.
    const look = Boolean(g.scene.steps[j - 1].look);
    put("h-text", x.ok ? "Right" : x.missed ? "Too slow" : look ? "Not that one. The purple one is the weapon to save for later." : "Not there. The green area was right.");
    if(ring) ring.style.display = "none";
  } else if(g && held >= 0){
    // The look-ahead answer up to its first colon or full stop ("The sword, north: its flat
    // side ..."), shown as saved for later: "Saved for later: the sword, north."
    const a = g.scene.steps[held].a, cut = a.search(/[:.]/), what = cut > 0 ? a.slice(0, cut) : a;
    box.className = "hq done later";
    put("h-count", "✓");
    put("h-text", "Saved for later: " + what.charAt(0).toLowerCase() + what.slice(1) + ".");
    if(ring) ring.style.display = "none";
  } else if(g && j < g.due.length && r.t < askFrom(g, j)){
    // A weapon question waits for the tell: the boss turns to face the first weapon.
    box.className = "hq idle";
    put("h-count", "");
    put("h-text", "Watch the boss: the arrow on his ring turns to the first weapon.");
    if(ring) ring.style.display = "none";
  } else if(g && j < g.due.length){
    const left = Math.max(0, g.due[j] - r.t), start = j ? g.due[j - 1] : g.from;
    // On the player you watch, so the HUD gives the right move instead of a question to click,
    // and nothing turns red: no one is timing you.
    const watch = r.mode === "watch";
    box.className = "hq" + (left <= URGENT && !r.paused && !watch ? " urgent" : "");
    put("h-count", r.paused ? (j + 1) + "/" + g.due.length : left.toFixed(1));
    put("h-text", watch ? g.scene.steps[j].a : g.scene.steps[j].q);
    if(ring){
      ring.style.display = r.paused ? "none" : "";
      ring.classList.toggle("urgent", left <= URGENT && !watch);
      ring.setAttribute("stroke-dashoffset", (100 * (1 - Math.min(1, left / Math.max(0.1, g.due[j] - start)))).toFixed(1));
    }
  } else {
    const nx = f.segs.find(x => x.from > r.t);
    box.className = "hq idle";
    put("h-count", "");
    put("h-text", g ? "Done. " + (nx ? "Next: " + nx.title : "No more mechanics") : nx ? "Next: " + nx.title + " in " + Math.ceil(nx.from - r.t) + " s" : "No more mechanics");
    if(ring) ring.style.display = "none";
  }
}

/* ---------- the end ---------- */
function finish(): void {
  const r = R;
  if(!r) return;
  stopTimer();
  R = null;
  if(r.mode === "run") renderResult(r);
  else renderWatched(r.fight);
}

/* After the run: your score, and each mechanic with a wrong or missed spot, with a link to
   practice it on its own. */
function renderResult(r: Run, stopped = false): void {
  state.cur = {kind:"fight"};
  const f = r.fight, all = r.results.flat(), right = all.filter(x => x.ok).length, slow = all.filter(x => x.missed).length, wrong = all.length - right - slow;
  const misses = f.segs.filter((_g, si) => r.results[si].some(x => !x.ok));
  // After Quit: how far you got, counted in mechanics you answered at least once.
  const reached = r.results.filter(x => x.length).length;
  const list = misses.length ? '<h3 class="fmiss-h">Practice these</h3><ul class="fmiss">' + misses.map(g => "<li><span>" + esc(g.title) + "</span>" +
    (g.drills[0] ? '<a class="btn ghost" href="' + routeLink({tab:"map", drill:g.drills[0]}) + '">Practice it</a>' : "") + "</li>").join("") + "</ul>"
    : stopped ? "<p>Every spot right so far.</p>" : "<p>Every spot right. Each run gets a new pattern, so run it again.</p>";
  show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Full fight</b><span>' + (stopped ? "Stopped at mechanic " + reached + " of " + f.segs.length : "Done") + "</span></div>" +
    "<h2>" + right + " of " + all.length + " spots right</h2>" +
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">' + right + '</div></div><div class="bad"><span>Wrong</span><div class="big">' + wrong + '</div></div><div class="slow"><span>Too slow</span><div class="big">' + slow + "</div></div></div>" +
    list + '<div class="actions"><button type="button" class="btn" id="f-again">Run again</button><button type="button" class="btn ghost" id="f-watch">Watch the right moves</button></div></div></div>');
  el("f-again").addEventListener("click", startFightRun);
  // The same fight, so you see the right moves for the patterns you just had.
  el("f-watch").addEventListener("click", () => startRun("watch", f));
}

/* After watching: run the same fight, or watch it again. */
function renderWatched(f: Fight): void {
  state.cur = {kind:"fight"};
  show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>The right moves</b><span>Done</span></div><h2>That was the right way through</h2>' +
    "<p>" + esc(f.summary) + "</p>" +
    '<div class="actions"><button type="button" class="btn" id="f-run">Run this fight</button><button type="button" class="btn ghost" id="f-watch">Watch again</button></div></div></div>');
  el("f-run").addEventListener("click", () => startRun("run", f));
  el("f-watch").addEventListener("click", () => startRun("watch", f));
}
