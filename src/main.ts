// Start-up: tabs, the H1/H2 switch, keyboard keys and the first render.
// TS note: this file is the entry point. index.html loads it with <script type="module" src="/src/main.ts">.
// The browser cannot run TypeScript, so Vite compiles it: on the fly for `npm run dev`,
// and into dist/assets/*.js for `npm run build`.

// TS note: importing a CSS file is a Vite feature, not TypeScript. Vite adds the styles to the page
// in development and writes them to one CSS file in the build.
import "./styles.css";
import { LS, esc, el } from "./util";
import { state, TABS, view, app, stopTimer } from "./core";
import { parseRoute, currentRoute, showRoute, type Route } from "./router";
import { shareLink } from "./share";
import { renderQuiz, answer, nextQ, previews, pickOpt, lockIn, openQuestion } from "./views/quiz";
import { renderPressureStart, startPressure } from "./views/pressure";
import { renderSheet } from "./views/sheet";
import { renderHome } from "./views/home";
import { renderFight, togglePause, openFight, seekBy, enterKey } from "./views/fight";
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

/** Open a route (see router.ts): a tab, and the card the link names, if any. With `push`, the
    move gets a history entry, so the Back button returns to the screen before. */
function go(r: Route, push = false): void {
  if(push) showRoute(r, true);
  // A link can open one fight in the player (/map/<code>[/<picks>][?t=s]) or one quiz card
  // (/mech/<card>). A fight link with no picks had them all on Random.
  if(r.tab === "map" && r.code) openFight(r.code, parseChoices(r.picks ?? ""), r.t);
  // TS note: `"card" in r` narrows r to the quiz member of Route, so r.tab is a QuizCat here.
  if("card" in r && r.card) openQuestion(r.tab, r.card);
  const t = r.tab;
  stopTimer();
  // A new tab starts at the top, also when you open it from a card low on the landing screen.
  if(t !== state.tab) window.scrollTo(0, 0);
  state.tab = t; state.pressure = null;
  renderTabs();
  render();
}

function render(): void {
  stopTimer();
  // The address bar shows the tab. A screen that shows one card then puts that card's link there.
  showRoute({tab:state.tab});
  switch(state.tab){
    case "home": return renderHome();
    case "map": return renderFight();
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
  if(b?.dataset.tab) go(parseRoute(b.dataset.tab), true);
});
// Links inside the app (the landing screen cards and its intro) change the screen without loading
// the page again. A click with a modifier key, such as Cmd-click for a new tab, works as usual.
document.addEventListener("click", e => {
  if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');
  if(!a || a.target) return;
  e.preventDefault();
  go(parseRoute(a.getAttribute("href") ?? "/"), true);
});
document.querySelectorAll<HTMLElement>(".seg button[data-slot]").forEach(b => b.addEventListener("click", () => setSlot(b.dataset.slot === "H2" ? "H2" : "H1")));
// Share in the header shares the address of the screen you are on (see share.ts).
el<HTMLButtonElement>("share").addEventListener("click", e => shareLink(e.currentTarget as HTMLButtonElement));
view.addEventListener("click", e => {
  const t = e.target as Element;
  const j = t.closest<HTMLElement>("[data-job]");
  if(j){ state.job = j.dataset.job === "sge" ? "sge" : "whm"; LS.set("job", state.job); delete state.decks.job; return render(); }
});
document.addEventListener("keydown", e => {
  if(e.altKey || e.ctrlKey || e.metaKey) return;
  // In the "Go to question" list, number keys and Enter belong to the list.
  if((e.target as HTMLElement | null)?.tagName === "SELECT") return;
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
  } else if(c.kind === "fight" && e.key === "Enter" && !onButton){ if(enterKey()) e.preventDefault(); }
  else if(c.kind === "pstart" && e.key === "Enter" && !onButton){ e.preventDefault(); startPressure(); }
  else if(c.kind === "fight" && e.key === " " && !onButton){ e.preventDefault(); togglePause(); }
  else if(c.kind === "fight" && (e.key === "ArrowLeft" || e.key === "ArrowRight")){ e.preventDefault(); seekBy(e.key === "ArrowLeft" ? -5 : 5); }
});
// The Back and Forward buttons: open the screen of that history entry. An old # link typed into
// the address bar fires hashchange; it opens its screen, and the address bar then shows the path.
window.addEventListener("popstate", () => go(currentRoute()));
window.addEventListener("hashchange", () => go(currentRoute()));

showSlot();
go(currentRoute());
document.fonts?.ready.then(scrollActiveTab).catch(() => { /* fonts are optional */ });
