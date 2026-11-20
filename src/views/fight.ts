// "Where do I stand?": the whole fight in one player. The play bar under the arena is always
// there. Paused, it is step by step: a click on a drill or an ability in the fight list moves the
// fight clock there, and you answer each step with no timer. After each answer the hit lands,
// and then the clock moves on to the next question. Playing, the fight runs on the fight clock
// with a timeline like cactbot's. Settings holds the missed-spot rule, the moving marker and the
// fight pattern picks.
import { LS, esc, el } from "../util";
import { state, view, stopTimer, setChoices, record } from "../core";
import { rotZone, rotOverlay, inZone, zoneCenter } from "../geometry";
import { sceneSVG, drawOverlay, zoneSVG, layerIn } from "../arena";
import { paintArena } from "./map";
import { tabHead, hudPrompt, segRow } from "./common";
import { patternRows, wirePattern } from "./pattern";
import { buildFight, clock, choicesText, CHOICE_ROWS, RANDOM, type Choices, type Fight, type FightSeg } from "../data/fight";
import { BOSS, facingNext, jumpsNext } from "../data/drills";
import { WALL_W } from "../data/attacks";
import { ABILITIES, CATS, catsAt, type Cat } from "../data/abilities";
import { tlNav, wireNav, markNav, marks, catNames } from "./tlnav";
import { rightRoute, clickRoute, runnerAt, type Stop } from "../data/route";
import { showRoute } from "../router";
import type { Boss, Overlay, Point, Scene, Slot, StepResult } from "../types";

/** live = you click; demo = the right clicks play by themselves; replay = your clicks play back. */
type Mode = "live" | "demo" | "replay";
/** A click in a live run: segment si, step j, fight time t, arena spot p. */
interface Click { si: number; j: number; t: number; p: Point }
/* One run of the fight clock. */
interface Run {
  mode: Mode;
  fight: Fight;
  slot: Slot;                // the role the fight was built for; another role builds a new fight
  t: number;                 // fight time in seconds
  results: StepResult[][];   // one list per segment
  clicks: Click[];           // live: your clicks, kept for the replay; replay: the clicks to play back
  next: number;              // replay: the next click to play back
  paused: boolean;           // the play bar: paused is step by step, playing runs the fight clock
  // The fight can also hold the clock: with "Fight pauses", it waits for a missed click
  // ("wait"), and it shows why a spot was wrong until you press Next step ("review"). While
  // paused, a wrong spot always shows why.
  hold: "" | "wait" | "review";
  review: number;            // while hold is "review": the segment whose wrong answer shows
  last: number;              // performance.now() at the last frame
  shown: string;             // what the arena and panel show, so they redraw only on a change
  hits: Hit[];               // every hit of this fight, in time order (see buildHits)
  nextHit: number;           // the first hit in `hits` that has not shown yet
  bossAt: Point;             // where the boss stands on the arena now, for the tank buster pulse
  route: Stop[] | null;      // the route the marker runs: the right spots (demo) or your clicks (live and replay)
  zoneKey: string;           // the target whose blue area is drawn ("si:j:answers"), so it redraws only on a change
  settings: boolean;         // the panel shows Settings instead of the fight
  setupOpen: boolean;        // the mechanic's setup text is unfolded
  setupSeg: number;          // the segment whose setup was unfolded; another segment folds it again
}
/** A finished live run, for the summary and the replays. */
interface Done { fight: Fight; clicks: Click[]; results: StepResult[][] }

// Half speed is for learning the moves. The faster speeds are for practice under pressure.
const SPEEDS = [0.5, 1, 1.5, 2];
const savedSpeed = LS.get("fspeed", 1);
const settings = {
  speed: SPEEDS.includes(savedSpeed) ? savedSpeed : 1,
  pause: LS.get<string>("fpause", "no") === "yes"
};
// TS note: module-level `let` with a `| null` type. Every function that reads R first checks it,
// for example `const r = R; if(!r) return;`. After that check TypeScript knows r is a Run.
let R: Run | null = null;
let lastLive: Done | null = null;
/* A fight asked for by a link (/map/K3PZ/raw=axe?t=48.2): its code, and the moment to open it
   at. The link's picks replace the saved ones, so the same code builds the same fight. */
let wanted: { code: string; t?: number } | null = null;
export function openFight(code: string, picked: Choices, t?: number): void {
  wanted = {code, t};
  setChoices(picked);
}
/* Between mechanics the arena is empty, but it is two platforms from Flatliner until the
   Crown of Arcadia that joins them again. */
const IDLE: Scene = {setup:"", rule:"", steps:[], overlays:[], boss:BOSS};
const IDLE_SPLIT: Scene = {...IDLE, split:true};

/* ---------- opening the tab ---------- */
/* The tab opens the player, paused at the pull, with a new fight. Back on the tab, the fight you
   were on is still there, paused. A link opens its own fight, at its moment. Another role (H1 or
   H2) gets the same fight, at the same moment, with its own spots. */
export function renderFight(): void {
  stopTimer();
  const ask = wanted, was = R;
  wanted = null;
  if(ask || !was){
    startRun("live", buildFight(state.slot, ask?.code, state.choices), [], true);
    if(ask?.t) seekTo(ask.t);
  } else if(was.slot !== state.slot){
    startRun("live", buildFight(state.slot, was.fight.code, state.choices), [], true, was.settings);
    seekTo(was.t);
  } else {
    was.paused = true;
    mount();
  }
}

/* ---------- the fight list ---------- */
let navKey = "";   // what the list highlights, so it updates only when that changes

/** A screen beside the fight list: the summary and the step-through. */
function show(inner: string): void {
  view.innerHTML = tabHead() + '<div class="mapwrap">' + tlNav() + inner + "</div>";
  navKey = "";
  wireNav(jumpToAbility, jumpTo);
}

/* A click on a drill goes to that mechanic. Paused, it goes to the moment its first question
   can be answered (for the weapons, once the boss has turned to the first one), so you can
   answer it at once. Playing, it goes to the start of the mechanic. Orbital Omen and Raw Steel
   Trophy happen twice, so it goes to the one nearest the row clicked. */
function jumpTo(id: string, row: number): void {
  if(!R) startRun("live", buildFight(state.slot, undefined, state.choices), [], true);
  const r = R;
  if(!r) return;
  const near = ABILITIES[row]?.t ?? 0, gap = (g: FightSeg): number => Math.abs(g.from - near);
  const g = r.fight.segs.filter(x => x.drills.includes(id)).sort((a, b) => gap(a) - gap(b))[0];
  if(g) goToSeg(r, g);
}

/* A click on an ability goes to a few seconds before it hits, so it shows as "soon" first. */
function jumpToAbility(i: number): void {
  const a = ABILITIES[i];
  if(!a) return;
  if(!R) startRun("live", buildFight(state.slot, undefined, state.choices), [], true);
  const r = R;
  if(!r) return;
  r.settings = false;
  seekTo(Math.max(0, a.t - SOON));
}

function goToSeg(r: Run, g: FightSeg): void {
  r.settings = false;
  seekTo(r.paused ? askAt(g, 0) : g.from);
}

/* ---------- step by step ---------- */
/** How long the boss's turn shows before a question, in seconds (the turn takes half a second,
    see .turn in styles.css). */
const TURN_SHOW = 0.6;
/** How long a hit shows while paused, before the clock moves on to the next question, in ms. */
const STEP_PAUSE_MS = 700;
/** The moment step j of a mechanic can be answered: the first step once the mechanic is on the
    floor (for the weapons, once the boss has turned to the first one), a later step once the
    hit before it landed and the boss turned to the next weapon. Always before the step's hit. */
function askAt(g: FightSeg, j: number): number {
  const ready = j === 0 ? (g.turn ? g.turn.at + TURN_SHOW : g.from) : g.due[j - 1] + TURN_AFTER + TURN_SHOW;
  return Math.max(g.from, Math.min(g.due[j] - 0.1, ready));
}

/** Move the clock forward to `to`, showing the hits it passes. */
function passTo(r: Run, to: number): void {
  while(r.nextHit < r.hits.length && r.hits[r.nextHit].t <= to) showHit(r, r.hits[r.nextHit++]);
  r.t = to;
  r.last = performance.now();
}

/* Paused, after an answer: the hit lands, so its answer and what the mechanic did show. Then,
   after a moment, the clock goes on to when the next question can be answered, so the boss's
   turn to the next weapon plays on the arena. A click or a jump in the meantime cancels that. */
let stepTimer = 0;
function stepOn(r: Run, si: number): void {
  const g = r.fight.segs[si], j = r.results[si].length;   // j: the next step to ask
  window.clearTimeout(stepTimer);
  passTo(r, Math.max(r.t, g.due[j - 1] + 0.05));
  if(j >= g.due.length) return;
  const to = askAt(g, j);
  stepTimer = window.setTimeout(() => {
    if(R !== r || !r.paused || r.hold || r.t >= to) return;
    passTo(r, to);
    frame();
    syncRoute();
  }, STEP_PAUSE_MS);
}

/** The next mechanic after segment si, or null after the last one. */
const nextSeg = (f: Fight, si: number): FightSeg | null => f.segs[si + 1] ?? null;

/** Enter: after a wrong spot, go on; paused at the end of a mechanic, go to the next one. */
export function enterKey(): boolean {
  const r = R;
  if(!r) return false;
  if(r.hold === "review"){ goOn(); return true; }
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

/* Build the fight again: with a code, the same fight (after a pick changed); without one, a new
   fight. It stays at the same moment and keeps paused or playing. */
function rebuild(code?: string, mode?: Mode): void {
  const r = R;
  if(!r) return;
  const t = r.t;
  startRun(mode ?? (r.mode === "replay" ? "live" : r.mode), buildFight(state.slot, code, state.choices), [], r.paused, r.settings);
  seekTo(t);
}

function drawSettings(r: Run): void {
  el("f-panel").innerHTML = '<div class="eyebrow"><b>Settings</b><span>Fight ' + r.fight.code + "</span></div><h2>Settings</h2>" +
    segRow("set", "fpause", "Missed spot", [["no", "Fight goes on"], ["yes", "Fight pauses"]], settings.pause ? "yes" : "no") +
    segRow("set", "fwatch", "Moving marker", [["live", "Runs to your clicks"], ["demo", "Shows the right moves"]], r.mode === "demo" ? "demo" : "live") +
    pickRows() +
    '<div class="actions"><button type="button" class="btn" id="f-done">Done</button></div>';
  wireSet(el("f-panel"));
  wirePattern(() => rebuild(r.fight.code));
  document.getElementById("f-allrandom")?.addEventListener("click", () => { setChoices({...RANDOM}); rebuild(r.fight.code); });
  el("f-done").addEventListener("click", () => { r.settings = false; r.shown = ""; frame(); });
}

/** Save a setting when its button is clicked (speed on the play bar, the rest in Settings). */
function wireSet(root: Element): void {
  root.querySelectorAll<HTMLButtonElement>("[data-set]").forEach(b => b.addEventListener("click", () => {
    const r = R, v = b.dataset.val ?? "";
    if(!r) return;
    if(b.dataset.set === "fspeed") settings.speed = Number(v);
    if(b.dataset.set === "fpause"){
      settings.pause = v === "yes";
      // With "Fight goes on", a fight that waits for a missed or wrong spot goes on.
      if(!settings.pause && !r.paused && (r.hold === "wait" || r.hold === "review")) r.hold = "";
    }
    LS.set("fspeed", settings.speed); LS.set("fpause", settings.pause ? "yes" : "no");
    if(b.dataset.set === "fwatch"){
      const mode: Mode = v === "demo" ? "demo" : "live";
      if(mode !== r.mode) return rebuild(r.fight.code, mode);
    }
    view.querySelectorAll<HTMLButtonElement>('[data-set="' + b.dataset.set + '"]').forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    r.shown = ""; r.last = performance.now();
    frame();
  }));
}

/* ---------- the run ---------- */
function startRun(mode: Mode, fight: Fight, clicks: Click[] = [], paused = false, settingsOpen = false): void {
  stopTimer();
  window.clearTimeout(stepTimer);
  R = {mode, fight, slot:state.slot, t:0, results:fight.segs.map(() => []),
       clicks:mode === "replay" ? clicks : [], next:0, paused, hold:"", review:-1, last:performance.now(), shown:"",
       hits:buildHits(fight), nextHit:0, bossAt:[50, 50],
       // In a live run the marker runs to your clicks; the watched run shows the right moves.
       route:mode === "demo" ? rightRoute(fight) : clickRoute(fight, mode === "replay" ? clicks : []), zoneKey:"",
       settings:settingsOpen, setupOpen:false, setupSeg:-1};
  mount();
}

/* Put the player on the page for the run in R: the HUD, the arena and the play bar on one side,
   the panel on the other. The flash and the hit's name sit over the arena, outside #f-arena, so
   a new scene does not remove them. */
function mount(): void {
  const r = R;
  if(!r) return;
  state.cur = {kind:"fight"};
  view.innerHTML = tabHead() + '<div class="mapwrap">' + tlNav() + '<div class="stage"><div class="arena">' + HUD +
    '<div class="fxbox"><div id="f-arena"></div><div class="hitlbl" id="f-hit" role="status"></div></div>' + playBar(r.fight) + "</div>" +
    '<div class="panel" id="f-panel"></div></div></div>';
  navKey = "";
  wireNav(jumpToAbility, jumpTo);
  const seek = el<HTMLInputElement>("f-seek");
  seek.addEventListener("pointerdown", () => { dragging = true; });
  seek.addEventListener("pointerup", () => { dragging = false; });
  seek.addEventListener("input", () => seekTo(Number(seek.value)));
  el("f-play").addEventListener("click", togglePause);
  el("h-go").addEventListener("click", goOn);
  el("f-gear").addEventListener("click", () => { const x = R; if(x){ x.settings = !x.settings; x.shown = ""; frame(); } });
  wireSet(el("f-bar"));
  // Start over: the same fight from the pull. New fight: a new one, at the same moment.
  el("f-restart").addEventListener("click", () => { const x = R; if(x) startRun(x.mode, x.fight, x.mode === "replay" ? x.clicks : [], x.paused, x.settings); });
  el("f-new").addEventListener("click", () => rebuild());
  r.shown = ""; r.zoneKey = ""; r.last = performance.now();
  frame();
  syncRoute();
  state.raf = requestAnimationFrame(tick);
}

/* The play bar stays under the arena, outside the parts that redraw, so a drag is never cut off:
   play or pause, a slider for the fight time (its ticks mark where each mechanic starts), the
   time, Settings, then the speed and the buttons to start over or get a new fight. */
let dragging = false;
function playBar(f: Fight): string {
  return '<div class="fctl"><button type="button" class="btn fplay" id="f-play" aria-label="Play">&#9654;</button>' +
    '<input type="range" id="f-seek" min="0" max="' + f.end + '" step="0.1" value="0" list="f-marks" aria-label="Fight time">' +
    '<span class="ftime" id="f-time"></span><button type="button" class="btn ghost fgear" id="f-gear" aria-pressed="false">Settings</button></div>' +
    '<datalist id="f-marks">' + f.segs.map(g => '<option value="' + g.from + '"></option>').join("") + "</datalist>" +
    '<div class="fbar" id="f-bar"><div class="seg small" role="group" aria-label="Speed">' +
    SPEEDS.map(n => '<button type="button" data-set="fspeed" data-val="' + n + '" aria-pressed="' + (n === settings.speed) + '">' + n + "x</button>").join("") + "</div>" +
    '<button type="button" class="linkbtn" id="f-restart">Start over</button><button type="button" class="linkbtn" id="f-new">New fight</button>' +
    '<span class="hint"><kbd>Space</kbd> play or pause &middot; <kbd>&larr;</kbd> <kbd>&rarr;</kbd> 5 seconds</span></div>';
}

/** The address bar holds the fight, its picks and, while paused, the moment, so a copied link
    opens the same place. */
function syncRoute(): void {
  const r = R;
  if(!r) return;
  showRoute({tab:"map", code:r.fight.code, picks:choicesText(r.fight.choices) || undefined, t:r.paused && r.t > 0 ? Math.round(r.t * 10) / 10 : undefined});
}

/* Go to any moment. Back: the answers to hits after that moment are forgotten, so you can
   do them again. Forward: steps you jump over count as skipped, not as missed. Watch and
   play-back runs fill in what they jumped over by themselves. */
export function seekTo(to: number): void {
  const r = R;
  if(!r) return;
  window.clearTimeout(stepTimer);
  const f = r.fight;
  to = Math.max(0, Math.min(f.end, to));
  if(to < r.t){
    f.segs.forEach((g, si) => { const res = r.results[si]; while(res.length && g.due[res.length - 1] > to) res.pop(); });
    if(r.mode === "live"){ r.clicks = r.clicks.filter(c => c.t <= to); r.route = clickRoute(r.fight, r.clicks); }
    if(r.mode === "replay"){ const i = r.clicks.findIndex(c => c.t > to); r.next = i < 0 ? r.clicks.length : i; }
  } else if(r.mode === "live"){
    f.segs.forEach((g, si) => { while(r.results[si].length < g.due.length && g.due[r.results[si].length] <= to) answer(si, null, true, true); });
  }
  r.t = to;
  // A jump does not replay the hits it passes: the next hit to show is the first one after `to`.
  const after = r.hits.findIndex(h => h.t > to);
  r.nextHit = after < 0 ? r.hits.length : after;
  if(r.hold === "wait" || r.hold === "review") r.hold = "";
  r.shown = "";   // build the arena again: weapons that had not spawned yet must hide again
  r.last = performance.now();
  frame();
  syncRoute();
}
export function seekBy(d: number): void { if(R) seekTo(R.t + d); }

/** The segment on the arena at time t, or -1 between mechanics. */
function activeSeg(f: Fight, t: number): number {
  for(let i = f.segs.length - 1; i >= 0; i--){
    const g = f.segs[i];
    if(t >= g.from) return t <= g.due[g.due.length - 1] + 3 ? i : -1;
  }
  return -1;
}

function tick(now: number): void {
  const r = R;
  if(!r) return;
  // A long gap (a hidden tab) does not jump the fight. The frame time `now` can be a little
  // earlier than a performance.now() taken in a click handler during the same frame, so dt
  // can come out below zero. The clock never runs back, or a jump to the start of a
  // mechanic lands a hair before it.
  const dt = Math.max(0, Math.min(0.25, (now - r.last) / 1000));
  r.last = now;
  if(!r.paused && !r.hold) r.t += dt * settings.speed;
  const f = r.fight;
  // Damage going out: each hit shows once, on the frame the clock passes it.
  while(r.nextHit < r.hits.length && r.hits[r.nextHit].t <= r.t) showHit(r, r.hits[r.nextHit++]);
  while(r.mode === "replay" && r.next < r.clicks.length && r.clicks[r.next].t <= r.t){ const c = r.clicks[r.next++]; answer(c.si, c.p); }
  f.segs.forEach((g, si) => {
    const j = r.results[si].length;
    if(j >= g.due.length || r.t < g.from) return;
    // Watch the right moves answers at the hit, with the spot the marker ran to (see data/route.ts):
    // the blue target turns green as the mechanic goes off.
    if(r.mode === "demo" && r.t >= g.due[j]) return answer(si, r.route?.find(s => s.si === si && s.j === j)?.p ?? null);
    if(r.t < g.due[j]) return;
    if(r.mode === "live" && settings.pause){ r.t = g.due[j]; r.hold = "wait"; return; }
    answer(si, null, true);
  });
  if(r.t >= f.end) return finish();
  frame();
  state.raf = requestAnimationFrame(tick);
}

/** Score the next step of segment si: a click at p, the right spot (p null), a miss, or a
    step skipped with the slider. A live mechanic done with no step skipped counts in your stats. */
function answer(si: number, p: Point | null, missed = false, skipped = false): void {
  const r = R;
  if(!r) return;
  const g = r.fight.segs[si], res = r.results[si], step = g.scene.steps[res.length];
  const base = step.zf ? step.zf(res) : step.z;
  if(!base) return;
  const zone = rotZone(base, g.k), at: Point = p ?? zoneCenter(zone);
  const ok = !missed && inZone(at, zone);
  res.push({p:at, ok, z:zone, drop:step.drop ? (ok ? at : zoneCenter(zone)) : null, missed, skipped});
  // Live play: your marker runs to each spot you click, from the moment you click it.
  if(r.mode === "live" && p){ r.clicks.push({si, j:res.length - 1, t:r.t, p}); r.route = clickRoute(r.fight, r.clicks); }
  if(r.mode === "live" && res.length === g.due.length && !res.some(x => x.skipped) && g.drills[0]) record(g.drills[0], res.every(x => x.ok));
}

function onClick(e: MouseEvent): void {
  const r = R;
  // While a wrong spot shows, a click on the arena does not answer the next step by accident.
  if(!r || r.mode !== "live" || r.hold === "review") return;
  const si = activeSeg(r.fight, r.t);
  if(si < 0 || r.results[si].length >= r.fight.segs[si].due.length) return;
  const svg = e.currentTarget as SVGSVGElement, ctm = svg.getScreenCTM();
  if(!ctm) return;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  answer(si, [q.x, q.y]);
  if(r.hold === "wait") r.hold = "";
  // A wrong spot stops to show why: always while paused, and while playing with "Fight pauses".
  const res = r.results[si];
  if(!res[res.length - 1].ok && (r.paused || settings.pause)){ r.hold = "review"; r.review = si; }
  else if(r.paused) stepOn(r, si);
  frame();
  syncRoute();
}

/** Play or pause (the play button and the space bar). From a wrong spot, it goes on first. */
export function togglePause(): void {
  const r = R;
  if(!r) return;
  if(r.hold === "review") return goOn();
  window.clearTimeout(stepTimer);
  r.paused = !r.paused;
  r.last = performance.now();
  r.shown = "";
  frame();
  syncRoute();
}

/** Next step, after a wrong spot: playing, the fight goes on; paused, the next question comes. */
function goOn(): void {
  const r = R;
  if(!r || r.hold !== "review") return;
  r.hold = "";
  if(r.paused) stepOn(r, r.review);
  r.last = performance.now();
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
  // In the watched run, the green answer and what the mechanic did show for GREEN_FOR seconds
  // after the hit, then clear, so the next blue target is the only area on the floor.
  const lastHit = g && res.length ? g.due[res.length - 1] : -Infinity, showAnswer = res.length > 0 && (r.mode !== "demo" || r.t - lastHit < GREEN_FOR);
  // After a weapon hits, he turns to face the next weapon. He lands on it JUMP_LEAD seconds
  // before it hits.
  const facing = res.length > 0 && r.t >= lastHit + TURN_AFTER;
  const jumped = Boolean(g && res.length < g.due.length && r.t >= g.due[res.length] - JUMP_LEAD && jumpsNext(g.scene, res.length));
  const key = [where, res.length, turned, facing, jumped, r.hold, showAnswer, r.paused, r.settings, r.setupOpen, settings.speed].join(":");
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
    paintArena(el("arena-svg"), sc, k, res, showAnswer, boss);
    // The ring sits around the boss, and moves with him when he jumps. It starts at the top.
    const c = boss ?? {x:50, y:50};
    r.bossAt = [c.x, c.y];
    const ring = el("tring");
    ring.setAttribute("cx", String(c.x)); ring.setAttribute("cy", String(c.y));
    ring.setAttribute("transform", "rotate(-90 " + c.x + " " + c.y + ")");
    drawPanel(r, si);
  }
  updateLive(r);
}

function lastBox(g: FightSeg, i: number, x: StepResult): string {
  const tag = x.skipped ? "Skipped" : x.missed ? "Missed" : x.ok ? "Right" : "Not there";
  return '<div class="lastans ' + (x.ok ? "ok" : "bad") + '"><span class="tag">' + tag + "</span><b>" + esc(g.scene.steps[i].q) + "</b> " + esc(g.scene.steps[i].a) + "</div>";
}

/* The panel: what the clock is doing, the timeline, then the mechanic on the arena. Its setup
   folds after the first answer, the steps show as chips, and at the end the rule shows with
   the way on to the next mechanic. Between mechanics: the next mechanic and the next ability. */
function drawPanel(r: Run, si: number): void {
  if(r.settings) return drawSettings(r);
  const f = r.fight, g = si >= 0 ? f.segs[si] : null, res = g ? r.results[si] : [];
  const label = r.mode === "demo" ? "The right moves" : r.mode === "replay" ? "Your run, played back" : r.paused ? "Paused: step by step" : "Playing: real time";
  let h = '<div class="eyebrow"><b>' + label + '</b><span id="f-clock"></span><span>' + settings.speed + "x</span><span>Fight " + f.code + "</span></div>";
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
      return '<li><span class="chip ' + (x.ok ? "ok" : "bad") + '">' + (i + 1) + (x.skipped ? " &raquo;" : x.ok ? " &#10003;" : " &#10007;") + "</span></li>";
    }).join("") + "</ol>";
    if(!done){
      h += '<div class="nowq"><span>Step ' + (j + 1) + " of " + n + (r.paused ? " &middot; no timer while paused" : ' &middot; hits in <b id="f-due"></b>') + "</span>" + esc(g.scene.steps[j].q) + "</div>";
      if(r.hold === "wait") h += '<p class="hint" style="margin-top:10px">The fight is paused. Click your spot.</p>';
      else if(r.hold === "review") h += '<p class="hint" style="margin-top:10px">Not there. Press Next step above the arena, or Enter, to go on.</p>';
      else if(r.paused && r.mode === "live") h += '<p class="hint" style="margin-top:10px">Click your spot on the arena. After each answer the hit lands and the next question comes. Press Play, or Space, to run the fight clock.</p>';
    }
    if(j > 0) h += lastBox(g, j - 1, res[j - 1]);
    if(done){
      const nx = nextSeg(f, si);
      if(g.scene.rule) h += '<div class="rule"><span>Rule</span><strong>' + esc(g.scene.rule) + "</strong></div>";
      h += '<div class="actions">' + (nx ? '<button type="button" class="btn" id="f-nextseg">Next: ' + esc(nx.title) + "</button>" : "") +
        '<button type="button" class="btn ghost" id="f-again">Do it again</button>' + (nx && r.paused ? '<span class="hint"><kbd>Enter</kbd> next</span>' : "") + "</div>";
    } else if(g.scene.spawnPlay) h += '<div class="actions"><button type="button" class="btn ghost" id="f-spawns">Watch the spawns again</button></div>';
  } else {
    const nx = f.segs.find(x => x.from > r.t), a = ABILITIES.find(x => x.t >= r.t);
    h += "<h2>Between mechanics</h2>";
    if(nx) h += '<p class="setup">Next mechanic: ' + esc(nx.title) + " at " + clock(nx.from) + '.</p><div class="actions"><button type="button" class="btn" id="f-goto">Go to ' + esc(nx.title) + "</button></div>";
    if(a) h += '<div class="lastans"><span class="tag">Next ability &middot; ' + clock(a.t) + "</span><b>" + esc(a.name) + '</b><p class="cmline">' + marks(a.cats) + esc(catNames(a.cats)) + "</p>" + esc(a.note) + "</div>";
    if(r.paused) h += '<p class="hint" style="margin-top:10px">Paused. Click a drill or an ability in the fight list to go there, or press Play, or Space, to run the fight clock.</p>';
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
  const f = r.fight, set = (id: string, s: string): void => { const n = document.getElementById(id); if(n) n.textContent = s; };
  set("f-clock", clock(r.t));
  set("f-time", clock(r.t) + " / " + clock(f.end));
  const seek = document.getElementById("f-seek") as HTMLInputElement | null, play = document.getElementById("f-play");
  if(seek && !dragging) seek.value = r.t.toFixed(1);
  if(play){
    play.innerHTML = r.paused ? "&#9654;" : "&#10074;&#10074;";
    play.setAttribute("aria-label", r.paused ? "Play" : "Pause");
  }
  document.getElementById("f-gear")?.setAttribute("aria-pressed", String(r.settings));
  const tl = document.getElementById("f-tl");
  if(tl){
    const rows = f.events.filter(e => e.t >= r.t - KEEP && e.t - r.t <= SHOW_AT).slice(0, ROWS);
    const next = f.events.find(e => e.t > r.t);
    tl.innerHTML = rows.length ? rows.map(e => {
      const left = e.t - r.t, fill = Math.max(0, Math.min(1, 1 - left / SHOW_AT));
      const cls = (left <= 0 ? "now" : left <= SOON ? "soon" : "") + (e.raidwide ? " rw" : ""), cats = catsAt(e.t);
      // A line that is a fight-list ability gets its colour marks, as in the fight list.
      return '<li class="' + cls + '"><i style="width:' + (fill * 100).toFixed(1) + '%"></i><span>' + (cats.length ? marks(cats) : "") + esc(e.name) + "</span><b>" + (left > 0 ? left.toFixed(1) : "") + "</b></li>";
    }).join("") : '<li class="idle"><span>' + (next ? "Next: " + esc(next.name) + " in " + Math.round(next.t - r.t) + " s" : "No more lines") + "</span></li>";
  }
  const si = activeSeg(f, r.t);
  if(si >= 0){
    const g = f.segs[si], j = r.results[si].length;
    if(j < g.due.length) set("f-due", Math.max(0, g.due[j] - r.t).toFixed(1) + " s");
  }
  // The fight list follows the clock: the drills on the arena now, and the next ability to hit.
  const drills = si >= 0 ? f.segs[si].drills : [], nextAb = ABILITIES.findIndex(a => a.t >= r.t);
  const key = drills.join(",") + ":" + nextAb;
  if(key !== navKey){ navKey = key; markNav(drills, nextAb); }
  updateHud(r, si);
  drawRunner(r);
}

/* ---------- the moving marker ---------- */
/** How long the watched run keeps a green answer on the floor after its hit, in seconds. */
const GREEN_FOR = 1.5;
/** How long after a weapon hits the boss turns to face the next one, in seconds. No source
    gives this time: cactbot has only the jump itself, about 2 seconds before the next hit, and
    the hits are about 5 seconds apart. So this is an estimate, and he turns well before he jumps. */
const TURN_AFTER = 1.0;
/** How long before a weapon hits the boss lands on it, in seconds: cactbot's "--jump N--" lines
    come 2.0 seconds before each "Assault Evolved N" hit, in both sets. */
const JUMP_LEAD = 2.0;
/* In every run, a marker with your role runs a route: the right spots in the watched run, and
   your own clicks in live play and "Your run, played back" (it goes to a spot when you click
   it). It waits on each spot until the hit lands, then runs to the next one at run speed. Its
   target (the spot for the next hit) shows in blue: a dotted line from the marker and a ring on
   the exact spot, and in the watched run also the whole area that is right. At the hit, the
   answer turns that area green (see frame). The arena is built again for each mechanic, so the
   marker is added back when it is missing. */
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
  // The right area for the target, in blue, in the watched run. It is drawn again only when the
  // target changes. It needs the answers before it in that mechanic (a puddle depends on the last).
  // The key holds the number of answers too: right after a jump with the slider, the watched run
  // fills in the earlier answers on the next frame, and the area can only be drawn after that.
  const key = r.mode === "demo" && target ? target.si + ":" + target.j + ":" + r.results[target.si].length : "";
  if(key !== r.zoneKey){
    r.zoneKey = key;
    const layer = document.getElementById("f-runzone"), g = target ? r.fight.segs[target.si] : null;
    const step = g && target ? g.scene.steps[target.j] : null, res = target ? r.results[target.si] : [];
    const base = step && target && res.length === target.j ? (step.zf ? step.zf(res) : step.z) : undefined;
    if(layer) layer.innerHTML = key && g && base ? zoneSVG(rotZone(base, g.k), "pick") : "";
  }
}

/* ---------- damage going out ---------- */
/* Every hit of the fight, so the player shows damage going out also where no drill runs. A
   raidwide flashes the arena floor, a tank buster draws the tanks and the hit on them, shared
   hits (a stack or a tower the party shares) flash softer, and the enrage flashes long and
   dark. Every hit, the other AoEs too, shows its name over the arena for a moment, with the
   fight list's category: its colour mark and name, the same as in the colour key. */
type HitKind = "raid" | "tank" | "shared" | "enrage" | "aoe";
interface Hit { t: number; name: string; kind: HitKind; cat: Cat }
/** Dance of Domination hits seven times, from the first hit to the last on the timeline. */
const DANCE_HITS = 7, DANCE_GAP = 0.7;

function buildHits(f: Fight): Hit[] {
  const hits: Hit[] = [];
  for(const a of ABILITIES){
    if(a.cats.includes("enrage")) hits.push({t:a.t, name:a.name, kind:"enrage", cat:"enrage"});
    else if(a.name === "Dance of Domination hits"){
      for(let i = 0; i < DANCE_HITS; i++) hits.push({t:a.t + i * DANCE_GAP, name:"Dance of Domination " + (i + 1), kind:"raid", cat:"raid"});
    }
    else if(a.cats.includes("raid")) hits.push({t:a.t, name:a.name, kind:"raid", cat:"raid"});
    else if(a.cats.includes("tank")) hits.push({t:a.t, name:a.name, kind:"tank", cat:"tank"});
    else if(a.name === "Massive Meteor") hits.push({t:a.t, name:a.name, kind:"shared", cat:a.cats[0] ?? "target"});
    else if(a.cats.includes("target") || a.cats.includes("dodge")) hits.push({t:a.t, name:a.name, kind:"aoe", cat:a.cats.includes("target") ? "target" : "dodge"});
  }
  // Each Heartbreak Kick hit is its own line on the timeline: one flash per hit on the shared tower.
  for(const e of f.events) if(/^Heartbreak Kick \d/.test(e.name)) hits.push({t:e.t, name:e.name, kind:"shared", cat:"spot"});
  return hits.sort((a, b) => a.t - b.t);
}

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
/** The tanks for a buster, and what hits them. Great Wall of Fire is a line buster the two tanks
    share: they stand together in front of the boss (he faces north), and the line runs from him
    through them. Foregone Fatality hits each tethered tank alone (single-target, no AoE): the MT
    on the NE tether, the OT on the SW tether, away from the party stack. */
function busterPieces(name: string, boss: Point): Overlay[] {
  const tank = (p: Point, l: string): Overlay[] => [{t:"target", x:p[0], y:p[1]}, {t:"mark", x:p[0], y:p[1], l, r:"T"}];
  if(name.startsWith("Great Wall of Fire")){
    const front: Point = [boss[0], boss[1] - 17];
    return [{t:"band", x:boss[0], y:boss[1], x2:boss[0], y2:-20, w:WALL_W},
      ...tank([front[0] - 3, front[1]], "MT"), ...tank([front[0] + 3, front[1]], "OT")];
  }
  const mt: Point = [boss[0] + 14, boss[1] - 14], ot: Point = [boss[0] - 14, boss[1] + 14];
  return [...tank(mt, "MT"), ...tank(ot, "OT")];
}

/* ---------- the HUD ---------- */
/* In the game, the boss cast bar and the floor are in the middle of the screen. The HUD puts
   the same things right above the arena floor: a cast bar for the next timeline line, your
   prompt, and the seconds left to your hit (the step number while paused). The ring around the
   boss shows that time too. The HUD is built once per run; each frame only changes its text,
   widths and classes. */
const HUD = '<div class="hud"><div class="hcast" id="h-cast"><i id="h-fill"></i><span id="h-name"></span><b id="h-left"></b></div>' +
  '<div class="hq" id="h-q"><b class="hcount" id="h-count"></b><span id="h-text"></span><button type="button" class="btn" id="h-go" hidden>Next step</button></div></div>';
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
  // After a wrong spot: why it was wrong, and Next step to go on.
  const go = document.getElementById("h-go");
  if(go) go.hidden = r.hold !== "review";
  if(r.hold === "review"){
    const rg = f.segs[r.review], rj = r.results[r.review].length - 1;
    box.className = "hq done bad";
    put("h-count", "✗");
    put("h-text", "Not there. " + rg.scene.steps[rj].a);
    if(ring) ring.style.display = "none";
    return;
  }
  // Your prompt and the time left (the step number while paused), or the next mechanic.
  const g = si >= 0 ? f.segs[si] : null, j = g ? r.results[si].length : 0;
  if(g && j < g.due.length){
    const left = Math.max(0, g.due[j] - r.t), start = j ? g.due[j - 1] : g.from;
    box.className = "hq" + (left <= URGENT && !r.paused ? " urgent" : "");
    put("h-count", r.paused ? (j + 1) + "/" + g.due.length : left.toFixed(1));
    put("h-text", g.scene.steps[j].q);
    if(ring){
      ring.style.display = r.paused ? "none" : "";
      ring.classList.toggle("urgent", left <= URGENT);
      ring.setAttribute("stroke-dashoffset", (100 * (1 - Math.min(1, left / Math.max(0.1, g.due[j] - start)))).toFixed(1));
    }
  } else {
    const nx = f.segs.find(x => x.from > r.t);
    box.className = "hq idle";
    put("h-count", "");
    put("h-text", g ? "Done. " + (nx ? "Next: " + nx.title : "No more mechanics") : nx ? "Next: " + nx.title + " in " + Math.round(nx.from - r.t) + " s" : "No more mechanics");
    if(ring) ring.style.display = "none";
  }
}

/* ---------- the end ---------- */
function finish(): void {
  const r = R;
  if(!r) return;
  stopTimer();
  window.clearTimeout(stepTimer);
  if(r.mode === "live") lastLive = {fight:r.fight, clicks:r.clicks, results:r.results};
  const watched = r.mode === "demo" ? r.fight : null;
  R = null;
  renderSummary(watched);
}

/* After a live run: how each mechanic went, and the replays. After the watched run with no run
   of yours yet: a short end screen. Settings goes back to the player, paused at the pull. */
function renderSummary(watched: Fight | null = null): void {
  state.cur = {kind:"fight"};
  const d = lastLive;
  if(!d || (watched && watched !== d.fight)){
    show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>The right moves</b></div><h2>That was the right way through</h2>' +
      (watched ? "<p>" + esc(watched.summary) + "</p>" : "") +
      '<div class="actions"><button type="button" class="btn" id="f-same">Play this fight</button><button type="button" class="btn ghost" id="f-back">Settings</button></div></div></div>');
    el("f-same").addEventListener("click", () => { if(watched) startRun("live", watched); });
    el("f-back").addEventListener("click", () => startRun("live", watched ?? buildFight(state.slot, undefined, state.choices), [], true, true));
    return;
  }
  // Steps skipped with the slider do not count.
  const all = d.results.flat().filter(x => !x.skipped), right = all.filter(x => x.ok).length, missed = all.filter(x => x.missed).length, wrong = all.length - right - missed;
  const rows = d.fight.segs.map((g, si) => '<li><span class="fs-time">' + clock(g.from) + "</span><span>" + esc(g.title) + '</span><span class="fs-chips">' +
    d.results[si].map(x => x.skipped ? '<span class="chip" title="Skipped">&raquo;</span>' :
      '<span class="chip ' + (x.ok ? "ok" : "bad") + '">' + (x.missed ? "&ndash;" : x.ok ? "&#10003;" : "&#10007;") + "</span>").join("") + "</span></li>").join("");
  show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>The fight</b><span>Done</span><span>Fight ' + d.fight.code + "</span></div>" +
    "<h2>" + right + " of " + all.length + " spots right</h2><p>" + esc(d.fight.summary) + "</p>" +
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">' + right + '</div></div><div class="bad"><span>Wrong</span><div class="big">' + wrong + '</div></div><div class="slow"><span>Missed</span><div class="big">' + missed + "</div></div></div>" +
    '<ol class="fsum">' + rows + "</ol>" +
    '<div class="actions"><button type="button" class="btn" id="f-steps">Step through my run</button><button type="button" class="btn ghost" id="f-play">Play back my run</button><button type="button" class="btn ghost" id="f-watch">Watch the right moves</button></div>' +
    '<div class="actions"><button type="button" class="btn ghost" id="f-same">Same fight again</button><button type="button" class="btn ghost" id="f-new">New fight</button><button type="button" class="btn ghost" id="f-back">Settings</button></div></div></div>');
  el("f-steps").addEventListener("click", () => renderStep(0));
  el("f-play").addEventListener("click", () => startRun("replay", d.fight, d.clicks));
  el("f-watch").addEventListener("click", () => startRun("demo", d.fight));
  el("f-same").addEventListener("click", () => startRun("live", d.fight));
  el("f-new").addEventListener("click", () => startRun("live", buildFight(state.slot, undefined, state.choices)));
  el("f-back").addEventListener("click", () => startRun("live", d.fight, [], true, true));
}

/* "Step through my run": one answered step at a time, with your click and the right spot. */
function renderStep(i: number): void {
  const d = lastLive;
  if(!d) return renderFight();
  const list = d.fight.segs.flatMap((g, si) => d.results[si].map((_x, j) => ({si, j})));
  if(!list.length) return renderSummary();
  i = Math.max(0, Math.min(i, list.length - 1));
  const {si, j} = list[i], g = d.fight.segs[si], res = d.results[si].slice(0, j + 1);
  show('<div class="stage"><div class="arena">' + hudPrompt((i + 1) + "/" + list.length, g.scene.steps[j].q) + sceneSVG(g.scene, g.k) + '</div><div class="panel"><div class="eyebrow"><b>Your run, step by step</b><span>' + clock(g.due[j]) + "</span><span>Step " + (i + 1) + " of " + list.length + "</span></div>" +
    "<h2>" + esc(g.title) + "</h2>" + lastBox(g, j, res[j]) +
    '<div class="actions"><button type="button" class="btn ghost" id="f-prev">Back</button><button type="button" class="btn" id="f-next">Next</button><button type="button" class="btn ghost" id="f-sum">Summary</button></div></div></div>');
  paintArena(el("arena-svg"), g.scene, g.k, res, true);
  el("f-prev").addEventListener("click", () => renderStep(i - 1));
  el("f-next").addEventListener("click", () => i + 1 < list.length ? renderStep(i + 1) : renderSummary());
  el("f-sum").addEventListener("click", () => renderSummary());
}
