// The Practice tab: one mechanic at a time, with no timer. Click where you stand, and the arena
// shows the right area. On a wide screen, the list beside the arena has every mechanic in fight
// order. On a narrow screen, Back, Next and phase chips take its place.
import { esc, el, newCode, random, withSeed } from "../util";
import { state, getDeck, record, view, type MapCur } from "../core";
import { rotZone, inZone, stepZone, zoneCenter } from "../geometry";
import { sceneSVG } from "../arena";
import { changes } from "../data/drills";
import { tabHead, renderRoundDone, hudPrompt } from "./common";
import { paintArena, paintHint } from "./map";
import { showRoute } from "../router";
import type { Point } from "../types";

/** The mechanic on screen. Only call this while one shows. */
// TS note: state.cur has the union type Cur. This helper checks `kind` and throws otherwise,
// so its callers get the narrower MapCur type and can use its fields without more checks.
function run(): MapCur {
  const c = state.cur;
  if(!c || c.kind !== "map") throw new Error("No mechanic is showing");
  return c;
}


/** The list beside the arena on a wide screen: every mechanic in fight order, under its phase. */
function mechList(current: string): string {
  let h = '<nav class="drillnav tlnav" aria-label="Mechanics"><ol>', phase = "";
  for(const m of getDeck("map").items){
    if(m.phase !== phase){
      phase = m.phase;
      const [num, name = ""] = phase.split(": ");
      h += '<li class="ph"><b>' + esc(num) + "</b><span>" + esc(name) + "</span></li>";
    }
    h += '<li><button type="button" data-drill-id="' + m.id + '"' + (m.id === current ? ' aria-current="step"' : "") + "><span class=\"dn-time\">" + esc(m.time) + "</span>" + esc(m.title) + "</button></li>";
  }
  return h + "</ol></nav>";
}

/** On a narrow screen the list is too long, so this shows in its place: the mechanic, Back and
    Next, and one chip for each phase that opens the first mechanic of that phase. */
function mechSteps(): string {
  const d = getDeck("map"), m = d.items[d.i];
  // TS note: flatMap with [] or [i] keeps only the indexes where a new phase starts.
  const starts = d.items.flatMap((x, i) => i === 0 || x.phase !== d.items[i - 1].phase ? [i] : []);
  const chips = starts.map(i => {
    const ph = d.items[i].phase;
    return '<button type="button" class="qchip" data-drill-id="' + d.items[i].id + '" title="' + esc(ph) + '"' + (ph === m.phase ? ' aria-current="true"' : "") + ">Phase " + (ph.match(/\d+/)?.[0] ?? "") + "</button>";
  }).join("");
  return '<nav class="mechnav" aria-label="Mechanics"><div class="eyebrow"><b>' + esc(m.phase) + '</b><span class="progress">' + (d.i + 1) + " of " + d.items.length + "</span></div>" +
    '<div class="mn-row"><p class="mn-name">' + esc(m.title) + '</p><div class="qnav">' +
    '<button type="button" class="btn ghost" id="mn-prev"' + (d.i <= 0 ? " disabled" : "") + ">&lsaquo; Back</button>" +
    '<button type="button" class="btn ghost" id="mn-next"' + (d.i >= d.items.length - 1 ? " disabled" : "") + ">Next &rsaquo;</button></div></div>" +
    '<div class="qchips" role="group" aria-label="Go to a phase">' + chips + "</div></nav>";
}

/* Draw the answers on the arena. A puddle goes off 3 seconds after it drops, and they drop 2
   seconds apart, so by the question two steps after a drop, that puddle is gone (see PUDDLE_LIFE).
   The next question shows while the last answer is still on the floor, so the puddles fade by the
   question you answer next. */
function drawFeedback(): void {
  const c = state.cur, svg = document.getElementById("arena-svg");
  if(!c || c.kind !== "map" || !svg) return;
  const n = c.results.length, showLast = c.phase !== "ask" || n >= c.scene.steps.length;
  paintArena(svg, c.scene, c.k, c.results, showLast, undefined, i => i <= n - 2);
  if(c.shown && c.phase !== "wrong") paintHint(svg, c.scene, c.k, c.results);
}

/** Draw Practice. `fresh` builds a new pattern. `ask` is a mechanic asked for by a link:
    /map/m-assault (a new pattern) or /map/m-assault/A7K2 (that pattern). */
export function renderMap(fresh = true, ask?: {id: string; code?: string}): void {
  const d = getDeck("map");
  if(ask){ const i = d.items.findIndex(m => m.id === ask.id); if(i >= 0) d.i = i; }
  if(d.i >= d.items.length){ showRoute({tab:"map"}); return renderRoundDone("map", d); }
  const item = d.items[d.i], cur = state.cur;
  if(ask || fresh || !cur || cur.kind !== "map" || cur.item !== item){
    // The code seeds every random choice, so the same code builds the same pattern.
    const code = ask?.code ?? newCode();
    const made = withSeed(code, () => {
      const v = item.variants ? item.variants[Math.floor(random() * item.variants.length)] : null;
      const k = item.rotate ? Math.floor(random() * 4) : 0;
      return {scene:item.build(state.slot, v), k};
    });
    state.cur = {kind:"map", item, scene:made.scene, k:made.k, code, results:[], phase:"ask", counted:false, setupOpen:false, shown:false, helped:false};
  }
  const c = run();
  view.innerHTML = tabHead() + '<div class="mapwrap">' + mechList(item.id) + mechSteps() +
    '<div class="stage"><div class="arena"><div id="m-hud"></div>' + sceneSVG(c.scene, c.k) + "</div>" +
    '<div class="panel" id="map-panel"></div></div></div>';
  el("arena-svg").addEventListener("click", onArenaClick);
  view.querySelectorAll<HTMLButtonElement>("[data-drill-id]").forEach(b => b.addEventListener("click", () => openAt(d.items.findIndex(m => m.id === b.dataset.drillId))));
  el("mn-prev").addEventListener("click", () => openAt(d.i - 1));
  el("mn-next").addEventListener("click", () => openAt(d.i + 1));
  view.querySelector(".drillnav [aria-current]")?.scrollIntoView({block:"nearest", inline:"nearest"});
  drawFeedback();
  drawMapPanel();
}

/** Open mechanic i of the list with a new pattern. */
function openAt(i: number): void {
  const d = getDeck("map");
  if(i < 0 || i >= d.items.length) return;
  d.i = i;
  renderMap(true);
}

/* The panel: the mechanic, its steps, the question, and the last answer. At the end, the rule
   and the way on. The same question and result show above the arena, where your eyes are. */
function drawMapPanel(): void {
  const c = run(), d = getDeck("map"), sc = c.scene, n = c.results.length, done = n >= sc.steps.length, multi = sc.steps.length > 1;
  let h = '<div class="eyebrow"><b>' + esc(c.item.phase) + '</b><span class="progress">' + (d.i + 1) + " of " + d.items.length + "</span></div>";
  h += "<h2>" + esc(c.item.title) + "</h2>";
  if(n === 0) h += '<p class="setup">' + esc(sc.setup) + "</p>";
  else h += '<p class="setup' + (c.setupOpen ? "" : " folded") + '">' + esc(sc.setup) + '</p><button type="button" class="linkbtn" id="setup-toggle">' + (c.setupOpen ? "Less" : "More") + "</button>";
  const chips = sc.steps.map((_st, i) => {
    const r = c.results[i];
    if(!r) return '<li><span class="chip' + (i === n ? " now" : "") + '">' + (i + 1) + "</span></li>";
    return '<li><span class="chip ' + (r.ok ? "ok" : "bad") + '">' + (i + 1) + (r.ok ? " &#10003;" : " &#10007;") + "</span></li>";
  }).join("");
  if(multi) h += '<ol class="chips" aria-label="Steps">' + chips + "</ol>";
  if(!done) h += '<div class="nowq">' + (multi ? "<span>Step " + (n + 1) + " of " + sc.steps.length + "</span>" : "") + esc(sc.steps[n].q) + "</div>";
  // The rule says why the spot is right: at the end, and with Show me, which gives where.
  const rule = '<div class="rule"><span>Rule</span><strong>' + esc(sc.rule) + "</strong></div>";
  if(!done && c.shown) h += rule;
  const r = c.results[n - 1];
  if(r) h += '<div class="lastans ' + (r.ok ? "ok" : "bad") + '"><span class="tag">' + (r.ok ? "Right" : "Not there") + "</span><b>" + esc(sc.steps[n - 1].q) + "</b> " + esc(sc.steps[n - 1].a) + "</div>";
  // A mechanic with nothing random would look the same again, so it gets no new-pattern button.
  const newBtn = changes(c.item) ? '<button type="button" class="btn ghost" id="map-new">New pattern</button>' : "";
  if(done){
    h += rule;
    h += '<div class="actions"><button type="button" class="btn" id="map-next">Next mechanic</button><button type="button" class="btn ghost" id="map-restart">Again</button>' + newBtn + "</div>";
  } else {
    const row = (sc.spawnPlay ? '<button type="button" class="btn ghost" id="map-replay">Watch the spawns again</button>' : "") + newBtn;
    if(row) h += '<div class="actions">' + row + "</div>";
  }
  el("map-panel").innerHTML = h;
  // Above the arena: the question with Show me, or why a spot was wrong with Next step, or the
  // result with Next mechanic and Again.
  if(done){
    const right = c.results.filter(x => x.ok).length, all = right === sc.steps.length;
    el("m-hud").innerHTML = '<div class="hud"><div class="hq done ' + (all ? "ok" : "bad") + '"><b class="hcount">' + (all ? "&#10003;" : "&#10007;") + "</b><span>" +
      (all ? (multi ? "All steps right" : "Right") : multi ? right + " of " + sc.steps.length + " right" : "Not there") +
      '</span><span class="hbtns"><button type="button" class="btn" id="hud-next">Next mechanic</button><button type="button" class="btn ghost" id="hud-again">Again</button></span></div></div>';
    el("hud-next").addEventListener("click", nextMap);
    el("hud-again").addEventListener("click", again);
  } else if(c.phase === "wrong"){
    el("m-hud").innerHTML = '<div class="hud"><div class="hq done bad"><b class="hcount">&#10007;</b><span><b>Not there.</b> ' + esc(sc.steps[n - 1].a) +
      '</span><button type="button" class="btn" id="hud-step">Next step</button></div></div>';
    el("hud-step").addEventListener("click", nextStep);
  } else {
    // Show me: the right spot for this step, and its answer in place of the question. Your next
    // click still answers, and this try does not count in your score.
    el("m-hud").innerHTML = hudPrompt((n + 1) + "/" + sc.steps.length, c.shown ? sc.steps[n].a : sc.steps[n].q,
      '<button type="button" class="btn ghost" id="hud-show" aria-pressed="' + c.shown + '">' + (c.shown ? "Hide" : "Show me") + "</button>");
    el("hud-show").addEventListener("click", () => { c.shown = !c.shown; if(c.shown) c.helped = true; drawFeedback(); drawMapPanel(); });
  }
  document.getElementById("setup-toggle")?.addEventListener("click", () => { c.setupOpen = !c.setupOpen; drawMapPanel(); });
  document.getElementById("map-replay")?.addEventListener("click", () => renderMap(false));
  document.getElementById("map-next")?.addEventListener("click", nextMap);
  document.getElementById("map-restart")?.addEventListener("click", again);
  document.getElementById("map-new")?.addEventListener("click", () => renderMap(true));
  // The address bar holds this mechanic and its pattern, so a copied link opens the same one.
  showRoute({tab:"map", drill:c.item.id, code:c.code});
}

function onArenaClick(e: MouseEvent): void {
  const c = state.cur;
  if(!c || c.kind !== "map" || c.results.length >= c.scene.steps.length) return;
  // After a wrong spot the mechanic waits for Next step, so a click here does not answer by accident.
  if(c.phase === "wrong") return;
  const svg = e.currentTarget as SVGSVGElement, ctm = svg.getScreenCTM();
  if(!ctm) return;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  answerAt(c, [q.x, q.y]);
  c.shown = false;
  // A try with Show me was learning, not a test, so it does not count in your score.
  if(c.results.length >= c.scene.steps.length && !c.counted && !c.helped){
    c.counted = true;
    const all = c.results.every(r => r.ok), d = getDeck("map");
    record(c.item.id, all); d.done++; if(all) d.right++;
  }
  drawFeedback(); drawMapPanel();
}

/** Again: the same pattern from its first step, with no help on. */
function again(): void {
  const c = run();
  c.results = []; c.phase = "ask"; c.setupOpen = false; c.shown = false; c.helped = false;
  renderMap(false);
}

/** Answer the next step with a click at p (arena units). */
function answerAt(c: MapCur, p: Point): void {
  const step = c.scene.steps[c.results.length];
  const base = step ? stepZone(step, c.results) : undefined;
  if(!step || !base) return;
  const zone = rotZone(base, c.k), ok = inZone(p, zone);
  c.results.push({p, ok, z:zone, drop:step.drop ? (ok ? p : zoneCenter(zone)) : null});
  // After a right spot the answer stays on screen until the next click, which answers the next step.
  c.phase = c.results.length < c.scene.steps.length ? (ok ? "right" : "wrong") : "ask";
}

/** Next step (the HUD button, or Enter): clear the last answer and ask the next step. */
export function nextStep(): void {
  const c = run();
  c.phase = "ask";
  drawFeedback(); drawMapPanel();
}
export function nextMap(): void { getDeck("map").i++; renderMap(true); }
