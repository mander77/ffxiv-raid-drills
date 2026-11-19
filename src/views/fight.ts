// The "Full fight" tab: the drills play in fight order on the fight clock, with the boss cast bar.
import { LS, esc, el } from "../util";
import { state, view, stopTimer } from "../core";
import { rotZone, rotOverlay, inZone, zoneCenter } from "../geometry";
import { sceneSVG } from "../arena";
import { paintArena } from "./map";
import { tabHead } from "./common";
import { buildFight, clock, type Fight, type FightSeg } from "../data/fight";
import { BOSS } from "../data/drills";
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
const IDLE: Scene = {setup:"", rule:"", steps:[], overlays:[], boss:BOSS};

/* ---------- start screen ---------- */
export function renderFight(): void {
  stopTimer(); R = null;
  state.cur = {kind:"fight"};
  const row = (key: string, label: string, choices: Array<[string, string]>, cur: string): string =>
    '<div class="ctrl" style="margin-top:12px"><span id="' + key + '-lbl">' + label + '</span><div class="seg small" role="group" aria-labelledby="' + key + '-lbl">' +
    choices.map(([v, t]) => '<button type="button" data-set="' + key + '" data-val="' + v + '" aria-pressed="' + (v === cur) + '">' + t + "</button>").join("") + "</div></div>";
  view.innerHTML = tabHead(false) + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Full fight</b><span>Phase 1: the pull to 4:01</span></div>' +
    "<h2>Play the fight in order</h2><p>The drills from \"Where do I stand?\" play one after another on the fight clock. The cast bar shows what the boss is doing. Click your spot before each hit lands. Each run picks its own scenario: axe or scythe first, stack or spread first, and new weapon layouts.</p>" +
    row("fskip", "Quiet stretches", [["yes", "Skip ahead"], ["no", "Real time"]], settings.skip ? "yes" : "no") +
    row("fspeed", "Speed", SPEEDS.map((n): [string, string] => [String(n), n + "x"]), String(settings.speed)) +
    row("fpause", "Missed spot", [["no", "Fight goes on"], ["yes", "Fight pauses"]], settings.pause ? "yes" : "no") +
    (wantedFight ? '<p class="hint" style="margin-top:12px">Fight code ' + esc(wantedFight) + " is ready: the next start uses it.</p>" : "") +
    '<div class="actions"><button type="button" class="btn" id="f-start">Start the fight</button><button type="button" class="btn ghost" id="f-watch">Watch the right moves</button></div></div></div>';
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
  R = {mode, fight, t:settings.skip ? Math.max(0, fight.casts[0].start - 3) : 0, results:fight.segs.map(() => []),
       clicks:mode === "replay" ? clicks : [], next:0, hold:"", last:performance.now(), shown:""};
  state.cur = {kind:"fight"};
  view.innerHTML = tabHead(false) + '<div class="stage"><div class="arena" id="f-arena"></div><div class="panel" id="f-panel"></div></div>';
  frame();
  state.raf = requestAnimationFrame(tick);
}

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
  const dt = Math.min(0.25, (now - r.last) / 1000);   // a long gap (a hidden tab) does not jump the fight
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

/* "Skip ahead": when no mechanic is on the arena and no cast is running, jump to 3 seconds
   before the next cast or mechanic. */
function skipQuiet(r: Run): void {
  const f = r.fight;
  if(activeSeg(f, r.t) >= 0 || f.casts.some(c => c.start <= r.t && r.t < c.end)) return;
  const next = Math.min(f.end, ...f.segs.map(g => g.from).concat(f.casts.map(c => c.start)).filter(x => x > r.t));
  if(next - r.t > 5) r.t = next - 3;
}

/** Score the next step of segment si: a click at p, the right spot (p null), or a miss. */
function answer(si: number, p: Point | null, missed = false): void {
  const r = R;
  if(!r) return;
  const g = r.fight.segs[si], res = r.results[si], step = g.scene.steps[res.length];
  const base = step.zf ? step.zf(res) : step.z;
  if(!base) return;
  const zone = rotZone(base, g.k), at: Point = p ?? zoneCenter(zone);
  const ok = !missed && inZone(at, zone);
  res.push({p:at, ok, z:zone, drop:step.drop ? (ok ? at : zoneCenter(zone)) : null, missed});
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
  const faceless = Boolean(g && g.faceAt != null && r.t < g.faceAt);
  const key = si + ":" + res.length + ":" + faceless + ":" + r.hold;
  if(key !== r.shown){
    const fresh = r.shown.split(":")[0] !== String(si);   // a new scene: build the arena again
    r.shown = key;
    const sc = g ? g.scene : IDLE, k = g ? g.k : 0;
    if(fresh){ el("f-arena").innerHTML = sceneSVG(sc, k); el("arena-svg").addEventListener("click", onClick); }
    let boss: Boss | null = sc.bossAt ? sc.bossAt(res.length) : (sc.boss ? rotOverlay(sc.boss, k) : null);
    if(boss && faceless) boss = {...boss, f:null};
    paintArena(el("arena-svg"), sc, k, res, res.length > 0, boss);
    drawPanel(r, si);
  }
  updateLive(r);
}

function lastBox(g: FightSeg, i: number, x: StepResult): string {
  const tag = x.missed ? "Missed" : x.ok ? "Right" : "Not there";
  return '<div class="lastans ' + (x.ok ? "ok" : "bad") + '"><span class="tag">' + tag + "</span><b>" + esc(g.scene.steps[i].q) + "</b> " + esc(g.scene.steps[i].a) + "</div>";
}

function drawPanel(r: Run, si: number): void {
  const f = r.fight, g = si >= 0 ? f.segs[si] : null, res = g ? r.results[si] : [];
  const label = r.mode === "demo" ? "The right moves" : r.mode === "replay" ? "Your run, played back" : "Full fight";
  let h = '<div class="eyebrow"><b>' + label + '</b><span id="f-clock"></span><span>' + settings.speed + "x</span><span>Fight " + f.code + "</span></div>";
  h += '<div class="castbar" id="f-cast"><div class="cb-top"><span id="f-cast-name"></span><span id="f-cast-time"></span></div><div class="cb-bar"><i id="f-cast-fill"></i></div></div>';
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
  h += '<div class="actions"><button type="button" class="btn ghost" id="f-pause">' + (r.hold === "user" ? "Resume" : "Pause") + '</button><button type="button" class="btn ghost" id="f-quit">Stop</button><span class="hint"><kbd>Space</kbd> pause</span></div>';
  el("f-panel").innerHTML = h;
  el("f-pause").addEventListener("click", togglePause);
  el("f-quit").addEventListener("click", renderFight);
}

function updateLive(r: Run): void {
  const f = r.fight, set = (id: string, s: string): void => { const n = document.getElementById(id); if(n) n.textContent = s; };
  set("f-clock", clock(r.t));
  let c = null;
  for(const x of f.casts) if(x.start <= r.t && r.t < x.end + 1.5) c = x;   // the latest cast that started
  const box = document.getElementById("f-cast"), fill = document.getElementById("f-cast-fill");
  if(box && fill){
    box.classList.toggle("idle", !c);
    box.classList.toggle("rw", Boolean(c?.raidwide));
    set("f-cast-name", c ? c.name : "No cast");
    set("f-cast-time", c ? (r.t < c.end ? (c.end - r.t).toFixed(1) + " s" : "now") : "");
    fill.style.width = c ? (Math.min(1, (r.t - c.start) / Math.max(0.1, c.end - c.start)) * 100).toFixed(1) + "%" : "0";
  }
  const si = activeSeg(f, r.t);
  if(si >= 0){
    const g = f.segs[si], j = r.results[si].length;
    if(j < g.due.length) set("f-due", Math.max(0, g.due[j] - r.t).toFixed(1) + " s");
  }
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
    view.innerHTML = tabHead(false) + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Full fight</b></div><h2>That was the right way through</h2>' +
      (watched ? "<p>" + esc(watched.summary) + "</p>" : "") +
      '<div class="actions"><button type="button" class="btn" id="f-same">Play this fight</button><button type="button" class="btn ghost" id="f-back">Settings</button></div></div></div>';
    el("f-same").addEventListener("click", () => { if(watched) startRun("live", watched); });
    el("f-back").addEventListener("click", renderFight);
    return;
  }
  const all = d.results.flat(), right = all.filter(x => x.ok).length, missed = all.filter(x => x.missed).length, wrong = all.length - right - missed;
  const rows = d.fight.segs.map((g, si) => '<li><span class="fs-time">' + clock(g.from) + "</span><span>" + esc(g.title) + '</span><span class="fs-chips">' +
    d.results[si].map(x => '<span class="chip ' + (x.ok ? "ok" : "bad") + '">' + (x.missed ? "&ndash;" : x.ok ? "&#10003;" : "&#10007;") + "</span>").join("") + "</span></li>").join("");
  view.innerHTML = tabHead(false) + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Full fight</b><span>Phase 1 done</span><span>Fight ' + d.fight.code + "</span></div>" +
    "<h2>" + right + " of " + all.length + " spots right</h2><p>" + esc(d.fight.summary) + "</p>" +
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">' + right + '</div></div><div class="bad"><span>Wrong</span><div class="big">' + wrong + '</div></div><div class="slow"><span>Missed</span><div class="big">' + missed + "</div></div></div>" +
    '<ol class="fsum">' + rows + "</ol>" +
    '<div class="actions"><button type="button" class="btn" id="f-steps">Step through my run</button><button type="button" class="btn ghost" id="f-play">Play back my run</button><button type="button" class="btn ghost" id="f-watch">Watch the right moves</button></div>' +
    '<div class="actions"><button type="button" class="btn ghost" id="f-same">Same fight again</button><button type="button" class="btn ghost" id="f-new">New fight</button><button type="button" class="btn ghost" id="f-back">Settings</button></div></div></div>';
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
  view.innerHTML = tabHead(false) + '<div class="stage"><div class="arena">' + sceneSVG(g.scene, g.k) + '</div><div class="panel"><div class="eyebrow"><b>Your run, step by step</b><span>' + clock(g.due[j]) + "</span><span>Step " + (i + 1) + " of " + list.length + "</span></div>" +
    "<h2>" + esc(g.title) + "</h2>" + lastBox(g, j, res[j]) +
    '<div class="actions"><button type="button" class="btn ghost" id="f-prev">Back</button><button type="button" class="btn" id="f-next">Next</button><button type="button" class="btn ghost" id="f-sum">Summary</button></div></div></div>';
  paintArena(el("arena-svg"), g.scene, g.k, res, true);
  el("f-prev").addEventListener("click", () => renderStep(i - 1));
  el("f-next").addEventListener("click", () => i + 1 < list.length ? renderStep(i + 1) : renderSummary());
  el("f-sum").addEventListener("click", () => renderSummary());
}
