// The screens that are not rebuilt in React yet: Home, Learn, Practice, Timeline and Pressure.
// They build their HTML as text into <main id="view"> (index.html). The React app (App.tsx) shows
// them through showLegacy() and hides them when a React screen is on.
// This file also holds their keyboard keys, and keeps their slot in step with the slot store.
import { state, app, stopTimer, view } from "../core";
import { showRoute, type Route } from "../router";
import { renderQuiz, answer, nextQ, previews, pickOpt, lockIn } from "./quiz";
import { renderPressure, startPressure } from "./pressure";
import { renderMap, nextStep, nextMap } from "./practice";
import { renderHome } from "./home";
import { togglePause, seekBy, enterKey } from "./fight";
import { parseChoices } from "../data/fight";
import { useSlotStore } from "../stores/slot";

/** Draw the current tab. A route from a link can also name what to open on it: one Practice
    mechanic (/map/<mechanic>[/<code>]), the full fight under Pressure (/pressure/<code>[/<picks>][?t=s])
    or one quiz card (/mech/<card>). A fight link with no picks had them all on Random. */
function render(r: Route = {tab:state.tab}): void {
  stopTimer();
  // The address bar shows the tab. A screen that shows one card then puts that card's link there.
  showRoute({tab:state.tab});
  // TS note: inside each case, TypeScript knows which member of Route r is, so r.drill or r.card
  // can be read without a check.
  switch(r.tab){
    case "home": return renderHome();
    case "map": return renderMap(true, r.drill ? {id:r.drill, code:r.code} : undefined);
    case "pressure": return renderPressure(r.code ? {code:r.code, choices:parseChoices(r.picks ?? ""), t:r.t} : undefined);
    // The Cheat sheet is a React screen, so it never gets here.
    case "sheet": return;
    default: return renderQuiz(r.tab, r.card);
  }
}
app.render = render;

/** Show an old screen for a route. */
export function showLegacy(r: Route): void {
  stopTimer();
  state.tab = r.tab; state.pressure = null;
  view.hidden = false;
  render(r);
}

/** Hide the old screens while a React screen is on. */
export function hideLegacy(): void {
  stopTimer();
  state.cur = null; state.pressure = null;
  view.hidden = true;
  view.replaceChildren();
}

// The old screens read the slot from state.slot. Keep it in step with the slot store, and draw the
// screen again for the new slot.
state.slot = useSlotStore.getState().slot;
useSlotStore.subscribe(s => {
  if(s.slot === state.slot) return;
  state.slot = s.slot; state.decks = {};
  if(!view.hidden) render();
});

document.addEventListener("keydown", e => {
  if(e.altKey || e.ctrlKey || e.metaKey) return;
  // In the "Go to question" list, number keys and Enter belong to the list.
  if((e.target as HTMLElement | null)?.tagName === "SELECT") return;
  const c = state.cur;
  if(!c) return;
  const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";
  if(c.kind === "mcq"){
    // On the Learn tab, a number key picks an answer to see it on the picture, and Enter locks
    // it in. Enter on the picked answer's own button locks it in too; on another answer it picks that one.
    const pv = previews(c), onPicked = (e.target as HTMLElement | null)?.dataset?.i === String(c.sel);
    if(!c.answered && /^[1-9]$/.test(e.key)){ const i = Number(e.key) - 1; if(i < c.opts.length){ e.preventDefault(); if(pv) pickOpt(i); else answer(i); } }
    else if(!c.answered && pv && e.key === "Enter" && c.sel >= 0 && (!onButton || onPicked)){ e.preventDefault(); lockIn(); }
    else if(c.answered && (e.key === "Enter" || e.key === " ") && !onButton){ e.preventDefault(); nextQ(); }
  } else if(c.kind === "map" && e.key === "Enter" && !onButton){
    if(c.phase !== "ask"){ e.preventDefault(); nextStep(); }
    else if(c.results.length >= c.scene.steps.length){ e.preventDefault(); nextMap(); }
  } else if(c.kind === "fight" && e.key === "Enter" && !onButton){ if(enterKey()) e.preventDefault(); }
  else if(c.kind === "pstart" && e.key === "Enter" && !onButton){ e.preventDefault(); startPressure(); }
  else if(c.kind === "fight" && e.key === " " && !onButton){ e.preventDefault(); togglePause(); }
  else if(c.kind === "fight" && (e.key === "ArrowLeft" || e.key === "ArrowRight")){ e.preventDefault(); seekBy(e.key === "ArrowLeft" ? -5 : 5); }
});
