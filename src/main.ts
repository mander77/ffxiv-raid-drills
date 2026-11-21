// Start-up: tabs, the role and light party switch, keyboard keys and the first render.
// TS note: this file is the entry point. index.html loads it with <script type="module" src="/src/main.ts">.
// The browser cannot run TypeScript, so Vite compiles it: on the fly for `npm run dev`,
// and into dist/assets/*.js for `npm run build`.

// TS note: importing a CSS file is a Vite feature, not TypeScript. Vite adds the styles to the page
// in development and writes them to one CSS file in the build.
import "./styles.css";
import { LS, esc, el } from "./util";
import { state, TABS, app, stopTimer } from "./core";
import { parseRoute, currentRoute, showRoute, type Route } from "./router";
import { shareLink } from "./share";
import { renderQuiz, answer, nextQ, previews, pickOpt, lockIn } from "./views/quiz";
import { renderPressure, startPressure } from "./views/pressure";
import { renderMap, nextStep, nextMap } from "./views/practice";
import { renderSheet } from "./views/sheet";
import { renderHome } from "./views/home";
import { togglePause, seekBy, enterKey } from "./views/fight";
import { parseChoices } from "./data/fight";
import { ROLES, healerOf, partyOf, slotName } from "./party";
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

/* The slot switch in the header has two parts: the role, and the light party, which wtfdig calls
   the group (1 or 2). Only the healer drills exist so far. The other roles show greyed out, and say so when you point at them,
   focus them or tap them. */
function drawSlot(): void {
  const me = partyOf(state.slot);
  // Below 900 px the short letter shows in place of the word, so the role and the group fit on one row.
  el("roles").innerHTML = ROLES.map(({role, short, ready}) => '<button type="button"' + (ready ? "" : ' class="soon" aria-disabled="true"') +
    ' data-role="' + role + '" aria-label="' + role + '" aria-pressed="' + (ready && role === me.role) + '"><span class="full">' + role + '</span><span class="abbr">' + short + "</span></button>").join("");
  // TS note: `as const` keeps [1, 2] as the tuple type readonly [1, 2], so lp is a LightParty, not any number.
  el("parties").innerHTML = ([1, 2] as const).map(lp => '<button type="button" data-lp="' + lp + '" aria-pressed="' + (lp === me.lp) + '" title="' +
    slotName({lp, role:me.role}) + '">' + lp + "</button>").join("");
}

/** How long the "not yet available" tip stays after a tap. */
const SOON_MS = 2000;
let soonTimer: ReturnType<typeof setTimeout> | undefined;
/** Show the tip under a role that has no drills yet; with no button, hide it. */
function soonTip(b: HTMLElement | null, linger = false): void {
  const tip = el("soontip");
  clearTimeout(soonTimer);
  if(!b){ tip.classList.remove("on"); tip.textContent = ""; return; }
  tip.textContent = b.dataset.role + " drills: not yet available";
  tip.classList.add("on");
  // Centre it under the button, but keep it on the screen, 8 px from each side.
  const r = b.getBoundingClientRect(), half = tip.offsetWidth / 2 + 8;
  tip.style.left = Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half) + "px";
  tip.style.top = (r.bottom + 6) + "px";
  if(linger) soonTimer = setTimeout(() => soonTip(null), SOON_MS);
}

function setSlot(s: Slot): void {
  state.slot = s; LS.set("slot", s);
  drawSlot();
  state.decks = {};
  render();
}

/** Open a route (see router.ts): a tab, and the card the link names, if any. With `push`, the
    move gets a history entry, so the Back button returns to the screen before. */
function go(r: Route, push = false): void {
  if(push) showRoute(r, true);
  const t = r.tab;
  stopTimer();
  // A new tab starts at the top, also when you open it from a card low on the landing screen.
  if(t !== state.tab) window.scrollTo(0, 0);
  state.tab = t; state.pressure = null;
  renderTabs();
  render(r);
}

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
    case "sheet": return renderSheet();
    default: return renderQuiz(r.tab, r.card);
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
el("parties").addEventListener("click", e => {
  const b = (e.target as Element).closest<HTMLElement>("[data-lp]");
  if(b) setSlot(healerOf(b.dataset.lp === "2" ? 2 : 1));
});
const soonOf = (e: Event): HTMLElement | null => (e.target as Element).closest<HTMLElement>(".soon");
el("roles").addEventListener("click", e => soonTip(soonOf(e), true));
el("roles").addEventListener("pointerover", e => { if(e.pointerType === "mouse") soonTip(soonOf(e)); });
el("roles").addEventListener("pointerleave", e => { if(e.pointerType === "mouse") soonTip(null); });
el("roles").addEventListener("focusin", e => soonTip(soonOf(e)));
el("roles").addEventListener("focusout", () => soonTip(null));
// The tip is placed on the screen, not in the page, so it goes when the page scrolls.
window.addEventListener("scroll", () => soonTip(null), {passive:true});
// Share in the header shares the address of the screen you are on (see share.ts).
el<HTMLButtonElement>("share").addEventListener("click", e => shareLink(e.currentTarget as HTMLButtonElement));
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
  } else if(c.kind === "map" && e.key === "Enter" && !onButton){
    if(c.phase !== "ask"){ e.preventDefault(); nextStep(); }
    else if(c.results.length >= c.scene.steps.length){ e.preventDefault(); nextMap(); }
  } else if(c.kind === "fight" && e.key === "Enter" && !onButton){ if(enterKey()) e.preventDefault(); }
  else if(c.kind === "pstart" && e.key === "Enter" && !onButton){ e.preventDefault(); startPressure(); }
  else if(c.kind === "fight" && e.key === " " && !onButton){ e.preventDefault(); togglePause(); }
  else if(c.kind === "fight" && (e.key === "ArrowLeft" || e.key === "ArrowRight")){ e.preventDefault(); seekBy(e.key === "ArrowLeft" ? -5 : 5); }
});
// The Back and Forward buttons: open the screen of that history entry. An old # link typed into
// the address bar fires hashchange; it opens its screen, and the address bar then shows the path.
window.addEventListener("popstate", () => go(currentRoute()));
window.addEventListener("hashchange", () => go(currentRoute()));

drawSlot();
go(currentRoute());
document.fonts?.ready.then(scrollActiveTab).catch(() => { /* fonts are optional */ });
