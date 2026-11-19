// The "Where do I stand?" tab: click the arena, then see the answer zone.
import { esc, el, newCode, random, withSeed } from "../util";
import { state, getDeck, record, view, setChoices, type MapCur } from "../core";
import { rotZone, rotOverlay, inZone, zoneCenter, f1 } from "../geometry";
import { sceneSVG, drawOverlay, drawBoss, zoneSVG, hitsSVG } from "../arena";
import { BOSS, MAPS, changes, facingNext } from "../data/drills";
import { PUDDLE_R } from "../data/attacks";
import { ABILITIES } from "../data/abilities";
import { clock, choicesText, parseChoices, RANDOM, type Choices, type Picks } from "../data/fight";
import { tabHead, renderRoundDone, hudPrompt } from "./common";
import { showRoute } from "../router";
import { tlNav, wireNav, marks, catNames } from "./tlnav";
import { patternRows, wirePattern, picked } from "./pattern";
import type { Boss, MapDrill, Point, Scene, StepResult } from "../types";

/** The drill on screen. Only call this while a map drill shows. */
// TS note: state.cur has the union type Cur. This helper checks `kind` and throws otherwise,
// so its callers get the narrower MapCur type and can use map-only fields without more checks.
function run(): MapCur {
  const c = state.cur;
  if(!c || c.kind !== "map") throw new Error("No map drill is showing");
  return c;
}

/* Draw the answers on the arena. When you look back at an earlier step (c.peek), the arena shows
   the moment right after that answer: its zone and click, the puddles up to then, and where the
   boss stood. */
export function drawFeedback(): void {
  const c = state.cur, svg = document.getElementById("arena-svg");
  if(!c || c.kind !== "map" || !svg) return;
  const b = lookBack(c);
  paintArena(svg, c.scene, c.k, b >= 0 ? c.results.slice(0, b + 1) : c.results,
    b >= 0 || Boolean(c.waiting) || c.results.length >= c.scene.steps.length);
}

/** The earlier step the arena shows from a chip, or -1. A chip for the answer that is already
    on the arena (just answered, or the end of the drill) is not a look back. */
function lookBack(c: MapCur): number {
  const n = c.results.length, live = c.waiting || n >= c.scene.steps.length ? n - 1 : -1;
  return c.peek != null && c.peek !== live ? c.peek : -1;
}

/* Draw the answer layers on an arena: dropped puddles, cues, the boss, and, with showLast,
   the zone and the click of the last answer. The drill tab and the full-fight tab both use it.
   `boss` replaces the scene's boss, for example to hide his facing before he turns. */
export function paintArena(svg: Element, sc: Scene, k: number, results: StepResult[], showLast: boolean, boss?: Boss | null): void {
  const n = results.length, asking = showLast ? n - 1 : n;
  // The puddles dropped before the last step with clearDrops (up to the one asked) are gone.
  const kept = sc.steps.slice(0, asking + 1).reduce((from, st, i) => st.clearDrops ? i : from, 0);
  let drops = "", fb = "", rev = "";
  results.forEach((r, i) => {
    const step = sc.steps[i], z = r.z, ctr = zoneCenter(z);
    if(r.drop && i >= kept) drops +='<circle class="drop" cx="' + f1(r.drop[0]) + '" cy="' + f1(r.drop[1]) + '" r="' + PUDDLE_R + '"/>';
    if(step.leave) drops += drawOverlay(step.leave);
    if(i === n - 1 && showLast){
      const cls = r.ok ? "ok" : "bad";
      if(step.reveal) rev = hitsSVG(step.reveal.map(o => rotOverlay(o, k)));
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
  const cues = sc.steps.slice(0, asking + 1).flatMap(st => st.cue ?? []).map(o => drawOverlay(rotOverlay(o, k))).join("");
  if(boss === undefined){
    boss = sc.bossAt ? sc.bossAt(n) : (sc.boss ? rotOverlay(sc.boss, k) : null);
    // Asking the next weapon: he has already turned to face it.
    if(boss && n > 0 && !showLast) boss = facingNext(sc, n, boss);
  }
  const layer = (id: string): Element => svg.querySelector("#" + id) as Element;
  layer("reveal-layer").innerHTML = rev;
  layer("drops").innerHTML = drops + cues;
  layer("boss-layer").innerHTML = boss ? drawBoss(boss) : "";
  layer("fb-layer").innerHTML = fb;
  svg.classList.toggle("locked", n >= sc.steps.length);
  // Weapons that already resolved fade out. The one just answered stays until the next step.
  // With spawnAhead, each answered step also brings in the next weapon, with a short delay.
  const gone = showLast ? n - 1 : n, shown = sc.spawnAhead != null ? sc.spawnAhead + n : Infinity;
  // A look back at an earlier step hides the weapons that spawned after it again.
  svg.querySelectorAll<SVGGElement>("[data-spawn]").forEach(g => {
    const i = Number(g.dataset.spawn);
    if(i >= shown) g.classList.add("later");
    else if(g.classList.contains("later")){ g.style.animationDelay = "0.2s"; g.classList.remove("later"); }
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

/** Start the same drill again from step 1, with the same pattern. */
function restart(): void {
  const c = run();
  c.results = []; c.waiting = false; c.stop = false; c.peek = undefined; c.setupOpen = false;
  renderMap(false);
}

/** The pick for a fight pattern key, or undefined when it is Random (or the key is not set). */
function followedPick(key?: string): string | undefined {
  const v = key ? (state.choices as Record<string, string>)[key] : undefined;
  return v && v !== "random" ? v : undefined;
}
/** The fight pattern keys a drill follows, for its pick rows. */
const followedKeys = (m: MapDrill): Array<keyof Picks> =>
  [m.follows?.variant, m.follows?.pick].filter((k): k is keyof Picks => Boolean(k && k in state.choices));

/** The picks a drill follows, written for its link ("set2=axe-sword-scythe"), or "" when they are all Random. */
function drillPicks(m: MapDrill): string {
  const c: Choices = {...RANDOM};
  // TS note: with a key typed as a union (keyof Picks), TypeScript cannot match the two sides of
  // `c[k] = state.choices[k]`, so the copy goes through a plain string record.
  for(const k of followedKeys(m)) (c as Record<string, string>)[k] = state.choices[k];
  return choicesText(c);
}

/** Set the picks a drill follows to the ones in a link. A pick the link leaves out was Random. */
function usePicks(m: MapDrill, picks?: string): void {
  const keys = followedKeys(m);
  if(!keys.length) return;
  const from = picks ? parseChoices(picks) : RANDOM, next: Choices = {...state.choices};
  for(const k of keys) (next as Record<string, string>)[k] = from[k];
  setChoices(next);
}

/* A drill asked for by a link (see router.ts): /map/m-assault (a new pattern), /map/m-assault/A7K2
   (that pattern), with the fight pattern picks it follows and the clicks so far if the link has
   them. Also an ability card asked for by a link, such as /map/ability/12. */
interface Wanted { id: string; code?: string; picks?: string; at?: Point[] }
let wanted: Wanted | null = null;
let wantedAbility: number | null = null;
export function openPattern(id: string, code?: string, picks?: string, at?: Point[]): void { wanted = {id, code, picks, at}; }
/** `n` counts the rows of the fight list from 1, as the link does. */
export function openAbility(n: number): void { wantedAbility = n - 1; }

export function renderMap(fresh = true): void {
  if(wantedAbility != null && ABILITIES[wantedAbility]){ const i = wantedAbility; wantedAbility = null; return showAbility(i); }
  wantedAbility = null;
  const d = getDeck("map"), ask = wanted;
  wanted = null;
  if(ask){ const i = d.items.findIndex(m => m.id === ask.id); if(i >= 0) d.i = i; }
  if(d.i >= d.items.length){ showRoute({tab:"map"}); return renderRoundDone("map", d); }
  const item = d.items[d.i];
  // A link to an exact pattern also sets the fight pattern picks this drill follows, the way they
  // were when the link was made (a pick missing from the link was Random). Otherwise your own
  // saved picks would build a different pattern from the same code.
  if(ask?.code) usePicks(item, ask.picks);
  const cur = state.cur;
  if(ask || fresh || !cur || cur.kind !== "map" || cur.item !== item){
    // The code seeds every random choice: the variant, the turn and the drill's own pattern.
    // A fight pattern pick that fits this drill replaces a random result; the random call still
    // happens, so the code keeps its meaning for the other parts.
    const code = ask?.code ?? newCode();
    const made = withSeed(code, () => {
      const rolled = item.variants ? item.variants[Math.floor(random() * item.variants.length)] : null;
      const want = followedPick(item.follows?.variant), v = want && item.variants?.includes(want) ? want : rolled;
      const k = item.rotate ? Math.floor(random() * 4) : 0;
      return {scene:item.build(state.slot, v, followedPick(item.follows?.pick)), k};
    });
    state.cur = {kind:"map", item, scene:made.scene, k:made.k, code, results:[], counted:false};
  }
  const c = run();
  // A link with clicks: answer them again, the same as the clicks that made the link, so the
  // arena shows the same answers. Each step before the last one was gone past with Next step.
  // A drill opened this way does not count toward your score.
  if(ask?.at?.length){
    const clicks = ask.at.slice(0, c.scene.steps.length);
    clicks.forEach((p, i) => { answerAt(c, p); if(i < clicks.length - 1){ c.waiting = false; c.stop = false; } });
    c.counted = c.results.length >= c.scene.steps.length;
  }
  view.innerHTML = tabHead() + '<div class="mapwrap">' + tlNav({current:[item.id]}) +
    '<div class="stage"><div class="arena"><div id="m-hud"></div>' + sceneSVG(c.scene, c.k) + LEGEND + "</div>" +
    '<div class="panel" id="map-panel"></div></div></div>';
  el("arena-svg").addEventListener("click", onArenaClick);
  wireNav(showAbility, openDrill);
  drawFeedback();
  drawMapPanel();
}

const LEGEND = '<div class="legend"><span><i style="background:var(--ring)"></i>Boss hitbox and facing</span><span><i style="background:var(--aoe)"></i>AoE</span><span><i style="background:var(--tank)"></i>Tank</span><span><i style="background:var(--dps)"></i>DPS</span></div>';

/** A drill picked in the fight list. */
function openDrill(id: string): void {
  const d = getDeck("map"), i = d.items.findIndex(m => m.id === id);
  if(i < 0) return;
  d.i = i;
  renderMap(true);
}

/* An ability picked in the fight list: what it does, when it hits, its category, and the drills
   for it. The arena stays on screen, empty, so the page does not jump around. */
const IDLE: Scene = {setup:"", rule:"", steps:[], overlays:[], boss:BOSS};
export function showAbility(i: number): void {
  const a = ABILITIES[i];
  if(!a) return;
  state.cur = {kind:"ability", i};
  showRoute({tab:"map", ability:i + 1});
  const drills = (a.drills ?? []).flatMap(id => MAPS.filter(m => m.id === id));
  view.innerHTML = tabHead() + '<div class="mapwrap">' + tlNav({open:i}) +
    '<div class="stage"><div class="arena">' + hudPrompt(clock(a.t), a.name, true) + sceneSVG(IDLE, 0) + "</div>" +
    '<div class="panel"><div class="eyebrow"><b>' + esc(a.phase) + "</b><span>Hits at " + clock(a.t) + "</span></div>" +
    "<h2>" + esc(a.name) + '</h2><p class="cmline">' + marks(a.cats) + esc(catNames(a.cats)) + '</p><p class="setup">' + esc(a.note) + "</p>" +
    (drills.length
      ? '<div class="actions">' + drills.map(m => '<button type="button" class="btn" data-drill-id="' + m.id + '">Practice: ' + esc(m.title) + "</button>").join("") + "</div>"
      : '<p class="hint" style="margin-top:12px">No drill for this one yet. Pick a drill in the list to practice.</p>') +
    "</div></div></div>";
  paintArena(el("arena-svg"), IDLE, 0, [], false);
  wireNav(showAbility, openDrill);
  view.querySelectorAll<HTMLButtonElement>(".panel [data-drill-id]").forEach(b => b.addEventListener("click", () => openDrill(b.dataset.drillId ?? "")));
}

/* The panel keeps the question to answer near the top, however many steps are done:
   the setup folds after the first answer, and answered steps shrink to small chips. */
export function drawMapPanel(): void {
  const c = run(), d = getDeck("map"), sc = c.scene, n = c.results.length, done = n >= sc.steps.length, multi = sc.steps.length > 1;
  const peek = c.peek ?? n - 1;   // the step whose answer shows: the one picked, or the last one answered
  const back = lookBack(c) >= 0;   // looking back: the arena shows an earlier step
  const onArena = back ? peek : done ? n - 1 : n;   // the step the arena shows; its chip is pressed
  const keys = followedKeys(c.item);   // the fight pattern picks that fit this drill
  let h = '<div class="eyebrow"><b>' + esc(c.item.phase) + "</b><span>" + esc(c.item.time) + '</span><span class="progress">Drill ' + (d.i + 1) + " of " + d.items.length + "</span>" +
    (picked(keys) ? '<span class="mypick" title="A fight pattern pick is set for this drill. Change it below.">Your pick</span>' : "") + "</div>";
  h += "<h2>" + esc(c.item.title) + "</h2>";
  if(n === 0) h += '<p class="setup">' + esc(sc.setup) + "</p>";
  else h += '<p class="setup' + (c.setupOpen ? "" : " folded") + '">' + esc(sc.setup) + '</p><button type="button" class="linkbtn" id="setup-toggle">' + (c.setupOpen ? "Less" : "More") + "</button>";
  const chips = sc.steps.map((_st, i) => {
    const r = c.results[i];
    // The step you are on is a button too: it brings the arena back from an earlier step.
    if(!r) return i === n
      ? '<li><button type="button" class="chip now" data-peek="live" aria-pressed="' + (i === onArena) + '" aria-label="Step ' + (i + 1) + ': the step you are on">' + (i + 1) + "</button></li>"
      : '<li><span class="chip">' + (i + 1) + "</span></li>";
    return '<li><button type="button" class="chip ' + (r.ok ? "ok" : "bad") + '" data-peek="' + i + '" aria-pressed="' + (i === onArena) + '" aria-label="Step ' + (i + 1) + ": " + (r.ok ? "right" : "not there") + '">' + (i + 1) + (r.ok ? " &#10003;" : " &#10007;") + "</button></li>";
  }).join("");
  if(multi) h += '<ol class="chips" aria-label="Steps">' + chips + "</ol>";
  if(!done) h += '<div class="nowq">' + (multi ? "<span>Step " + (n + 1) + " of " + sc.steps.length + "</span>" : "") + esc(sc.steps[n].q) + "</div>";
  const r = c.results[peek];
  if(r) h += '<div class="lastans ' + (r.ok ? "ok" : "bad") + '"><span class="tag">' + (r.ok ? "Right" : "Not there") + "</span><b>" +
    (multi ? "Step " + (peek + 1) + ": " : "") + esc(sc.steps[peek].q) + "</b> " + esc(sc.steps[peek].a) + "</div>";
  /* Start over keeps this pattern and goes back to step 1. The other button builds a new pattern.
     A run counts toward the score only the first time it reaches the end. */
  const restartBtn = '<button type="button" class="btn ghost" id="map-restart">Start over</button>';
  // A drill with nothing random would look the same again, so it gets no reroll button.
  const newBtn = !changes(c.item) ? "" : '<button type="button" class="btn ghost" id="map-new">' + (sc.spawnPlay ? "Try another spawn pattern" : "Reroll random mechs") + "</button>";
  if(done){
    h += '<div class="rule"><span>Rule</span><strong>' + esc(sc.rule) + "</strong></div>";
    h += '<div class="actions"><button type="button" class="btn" id="map-next">Next drill</button>' + restartBtn + newBtn + '<span class="hint"><kbd>Enter</kbd> next</span></div>';
  } else {
    h += '<p class="hint" style="margin-top:12px">' + (n === 0 ? "Click the arena. The green area shows the right spot after you click." : c.stop ? "Not there. Press Next step above the arena, or Enter, to go on." : "Click the arena for the next step.") + "</p>";
    const row = (sc.spawnPlay ? '<button type="button" class="btn ghost" id="map-replay">Watch the spawns again</button>' : "") + (n > 0 ? restartBtn : "") + newBtn;
    if(row) h += '<div class="actions">' + row + "</div>";
  }
  // The fight pattern picks that fit this drill, shared with Real time. A change builds the drill
  // again with the pick; Random leaves that part to the pattern code.
  if(keys.length) h += '<div class="drillpick"><h3 class="fpick">Practice a pattern</h3><p class="hint">Real time uses these picks too.' +
    (keys.some(k => k === "set1" || k === "set2") ? " For a weapon order, press Set order, then drag the cards into the order the boss takes them." : "") + "</p>" + patternRows(keys) + "</div>";
  const p = el("map-panel");
  p.innerHTML = h;
  wirePattern(() => renderMap(true));
  // The same prompt above the arena, where your eyes are when you click.
  // When the drill is done, the HUD shows the result and the Next drill button. On a phone the
  // panel is below the arena, so this keeps the button in view without scrolling.
  if(back){
    // Looking back: say so, and offer the way back where your eyes are.
    el("m-hud").innerHTML = '<div class="hud"><div class="hq idle"><b class="hcount">' + (peek + 1) + "/" + sc.steps.length + "</b><span>Looking back at step " + (peek + 1) + '.</span><button type="button" class="btn ghost" id="hud-back">' +
      (done ? "Back to the end" : "Back to step " + (n + 1)) + "</button></div></div>";
    el("hud-back").addEventListener("click", () => { c.peek = undefined; drawMapPanel(); drawFeedback(); });
  } else if(done){
    const right = c.results.filter(x => x.ok).length, all = right === sc.steps.length;
    const result = all ? (multi ? "All steps right" : "Right") : multi ? right + " of " + sc.steps.length + " right" : "Not there";
    el("m-hud").innerHTML = '<div class="hud"><div class="hq done ' + (all ? "ok" : "bad") + '"><b class="hcount">' + (all ? "&#10003;" : "&#10007;") + "</b><span>" + result +
      '</span><button type="button" class="btn" id="hud-next">Next drill</button></div></div>';
    el("hud-next").addEventListener("click", nextMap);
  } else if(c.stop){
    // A wrong spot: say so where your eyes are, give the right answer, and wait for Next step.
    el("m-hud").innerHTML = '<div class="hud"><div class="hq done bad"><b class="hcount">&#10007;</b><span><b>Not there.</b> ' + esc(sc.steps[n - 1].a) +
      '</span><button type="button" class="btn" id="hud-step">Next step</button></div></div>';
    el("hud-step").addEventListener("click", nextStep);
  } else el("m-hud").innerHTML = hudPrompt((n + 1) + "/" + sc.steps.length, sc.steps[n].q);
  // On a phone the panel is below the arena, so the HUD gets the step chips too (CSS shows this
  // copy only when the panel is not beside the arena). Both copies work the same way.
  if(multi) el("m-hud").querySelector(".hud")?.insertAdjacentHTML("afterbegin", '<ol class="chips hchips" aria-label="Steps">' + chips + "</ol>");
  document.getElementById("setup-toggle")?.addEventListener("click", () => { c.setupOpen = !c.setupOpen; drawMapPanel(); });
  view.querySelectorAll<HTMLButtonElement>(".stage [data-peek]").forEach(b => b.addEventListener("click", () => {
    c.peek = b.dataset.peek === "live" ? undefined : Number(b.dataset.peek);
    drawMapPanel(); drawFeedback();
  }));
  document.getElementById("map-replay")?.addEventListener("click", replaySpawns);
  document.getElementById("map-next")?.addEventListener("click", nextMap);
  document.getElementById("map-restart")?.addEventListener("click", restart);
  document.getElementById("map-new")?.addEventListener("click", () => renderMap(true));
  // The address bar holds this drill as it is now: the pattern, the picks it follows and the
  // clicks so far, so a copied link opens the same map.
  showRoute({tab:"map", drill:c.item.id, code:c.code, picks:drillPicks(c.item) || undefined, at:c.results.length ? c.results.map(r => r.p) : undefined});
}

export function onArenaClick(e: MouseEvent): void {
  const c = state.cur;
  if(!c || c.kind !== "map" || c.results.length >= c.scene.steps.length) return;
  // After a wrong spot the drill waits for Next step, so a click here does not answer by accident.
  if(c.stop) return;
  const svg = e.currentTarget as SVGSVGElement, ctm = svg.getScreenCTM();
  if(!ctm) return;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  answerAt(c, [q.x, q.y]);
  if(c.results.length >= c.scene.steps.length && !c.counted){
    c.counted = true;
    const all = c.results.every(r => r.ok), d = getDeck("map");
    record(c.item.id, all); d.done++; if(all) d.right++;
  }
  drawFeedback(); drawMapPanel();
}

/** Answer the next step with a click at p (arena units). A click on the arena and a link with
    clicks both come here, so a link shows exactly what the clicks showed. */
function answerAt(c: MapCur, p: Point): void {
  const step = c.scene.steps[c.results.length];
  const base = step?.zf ? step.zf(c.results) : step?.z;
  if(!step || !base) return;
  // After a right spot the answer stays on screen until the next click, which answers the next step.
  c.waiting = false;
  c.peek = undefined;   // show the answer to this new click, not a step picked earlier
  const zone = rotZone(base, c.k), ok = inZone(p, zone);
  c.results.push({p, ok, z:zone, drop:step.drop ? (ok ? p : zoneCenter(zone)) : null});
  if(c.results.length < c.scene.steps.length){ c.waiting = true; c.stop = !ok; }
}

/** Next step (the HUD button, or Enter): clear the last answer and ask the next step. */
export function nextStep(): void {
  const c = run();
  c.waiting = false; c.stop = false; c.peek = undefined;
  drawFeedback(); drawMapPanel();
}
export function nextMap(): void { getDeck("map").i++; renderMap(true); }
