import { LS, esc } from "./util.js";
import { state, TABS, view, app, stopTimer } from "./core.js";
import { renderMap, nextStep, nextMap } from "./views/map.js";
import { renderQuiz, answer, nextQ } from "./views/quiz.js";
import { renderPressureStart, startPressure } from "./views/pressure.js";
import { renderSheet } from "./views/sheet.js";

/* ---------- tab + header ---------- */
function renderTabs(){
  const nav = document.getElementById("tabs");
  nav.innerHTML = TABS.map(t => '<button type="button" role="tab" id="tab-' + t.id + '" data-tab="' + t.id + '" aria-selected="' + (t.id === state.tab) + '">' + esc(t.label) + "</button>").join("");
  requestAnimationFrame(scrollActiveTab);
}
function scrollActiveTab(){
  const nav = document.getElementById("tabs"), act = nav && nav.querySelector('[aria-selected="true"]');
  if(!act) return;
  const l = act.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft, r = l + act.offsetWidth;
  if(l < nav.scrollLeft || r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = Math.max(0, l - 12);
}
function setSlot(s){
  state.slot = s; LS.set("slot", s);
  document.querySelectorAll(".seg button[data-slot]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.slot === s)));
  state.decks = {};
  render();
}

function go(tab){
  if(!TABS.some(t => t.id === tab)) tab = "map";
  stopTimer();
  state.tab = tab; state.pressure = null;
  renderTabs();
  if(location.hash !== "#" + tab){ try{ history.replaceState(null, "", "#" + tab); }catch(e){} }
  render();
}

function render(){
  stopTimer();
  if(state.tab === "map") return renderMap();
  if(state.tab === "pressure") return renderPressureStart();
  if(state.tab === "sheet") return renderSheet();
  return renderQuiz(state.tab);
}

app.render = render;


/* ---------- events ---------- */
document.getElementById("tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if(b) go(b.dataset.tab); });
document.querySelectorAll(".seg button[data-slot]").forEach(b => b.addEventListener("click", () => setSlot(b.dataset.slot)));
view.addEventListener("click", e => {
  const j = e.target.closest("[data-job]");
  if(j){ state.job = j.dataset.job; LS.set("job", state.job); delete state.decks.job; return render(); }
  const b = e.target.closest("[data-order]"); if(!b) return;
  state.order = b.dataset.order; LS.set("order", state.order); state.decks = {}; render();
});
document.addEventListener("keydown", e => {
  if(e.altKey || e.ctrlKey || e.metaKey) return;
  const c = state.cur; if(!c) return;
  const tag = (e.target && e.target.tagName) || "";
  if(c.kind === "mcq"){
    if(!c.answered && /^[1-9]$/.test(e.key)){ const i = Number(e.key) - 1; if(i < c.opts.length){ e.preventDefault(); answer(i); } }
    else if(c.answered && (e.key === "Enter" || e.key === " ") && tag !== "BUTTON"){ e.preventDefault(); nextQ(); }
  } else if(c.kind === "map" && e.key === "Enter" && tag !== "BUTTON"){
    if(c.waiting){ e.preventDefault(); nextStep(); }
    else if(c.results.length >= c.scene.steps.length){ e.preventDefault(); nextMap(); }
  } else if(c.kind === "pstart" && e.key === "Enter" && tag !== "BUTTON"){ e.preventDefault(); startPressure(); }
});
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if(t && t !== state.tab) go(t); });

function start(data){
  document.querySelectorAll(".seg button[data-slot]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.slot === state.slot)));
  const fromHash = location.hash.slice(1);
  go((data && data.tab) || fromHash || "map");
  try{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(scrollActiveTab); }catch(e){}
  try{ if(window.claude && window.claude.hot && window.claude.hot.snapshot){ window.claude.hot.snapshot(() => ({tab:state.tab})); } }catch(e){}
}
if(window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
