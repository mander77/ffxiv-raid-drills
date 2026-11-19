// Real time, the second mode of the "Where do I stand?" tab: the drills play in fight order on
// the fight clock, with the fight timeline.
import { LS, esc, el } from "../util";
import { state, view, stopTimer } from "../core";
import { rotZone, rotOverlay, inZone, zoneCenter } from "../geometry";
import { sceneSVG } from "../arena";
import { paintArena } from "./map";
import { tabHead } from "./common";
import { buildFight, clock, type Fight, type FightSeg } from "../data/fight";
import { BOSS } from "../data/drills";
import { ABILITIES } from "../data/abilities";
import { tlNav, wireNav, markNav } from "./tlnav";
import type { Boss, Point, Scene, StepResult } from "../types";

/** live = you click; demo = the right clicks play by themselves; replay = your clicks play back. */
type Mode = "live" | "demo" | "replay";
interface Click { si: number; t: number; p: Point }
/* One run of the fight clock. */
interface Run {
  mode: Mode;
  fight: Fight;
  t: number;                 // fight time in seconds
  results: StepResult[][];   // one list per segment
  clicks: Click[];           // live: your clicks, kept for the replay; replay: the clicks to play back
  next: number;              // replay: the next click to play back
  hold: "" | "user" | "wait";   // paused by you, or waiting for your click ("Fight pauses")
  last: number;              // performance.now() at the last frame
  shown: string;             // what the arena and panel show, so they redraw only on a change
}
/** A finished live run, for the summary and the replays. */
interface Done { fight: Fight; clicks: Click[]; results: StepResult[][] }

const SPEEDS = [1, 1.5, 2];
const savedSpeed = LS.get("fspeed", 1);
const settings = {
  skip: LS.get<string>("fskip", "yes") !== "no",
  speed: SPEEDS.includes(savedSpeed) ? savedSpeed : 1,
  pause: LS.get<string>("fpause", "no") === "yes"
};
// TS note: module-level `let` with a `| null` type. Every function that reads R first checks it,
// for example `const r = R; if(!r) return;`. After that check TypeScript knows r is a Run.
let R: Run | null = null;
let lastLive: Done | null = null;
/* A fight code asked for by a link, such as #fight/K3PZ. The next start uses it. */
let wantedFight: string | null = null;
export function openFight(code: string): void { wantedFight = code; }
function nextFight(): Fight {
  const f = buildFight(state.slot, wantedFight ?? undefined);
  wantedFight = null;
  return f;
}
/* Between mechanics the arena is empty, but it is two platforms from Flatliner until the
   Crown of Arcadia that joins them again. */
const IDLE: Scene = {setup:"", rule:"", steps:[], overlays:[], boss:BOSS};
const IDLE_SPLIT: Scene = {...IDLE, split:true};

/* ---------- the fight list ---------- */
/* Every real-time screen sits beside the fight list, as in Step by step. */
let navKey = "";   // what the list highlights, so it updates only when that changes

function show(inner: string): void {
  view.innerHTML = tabHead() + '<div class="mapwrap">' + tlNav() + inner + "</div>";
  navKey = "";
  wireNav(jumpToAbility, jumpTo);
}

/* A click on a drill goes to the moment that mechanic starts. With no fight running it starts
   one first, so the list is also a quick way in. Steps before it count as skipped. Orbital
   Omen and Raw Steel Trophy happen twice, so it goes to the one nearest the row clicked. */
function jumpTo(id: string, row: number): void {
  if(!R) startRun("live", nextFight());
  const near = ABILITIES[row]?.t ?? 0, gap = (g: FightSeg): number => Math.abs(g.from - near);
  const g = R?.fight.segs.filter(x => x.drills.includes(id)).sort((a, b) => gap(a) - gap(b))[0];
  if(g) seekTo(g.from);
}

/* A click on an ability goes to a few seconds before it hits, so it shows as "soon" first. */
function jumpToAbility(i: number): void {
  const a = ABILITIES[i];
  if(!a) return;
  if(!R) startRun("live", nextFight());
  seekTo(Math.max(0, a.t - SOON));
}

/* ---------- start screen ---------- */
export function renderFight(): void {
  stopTimer(); R = null;
  state.cur = {kind:"fight"};
  const row = (key: string, label: string, choices: Array<[string, string]>, cur: string): string =>
    '<div class="ctrl" style="margin-top:12px"><span id="' + key + '-lbl">' + label + '</span><div class="seg small" role="group" aria-labelledby="' + key + '-lbl">' +
    choices.map(([v, t]) => '<button type="button" data-set="' + key + '" data-val="' + v + '" aria-pressed="' + (v === cur) + '">' + t + "</button>").join("") + "</div></div>";
  show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Real time</b><span>The pull to the enrage at 10:59</span></div>' +
    "<h2>Play the fight in order</h2><p>The drills play one after another on the fight clock. The timeline shows what the boss does next, like the cactbot overlay. Click your spot before each hit lands. Each run picks its own scenario: axe or scythe first, stack or spread first, and new weapon patterns. To start at one moment, click an ability or a drill in the fight list.</p>" +
    row("fskip", "Quiet stretches", [["yes", "Skip ahead"], ["no", "Real time"]], settings.skip ? "yes" : "no") +
    row("fspeed", "Speed", SPEEDS.map((n): [string, string] => [String(n), n + "x"]), String(settings.speed)) +
    row("fpause", "Missed spot", [["no", "Fight goes on"], ["yes", "Fight pauses"]], settings.pause ? "yes" : "no") +
    (wantedFight ? '<p class="hint" style="margin-top:12px">Fight code ' + esc(wantedFight) + " is ready: the next start uses it.</p>" : "") +
    '<div class="actions"><button type="button" class="btn" id="f-start">Start the fight</button><button type="button" class="btn ghost" id="f-watch">Watch the right moves</button></div></div></div>');
  view.querySelectorAll<HTMLButtonElement>("[data-set]").forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.val ?? "";
    if(b.dataset.set === "fskip") settings.skip = v === "yes";
    if(b.dataset.set === "fspeed") settings.speed = Number(v);
    if(b.dataset.set === "fpause") settings.pause = v === "yes";
    LS.set("fskip", settings.skip ? "yes" : "no"); LS.set("fspeed", settings.speed); LS.set("fpause", settings.pause ? "yes" : "no");
    renderFight();
  }));
  el("f-start").addEventListener("click", () => startRun("live", nextFight()));
  el("f-watch").addEventListener("click", () => startRun("demo", nextFight()));
}

/* ---------- the run ---------- */
function startRun(mode: Mode, fight: Fight, clicks: Click[] = []): void {
  stopTimer();
  R = {mode, fight, t:settings.skip ? Math.max(0, fight.events[0].t - SOON) : 0, results:fight.segs.map(() => []),
       clicks:mode === "replay" ? clicks : [], next:0, hold:"", last:performance.now(), shown:""};
  state.cur = {kind:"fight"};
  show('<div class="stage"><div class="arena" id="f-arena"></div><div class="panel"><div id="f-panel"></div>' + controls(fight) + "</div></div>");
  const seek = el<HTMLInputElement>("f-seek");
  seek.addEventListener("pointerdown", () => { dragging = true; });
  seek.addEventListener("pointerup", () => { dragging = false; });
  seek.addEventListener("input", () => seekTo(Number(seek.value)));
  el("f-play").addEventListener("click", togglePause);
  frame();
  state.raf = requestAnimationFrame(tick);
}

/* The fight controls stay outside the panel part that redraws, so a drag is never cut off:
   play or pause, and a slider for the fight time. Its ticks mark where each mechanic starts. */
let dragging = false;
function controls(f: Fight): string {
  return '<div class="fctl"><button type="button" class="btn ghost fplay" id="f-play" aria-label="Pause">&#10074;&#10074;</button>' +
    '<input type="range" id="f-seek" min="0" max="' + f.end + '" step="0.1" value="0" list="f-marks" aria-label="Fight time">' +
    '<span class="ftime" id="f-time"></span></div>' +
    '<datalist id="f-marks">' + f.segs.map(g => '<option value="' + g.from + '"></option>').join("") + "</datalist>" +
    '<p class="hint" style="margin-top:6px"><kbd>Space</kbd> play or pause &middot; <kbd>&larr;</kbd> <kbd>&rarr;</kbd> 5 seconds &middot; the Real time button goes back to the settings</p>';
}

/* Go to any moment. Back: the answers to hits after that moment are forgotten, so you can
   do them again. Forward: steps you jump over count as skipped, not as missed. Watch and
   play-back runs fill in what they jumped over by themselves. */
export function seekTo(to: number): void {
  const r = R;
  if(!r) return;
  const f = r.fight;
  to = Math.max(0, Math.min(f.end, to));
  if(to < r.t){
    f.segs.forEach((g, si) => { const res = r.results[si]; while(res.length && g.due[res.length - 1] > to) res.pop(); });
    if(r.mode === "live") r.clicks = r.clicks.filter(c => c.t <= to);
    if(r.mode === "replay"){ const i = r.clicks.findIndex(c => c.t > to); r.next = i < 0 ? r.clicks.length : i; }
  } else if(r.mode === "live"){
    f.segs.forEach((g, si) => { while(r.results[si].length < g.due.length && g.due[r.results[si].length] <= to) answer(si, null, true, true); });
  }
  r.t = to;
  if(r.hold === "wait") r.hold = "";
  r.shown = "";   // build the arena again: weapons that had not spawned yet must hide again
  r.last = performance.now();
  frame();
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
  if(!r.hold) r.t += dt * settings.speed;
  const f = r.fight;
  while(r.mode === "replay" && r.next < r.clicks.length && r.clicks[r.next].t <= r.t){ const c = r.clicks[r.next++]; answer(c.si, c.p); }
  f.segs.forEach((g, si) => {
    const j = r.results[si].length;
    if(j >= g.due.length || r.t < g.from) return;
    if(r.mode === "demo" && r.t >= g.due[j] - 1.5) return answer(si, null);
    if(r.t < g.due[j]) return;
    if(r.mode === "live" && settings.pause){ r.t = g.due[j]; r.hold = "wait"; return; }
    answer(si, null, true);
  });
  if(settings.skip && !r.hold) skipQuiet(r);
  if(r.t >= f.end) return finish();
  frame();
  state.raf = requestAnimationFrame(tick);
}

/* "Skip ahead": when no mechanic is on the arena and nothing happens for a while, jump to
   just before the next timeline line or mechanic, so it still shows as "soon". A line that
   just happened stays on screen first. */
function skipQuiet(r: Run): void {
  const f = r.fight;
  if(activeSeg(f, r.t) >= 0 || f.events.some(e => e.t <= r.t && r.t - e.t < KEEP)) return;
  const next = Math.min(f.end, ...f.segs.map(g => g.from).concat(f.events.map(e => e.t)).filter(x => x > r.t));
  if(next - r.t > SOON + 2) r.t = next - SOON;
}

/** Score the next step of segment si: a click at p, the right spot (p null), a miss, or a
    step skipped with the slider. */
function answer(si: number, p: Point | null, missed = false, skipped = false): void {
  const r = R;
  if(!r) return;
  const g = r.fight.segs[si], res = r.results[si], step = g.scene.steps[res.length];
  const base = step.zf ? step.zf(res) : step.z;
  if(!base) return;
  const zone = rotZone(base, g.k), at: Point = p ?? zoneCenter(zone);
  const ok = !missed && inZone(at, zone);
  res.push({p:at, ok, z:zone, drop:step.drop ? (ok ? at : zoneCenter(zone)) : null, missed, skipped});
  if(r.mode === "live" && p) r.clicks.push({si, t:r.t, p});
}

function onClick(e: MouseEvent): void {
  const r = R;
  if(!r || r.mode !== "live") return;
  const si = activeSeg(r.fight, r.t);
  if(si < 0 || r.results[si].length >= r.fight.segs[si].due.length) return;
  const svg = e.currentTarget as SVGSVGElement, ctm = svg.getScreenCTM();
  if(!ctm) return;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  answer(si, [q.x, q.y]);
  if(r.hold === "wait") r.hold = "";
  frame();
}

/** Pause or resume (the Pause button and the space bar). */
export function togglePause(): void {
  const r = R;
  if(!r || r.hold === "wait") return;
  r.hold = r.hold === "user" ? "" : "user";
  r.last = performance.now();
  frame();
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
  const key = where + ":" + res.length + ":" + turned + ":" + r.hold;
  if(key !== r.shown){
    const fresh = r.shown.split(":")[0] !== where;   // a new scene: build the arena again
    r.shown = key;
    const sc = g ? g.scene : where === "split" ? IDLE_SPLIT : IDLE, k = g ? g.k : 0;
    if(fresh){ el("f-arena").innerHTML = sceneSVG(sc, k); el("arena-svg").addEventListener("click", onClick); }
    let boss: Boss | null = sc.bossAt ? sc.bossAt(res.length) : (sc.boss ? rotOverlay(sc.boss, k) : null);
    // In the middle, before his cast, he faces no weapon. When the cast starts he turns to the first one.
    if(boss && g?.turn && boss.x === 50 && boss.y === 50) boss = {...boss, f:turned ? g.turn.f : null};
    paintArena(el("arena-svg"), sc, k, res, res.length > 0, boss);
    drawPanel(r, si);
  }
  updateLive(r);
}

function lastBox(g: FightSeg, i: number, x: StepResult): string {
  const tag = x.skipped ? "Skipped" : x.missed ? "Missed" : x.ok ? "Right" : "Not there";
  return '<div class="lastans ' + (x.ok ? "ok" : "bad") + '"><span class="tag">' + tag + "</span><b>" + esc(g.scene.steps[i].q) + "</b> " + esc(g.scene.steps[i].a) + "</div>";
}

function drawPanel(r: Run, si: number): void {
  const f = r.fight, g = si >= 0 ? f.segs[si] : null, res = g ? r.results[si] : [];
  const label = r.mode === "demo" ? "The right moves" : r.mode === "replay" ? "Your run, played back" : "Real time";
  let h = '<div class="eyebrow"><b>' + label + '</b><span id="f-clock"></span><span>' + settings.speed + "x</span><span>Fight " + f.code + "</span></div>";
  h += '<ol class="ftl" id="f-tl" aria-label="Fight timeline"></ol>';
  if(g){
    const j = res.length;
    h += "<h2>" + esc(g.title) + "</h2>";
    if(j < g.due.length) h += '<div class="nowq"><span>Step ' + (j + 1) + " of " + g.due.length + ' &middot; hits in <b id="f-due"></b></span>' + esc(g.scene.steps[j].q) + "</div>";
    if(r.hold === "wait") h += '<p class="hint" style="margin-top:10px">The fight is paused. Click your spot.</p>';
    if(j > 0) h += lastBox(g, j - 1, res[j - 1]);
  } else {
    const nx = f.segs.find(x => x.from > r.t);
    h += "<h2>Between mechanics</h2>" + (nx ? '<p class="setup">Next: ' + esc(nx.title) + " at " + clock(nx.from) + ".</p>" : "");
  }
  el("f-panel").innerHTML = h;
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
    const paused = r.hold === "user";
    play.innerHTML = paused ? "&#9654;" : "&#10074;&#10074;";
    play.setAttribute("aria-label", paused ? "Play" : "Pause");
  }
  const tl = document.getElementById("f-tl");
  if(tl){
    const rows = f.events.filter(e => e.t >= r.t - KEEP && e.t - r.t <= SHOW_AT).slice(0, ROWS);
    const next = f.events.find(e => e.t > r.t);
    tl.innerHTML = rows.length ? rows.map(e => {
      const left = e.t - r.t, fill = Math.max(0, Math.min(1, 1 - left / SHOW_AT));
      const cls = (left <= 0 ? "now" : left <= SOON ? "soon" : "") + (e.raidwide ? " rw" : "");
      return '<li class="' + cls + '"><i style="width:' + (fill * 100).toFixed(1) + '%"></i><span>' + esc(e.name) + "</span><b>" + (left > 0 ? left.toFixed(1) : "") + "</b></li>";
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
}

/* ---------- the end ---------- */
function finish(): void {
  const r = R;
  if(!r) return;
  stopTimer();
  if(r.mode === "live") lastLive = {fight:r.fight, clicks:r.clicks, results:r.results};
  const watched = r.mode === "demo" ? r.fight : null;
  R = null;
  renderSummary(watched);
}

/* After a live run: how each mechanic went, and the replays. After "Watch the right moves"
   with no run of yours yet: a short end screen. */
function renderSummary(watched: Fight | null = null): void {
  state.cur = {kind:"fight"};
  const d = lastLive;
  if(!d || (watched && watched !== d.fight)){
    show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Real time</b></div><h2>That was the right way through</h2>' +
      (watched ? "<p>" + esc(watched.summary) + "</p>" : "") +
      '<div class="actions"><button type="button" class="btn" id="f-same">Play this fight</button><button type="button" class="btn ghost" id="f-back">Settings</button></div></div></div>');
    el("f-same").addEventListener("click", () => { if(watched) startRun("live", watched); });
    el("f-back").addEventListener("click", renderFight);
    return;
  }
  // Steps skipped with the slider do not count.
  const all = d.results.flat().filter(x => !x.skipped), right = all.filter(x => x.ok).length, missed = all.filter(x => x.missed).length, wrong = all.length - right - missed;
  const rows = d.fight.segs.map((g, si) => '<li><span class="fs-time">' + clock(g.from) + "</span><span>" + esc(g.title) + '</span><span class="fs-chips">' +
    d.results[si].map(x => x.skipped ? '<span class="chip" title="Skipped">&raquo;</span>' :
      '<span class="chip ' + (x.ok ? "ok" : "bad") + '">' + (x.missed ? "&ndash;" : x.ok ? "&#10003;" : "&#10007;") + "</span>").join("") + "</span></li>").join("");
  show('<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Real time</b><span>Fight done</span><span>Fight ' + d.fight.code + "</span></div>" +
    "<h2>" + right + " of " + all.length + " spots right</h2><p>" + esc(d.fight.summary) + "</p>" +
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">' + right + '</div></div><div class="bad"><span>Wrong</span><div class="big">' + wrong + '</div></div><div class="slow"><span>Missed</span><div class="big">' + missed + "</div></div></div>" +
    '<ol class="fsum">' + rows + "</ol>" +
    '<div class="actions"><button type="button" class="btn" id="f-steps">Step through my run</button><button type="button" class="btn ghost" id="f-play">Play back my run</button><button type="button" class="btn ghost" id="f-watch">Watch the right moves</button></div>' +
    '<div class="actions"><button type="button" class="btn ghost" id="f-same">Same fight again</button><button type="button" class="btn ghost" id="f-new">New fight</button><button type="button" class="btn ghost" id="f-back">Settings</button></div></div></div>');
  el("f-steps").addEventListener("click", () => renderStep(0));
  el("f-play").addEventListener("click", () => startRun("replay", d.fight, d.clicks));
  el("f-watch").addEventListener("click", () => startRun("demo", d.fight));
  el("f-same").addEventListener("click", () => startRun("live", d.fight));
  el("f-new").addEventListener("click", () => startRun("live", nextFight()));
  el("f-back").addEventListener("click", renderFight);
}

/* "Step through my run": one answered step at a time, with your click and the right spot. */
function renderStep(i: number): void {
  const d = lastLive;
  if(!d) return renderFight();
  const list = d.fight.segs.flatMap((g, si) => d.results[si].map((_x, j) => ({si, j})));
  if(!list.length) return renderSummary();
  i = Math.max(0, Math.min(i, list.length - 1));
  const {si, j} = list[i], g = d.fight.segs[si], res = d.results[si].slice(0, j + 1);
  show('<div class="stage"><div class="arena">' + sceneSVG(g.scene, g.k) + '</div><div class="panel"><div class="eyebrow"><b>Your run, step by step</b><span>' + clock(g.due[j]) + "</span><span>Step " + (i + 1) + " of " + list.length + "</span></div>" +
    "<h2>" + esc(g.title) + "</h2>" + lastBox(g, j, res[j]) +
    '<div class="actions"><button type="button" class="btn ghost" id="f-prev">Back</button><button type="button" class="btn" id="f-next">Next</button><button type="button" class="btn ghost" id="f-sum">Summary</button></div></div></div>');
  paintArena(el("arena-svg"), g.scene, g.k, res, true);
  el("f-prev").addEventListener("click", () => renderStep(i - 1));
  el("f-next").addEventListener("click", () => i + 1 < list.length ? renderStep(i + 1) : renderSummary());
  el("f-sum").addEventListener("click", () => renderSummary());
}
