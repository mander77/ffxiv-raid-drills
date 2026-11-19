// The "Where do I stand?" tab: click the arena, then see the answer zone.
import { esc, el, newCode, random, withSeed } from "../util";
import { state, getDeck, record, view, type Deck, type MapCur } from "../core";
import { rotZone, rotOverlay, inZone, zoneCenter, f1 } from "../geometry";
import { sceneSVG, drawOverlay, drawBoss, zoneSVG } from "../arena";
import { PUDDLE_R, changes } from "../data/drills";
import { tabHead, renderRoundDone } from "./common";
import type { Boss, MapDrill, Point, Scene, StepResult } from "../types";

/** The drill on screen. Only call this while a map drill shows. */
// TS note: state.cur has the union type Cur. This helper checks `kind` and throws otherwise,
// so its callers get the narrower MapCur type and can use map-only fields without more checks.
function run(): MapCur {
  const c = state.cur;
  if(!c || c.kind !== "map") throw new Error("No map drill is showing");
  return c;
}

export function drawFeedback(): void {
  const c = state.cur, svg = document.getElementById("arena-svg");
  if(!c || c.kind !== "map" || !svg) return;
  paintArena(svg, c.scene, c.k, c.results, Boolean(c.waiting) || c.results.length >= c.scene.steps.length);
}

/* Draw the answer layers on an arena: dropped puddles, cues, the boss, and, with showLast,
   the zone and the click of the last answer. The drill tab and the full-fight tab both use it.
   `boss` replaces the scene's boss, for example to hide his facing before he turns. */
export function paintArena(svg: Element, sc: Scene, k: number, results: StepResult[], showLast: boolean, boss?: Boss | null): void {
  const n = results.length;
  let drops = "", fb = "", rev = "";
  results.forEach((r, i) => {
    const step = sc.steps[i], z = r.z, ctr = zoneCenter(z);
    if(r.drop) drops += '<circle class="drop" cx="' + f1(r.drop[0]) + '" cy="' + f1(r.drop[1]) + '" r="' + PUDDLE_R + '"/>';
    if(step.leave) drops += drawOverlay(step.leave);
    if(i === n - 1 && showLast){
      const cls = r.ok ? "ok" : "bad";
      if(step.reveal) rev = step.reveal.map(o => drawOverlay(rotOverlay(o, k))).join("");
      fb += '<g clip-path="url(#arenaClip)">' + zoneSVG(z, cls) + "</g>";
      const top = "c" in z ? z.c[1] - z.r : "rect" in z ? z.rect[1] : ctr[1] + 1;
      const bottom = "c" in z ? z.c[1] + z.r : "rect" in z ? z.rect[3] : ctr[1] - 1;
      const ly = "fn" in z ? ctr[1] : (top - 3 >= -3 ? top - 3 : bottom + 3);
      fb += '<g class="zlabel"><rect x="' + f1(ctr[0] - 3.2) + '" y="' + f1(ly - 2.1) + '" width="6.4" height="4.2" rx=".9"/><text x="' + f1(ctr[0]) + '" y="' + f1(ly) + '">' + state.slot + "</text></g>";
      if(!r.missed) fb += '<g class="pick ' + cls + '" transform="translate(' + f1(r.p[0]) + " " + f1(r.p[1]) + ')"><circle class="halo" r="2.6"/><circle class="dot" r="1.1"/></g>';
    }
  });
  // Cues show with their step's question and stay. They go on top of the puddles so that
  // a marker on an old puddle stays visible.
  const asking = showLast ? n - 1 : n;
  const cues = sc.steps.slice(0, asking + 1).flatMap(st => st.cue ?? []).map(o => drawOverlay(rotOverlay(o, k))).join("");
  if(boss === undefined) boss = sc.bossAt ? sc.bossAt(n) : (sc.boss ? rotOverlay(sc.boss, k) : null);
  const layer = (id: string): Element => svg.querySelector("#" + id) as Element;
  layer("reveal-layer").innerHTML = rev;
  layer("drops").innerHTML = drops + cues;
  layer("boss-layer").innerHTML = boss ? drawBoss(boss) : "";
  layer("fb-layer").innerHTML = fb;
  svg.classList.toggle("locked", n >= sc.steps.length);
  // Weapons that already resolved fade out. The one just answered stays until the next step.
  // With spawnAhead, each answered step also brings in the next weapon, with a short delay.
  const gone = showLast ? n - 1 : n, shown = sc.spawnAhead != null ? sc.spawnAhead + n : Infinity;
  svg.querySelectorAll<SVGGElement>("[data-spawn]").forEach(g => {
    const i = Number(g.dataset.spawn);
    if(g.classList.contains("later") && i < shown){ g.style.animationDelay = "0.2s"; g.classList.remove("later"); }
    g.classList.toggle("gone", i < gone);
  });
}

/* Restart the spawn animation so the player can watch the order again. Every weapon that has
   spawned so far plays again in spawn order, including the ones that already resolved and
   faded, because the first spawn is the clue. They fade again when the replay is over. */
let replayTimer = 0;
function replaySpawns(): void {
  const svg = document.getElementById("arena-svg");
  if(!svg) return;
  const shown = svg.querySelectorAll<SVGGElement>("[data-spawn]:not(.later)");
  shown.forEach(g => { g.classList.remove("gone"); g.style.animationDelay = (0.3 + Number(g.dataset.spawn)) + "s"; });
  svg.classList.remove("play");
  void svg.getBoundingClientRect();
  svg.classList.add("play");
  window.clearTimeout(replayTimer);
  replayTimer = window.setTimeout(() => { if(svg.isConnected) drawFeedback(); }, (0.3 + shown.length) * 1000 + 400);
}

/** Start the same drill again from step 1, with the same layout. */
function restart(): void {
  const c = run();
  c.results = []; c.waiting = false; c.peek = undefined; c.setupOpen = false;
  renderMap(false);
}

/* A drill and layout code asked for by a link, such as #map/m-assault/A7K2. */
let wanted: {id: string; code: string} | null = null;
export function openLayout(id: string, code: string): void { wanted = {id, code}; }

export function renderMap(fresh = true): void {
  const d = getDeck("map"), ask = wanted;
  wanted = null;
  if(ask){ const i = d.items.findIndex(m => m.id === ask.id); if(i >= 0) d.i = i; }
  if(d.i >= d.items.length) return renderRoundDone("map", d);
  const item = d.items[d.i];
  const cur = state.cur;
  if(ask || fresh || !cur || cur.kind !== "map" || cur.item !== item){
    // The code seeds every random choice: the variant, the turn and the drill's own layout.
    const code = ask?.code ?? newCode();
    const made = withSeed(code, () => {
      const v = item.variants ? item.variants[Math.floor(random() * item.variants.length)] : null;
      const k = item.rotate ? Math.floor(random() * 4) : 0;
      return {scene:item.build(state.slot, v), k};
    });
    state.cur = {kind:"map", item, scene:made.scene, k:made.k, code, results:[], counted:false};
  }
  const c = run();
  view.innerHTML = tabHead(true) + '<div class="mapwrap">' + drillNav(d) +
    '<div class="stage"><div class="arena">' + sceneSVG(c.scene, c.k) +
    '<div class="legend"><span><i style="background:var(--ring)"></i>Boss hitbox and facing</span><span><i style="background:var(--aoe)"></i>AoE</span><span><i style="background:var(--tank)"></i>Tank</span><span><i style="background:var(--dps)"></i>DPS</span></div></div>' +
    '<div class="panel" id="map-panel"></div></div></div>';
  el("arena-svg").addEventListener("click", onArenaClick);
  view.querySelectorAll<HTMLButtonElement>("[data-drill]").forEach(b => b.addEventListener("click", () => {
    getDeck("map").i = Number(b.dataset.drill); renderMap(true);
  }));
  // On narrow screens the list scrolls sideways. Bring the current drill into view.
  const nav = view.querySelector<HTMLElement>(".drillnav"), now = nav?.querySelector<HTMLElement>("[aria-current]");
  if(nav && now) nav.scrollLeft = now.offsetLeft - (nav.clientWidth - now.offsetWidth) / 2;
  drawFeedback();
  drawMapPanel();
}

/** Every drill in the deck, in deck order. Click one to jump to it. */
// TS note: Deck<MapDrill> fills in the type parameter of the generic interface Deck<T>,
// the way List<MapDrill> does in C#. So d.items is MapDrill[], and m.title is a known field.
function drillNav(d: Deck<MapDrill>): string {
  return '<nav class="drillnav" aria-label="Drills"><ol>' + d.items.map((m, i) =>
    '<li><button type="button" data-drill="' + i + '"' + (i === d.i ? ' aria-current="step"' : "") + ">" +
    '<span class="dn-time">' + esc(m.time) + "</span>" + esc(m.title) + "</button></li>").join("") + "</ol></nav>";
}

/* The panel keeps the question to answer near the top, however many steps are done:
   the setup folds after the first answer, and answered steps shrink to small chips. */
export function drawMapPanel(): void {
  const c = run(), d = getDeck("map"), sc = c.scene, n = c.results.length, done = n >= sc.steps.length, multi = sc.steps.length > 1;
  const peek = c.peek ?? n - 1;   // the step whose answer shows: the one picked, or the last one answered
  let h = '<div class="eyebrow"><b>' + esc(c.item.phase) + "</b><span>" + esc(c.item.time) + '</span><span class="progress">Drill ' + (d.i + 1) + " of " + d.items.length + "</span>" +
    (changes(c.item) ? '<span title="Send this code to rebuild this exact layout">Layout ' + c.code + "</span>" : "") + "</div>";
  h += "<h2>" + esc(c.item.title) + "</h2>";
  if(n === 0) h += '<p class="setup">' + esc(sc.setup) + "</p>";
  else h += '<p class="setup' + (c.setupOpen ? "" : " folded") + '">' + esc(sc.setup) + '</p><button type="button" class="linkbtn" id="setup-toggle">' + (c.setupOpen ? "Less" : "More") + "</button>";
  if(multi) h += '<ol class="chips" aria-label="Steps">' + sc.steps.map((_st, i) => {
    const r = c.results[i];
    if(!r) return '<li><span class="chip' + (i === n ? " now" : "") + '">' + (i + 1) + "</span></li>";
    return '<li><button type="button" class="chip ' + (r.ok ? "ok" : "bad") + '" data-peek="' + i + '" aria-pressed="' + (i === peek) + '" aria-label="Step ' + (i + 1) + ": " + (r.ok ? "right" : "not there") + '">' + (i + 1) + (r.ok ? " &#10003;" : " &#10007;") + "</button></li>";
  }).join("") + "</ol>";
  if(!done) h += '<div class="nowq">' + (multi ? "<span>Step " + (n + 1) + " of " + sc.steps.length + "</span>" : "") + esc(sc.steps[n].q) + "</div>";
  const r = c.results[peek];
  if(r) h += '<div class="lastans ' + (r.ok ? "ok" : "bad") + '"><span class="tag">' + (r.ok ? "Right" : "Not there") + "</span><b>" +
    (multi ? "Step " + (peek + 1) + ": " : "") + esc(sc.steps[peek].q) + "</b> " + esc(sc.steps[peek].a) + "</div>";
  /* Start over keeps this layout and goes back to step 1. The other button builds a new layout.
     A run counts toward the score only the first time it reaches the end. */
  const restartBtn = '<button type="button" class="btn ghost" id="map-restart">Start over</button>';
  // A drill with nothing random would look the same again, so it gets no new-layout button.
  const newBtn = !changes(c.item) ? "" : '<button type="button" class="btn ghost" id="map-new">' + (sc.spawnPlay ? "Try another spawn pattern" : "New layout") + "</button>";
  if(done){
    h += '<div class="rule"><span>Rule</span><strong>' + esc(sc.rule) + "</strong></div>";
    h += '<div class="actions"><button type="button" class="btn" id="map-next">Next drill</button>' + restartBtn + newBtn + '<span class="hint"><kbd>Enter</kbd> next</span></div>';
  } else {
    h += '<p class="hint" style="margin-top:12px">' + (n === 0 ? "Click the arena. The green area shows the right spot after you click." : "Click the arena for the next step.") + "</p>";
    const row = (sc.spawnPlay ? '<button type="button" class="btn ghost" id="map-replay">Watch the spawns again</button>' : "") + (n > 0 ? restartBtn : "") + newBtn;
    if(row) h += '<div class="actions">' + row + "</div>";
  }
  const p = el("map-panel");
  p.innerHTML = h;
  document.getElementById("setup-toggle")?.addEventListener("click", () => { c.setupOpen = !c.setupOpen; drawMapPanel(); });
  p.querySelectorAll<HTMLButtonElement>("[data-peek]").forEach(b => b.addEventListener("click", () => { c.peek = Number(b.dataset.peek); drawMapPanel(); }));
  document.getElementById("map-replay")?.addEventListener("click", replaySpawns);
  document.getElementById("map-next")?.addEventListener("click", nextMap);
  document.getElementById("map-restart")?.addEventListener("click", restart);
  document.getElementById("map-new")?.addEventListener("click", () => renderMap(true));
}

export function onArenaClick(e: MouseEvent): void {
  const c = state.cur;
  if(!c || c.kind !== "map" || c.results.length >= c.scene.steps.length) return;
  // The last answer stays on screen until the next click, and that click answers the next step.
  c.waiting = false;
  c.peek = undefined;   // show the answer to this new click, not a step picked earlier
  const svg = e.currentTarget as SVGSVGElement, ctm = svg.getScreenCTM();
  if(!ctm) return;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  const p: Point = [q.x, q.y];
  const step = c.scene.steps[c.results.length];
  const base = step.zf ? step.zf(c.results) : step.z;
  if(!base) return;
  const zone = rotZone(base, c.k);
  const ok = inZone(p, zone);
  c.results.push({p, ok, z:zone, drop:step.drop ? (ok ? p : zoneCenter(zone)) : null});
  if(c.results.length < c.scene.steps.length) c.waiting = true;
  else if(!c.counted){
    c.counted = true;
    const all = c.results.every(r => r.ok), d = getDeck("map");
    record(c.item.id, all); d.done++; if(all) d.right++;
  }
  drawFeedback(); drawMapPanel();
}

export function nextStep(): void { run().waiting = false; drawFeedback(); drawMapPanel(); }
export function nextMap(): void { getDeck("map").i++; renderMap(true); }
