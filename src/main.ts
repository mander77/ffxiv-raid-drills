// Start-up: tabs, the H1/H2 switch, keyboard keys and the first render.
// TS note: this file is the entry point. index.html loads it with <script type="module" src="/src/main.ts">.
// The browser cannot run TypeScript, so Vite compiles it: on the fly for `npm run dev`,
// and into dist/assets/*.js for `npm run build`.

// TS note: importing a CSS file is a Vite feature, not TypeScript. Vite adds the styles to the page
// in development and writes them to one CSS file in the build.
import "./styles.css";
import { LS, esc, el, isCode } from "./util";
import { state, TABS, view, app, stopTimer, type Tab, type Play } from "./core";
import { renderMap, nextStep, nextMap, openPattern } from "./views/map";
import { renderQuiz, answer, nextQ, previews, pickOpt, lockIn } from "./views/quiz";
import { renderPressureStart, startPressure } from "./views/pressure";
import { renderSheet } from "./views/sheet";
import { renderHome } from "./views/home";
import { renderFight, togglePause, openFight, seekBy } from "./views/fight";
import { parseChoices } from "./data/fight";
import type { Slot } from "./types";

function renderTabs(): void {
  el("tabs").innerHTML = TABS.map(t => '<button type="button" role="tab" id="tab-' + t.id + '" data-tab="' + t.id + '" aria-selected="' + (t.id === state.tab) + '">' + esc(t.label) + "</button>").join("");
  requestAnimationFrame(scrollActiveTab);
}

/** On a phone the tab strip scrolls sideways. Keep the active tab in view. */
function scrollActiveTab(): void {
  const nav = el("tabs"), act = nav.querySelector<HTMLElement>('[aria-selected="true"]');
  if(!act) return;
  const l = act.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft, r = l + act.offsetWidth;
  if(l < nav.scrollLeft || r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = Math.max(0, l - 12);
}

function showSlot(): void {
  document.querySelectorAll<HTMLElement>(".seg button[data-slot]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.slot === state.slot)));
}

function setSlot(s: Slot): void {
  state.slot = s; LS.set("slot", s);
  showSlot();
  state.decks = {};
  render();
}

function setPlay(p: Play): void { state.play = p; LS.set("play", p); }

function go(tab: string): void {
  // A link can name a pattern: #map/<drill id>/<code> opens that drill step by step, and
  // #fight/<code> opens that fight in real time. #fight was a tab of its own before.
  const [name, a = "", b = ""] = tab.split("/");
  // TS note: `?.` and `??` work as in C#. If find() returns undefined, `?.id` is undefined,
  // and `?? "home"` falls back to the landing screen. Any text from the URL becomes a valid Tab.
  const t: Tab = name === "fight" ? "map" : TABS.find(x => x.id === name)?.id ?? "home";
  if(t === "map" && a && isCode(b)){ setPlay("step"); openPattern(a, b.toUpperCase()); }
  // #fight/<code>/raw=axe,ult=cw: the code, then the fight pattern choices, if any.
  if(name === "fight"){ setPlay("time"); if(isCode(a)) openFight(a.toUpperCase(), b ? parseChoices(b) : undefined); }
  stopTimer();
  // A new tab starts at the top, also when you open it from a card low on the landing screen.
  if(t !== state.tab) window.scrollTo(0, 0);
  state.tab = t; state.pressure = null;
  renderTabs();
  if(location.hash !== "#" + t){ try { history.replaceState(null, "", "#" + t); } catch { /* sandboxed frame */ } }
  render();
}

function render(): void {
  stopTimer();
  switch(state.tab){
    case "home": return renderHome();
    case "map": return state.play === "time" ? renderFight() : renderMap();
    case "pressure": return renderPressureStart();
    case "sheet": return renderSheet();
    default: return renderQuiz(state.tab);
  }
}
app.render = render;

/* ---------- events ---------- */
el("tabs").addEventListener("click", e => {
  // TS note: e.target has the general type EventTarget. `as Element` asserts it is an element,
  // which is true for a click. closest<HTMLElement>() passes a type argument so the result
  // has `.dataset`, which plain Element does not have.
  const b = (e.target as Element).closest<HTMLElement>("[data-tab]");
  if(b?.dataset.tab) go(b.dataset.tab);
});
document.querySelectorAll<HTMLElement>(".seg button[data-slot]").forEach(b => b.addEventListener("click", () => setSlot(b.dataset.slot === "H2" ? "H2" : "H1")));
view.addEventListener("click", e => {
  const t = e.target as Element;
  const j = t.closest<HTMLElement>("[data-job]");
  if(j){ state.job = j.dataset.job === "sge" ? "sge" : "whm"; LS.set("job", state.job); delete state.decks.job; return render(); }
  // A click on Real time while it is on goes back to the fight settings.
  const m = t.closest<HTMLElement>("[data-play]");
  if(m){ setPlay(m.dataset.play === "time" ? "time" : "step"); render(); }
});
document.addEventListener("keydown", e => {
  if(e.altKey || e.ctrlKey || e.metaKey) return;
  const c = state.cur;
  if(!c) return;
  const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";
  if(c.kind === "mcq"){
    // On the Mechanics tab, a number key picks an answer to see it on the map, and Enter locks
    // it in. Enter on the picked answer's own button locks it in too; on another answer it picks that one.
    const pv = previews(c), onPicked = (e.target as HTMLElement | null)?.dataset?.i === String(c.sel);
    if(!c.answered && /^[1-9]$/.test(e.key)){ const i = Number(e.key) - 1; if(i < c.opts.length){ e.preventDefault(); if(pv) pickOpt(i); else answer(i); } }
    else if(!c.answered && pv && e.key === "Enter" && c.sel >= 0 && (!onButton || onPicked)){ e.preventDefault(); lockIn(); }
    else if(c.answered && (e.key === "Enter" || e.key === " ") && !onButton){ e.preventDefault(); nextQ(); }
  } else if(c.kind === "map" && e.key === "Enter" && !onButton){
    if(c.waiting){ e.preventDefault(); nextStep(); }
    else if(c.results.length >= c.scene.steps.length){ e.preventDefault(); nextMap(); }
  } else if(c.kind === "pstart" && e.key === "Enter" && !onButton){ e.preventDefault(); startPressure(); }
  else if(c.kind === "fight" && e.key === " " && !onButton){ e.preventDefault(); togglePause(); }
  else if(c.kind === "fight" && (e.key === "ArrowLeft" || e.key === "ArrowRight")){ e.preventDefault(); seekBy(e.key === "ArrowLeft" ? -5 : 5); }
});
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if(t && t !== state.tab) go(t); });

showSlot();
go(location.hash.slice(1) || "home");
document.fonts?.ready.then(scrollActiveTab).catch(() => { /* fonts are optional */ });
