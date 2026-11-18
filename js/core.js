import { LS } from "./util.js";
import { MAPS } from "./data/drills.js";
import { MECH, DEATH, NEXT_ITEMS } from "./data/questions.js";
import { JOB } from "./data/jobs.js";

/* main.js fills in render, so views can redraw the current tab without importing main.js. */
export const app = { render(){} };

export const POOLS = {map:() => MAPS, mech:() => MECH, next:() => NEXT_ITEMS, death:() => DEATH, job:() => JOB.filter(x => x.job === state.job)};
export const TABS = [
  {id:"map", label:"Where do I stand?", lede:"Click the arena where you go. Patterns that turn in the real fight turn here too, so read the boss and the floor, not the screen."},
  {id:"mech", label:"Mechanics", lede:"What each mechanic does and what you do. Your answers follow your slot and your group's wtfdig link."},
  {id:"next", label:"What is next?", lede:"Knowing what comes next tells you how much time you have to raise. Times come from the fight timeline."},
  {id:"death", label:"Someone died", lede:"The decisions from your talk with Andrew: who first, when to raise, when to wait."},
  {id:"job", label:"My job", lede:"A suggested plan for your job, built from the current ability recasts. It is not your group's plan, so agree with your co-healer who uses what, and do not stack the same 10% on the same hit."},
  {id:"pressure", label:"Pressure round", lede:"Mixed questions on a timer. The goal is to pick something every time. A wrong answer beats a freeze."},
  {id:"sheet", label:"Cheat sheet", lede:"The rules and your timeline on one page."}
];

/* ---------- state ---------- */
export const state = {
  slot: LS.get("slot", "H1") === "H2" ? "H2" : "H1",
  job: LS.get("job", "whm") === "sge" ? "sge" : "whm",
  order: LS.get("order", "fight") === "weak" ? "weak" : "fight",
  psecs: [4,6,8,10].includes(LS.get("psecs", 6)) ? LS.get("psecs", 6) : 6,
  stats: LS.get("stats", {}) || {},
  tab: "map",
  session: {right:0, total:0},
  decks: {},
  cur: null,
  pressure: null,
  raf: 0,
  confirmReset: false
};
export const view = document.getElementById("view");

export function record(id, ok){
  const st = state.stats[id] || {s:0, r:0};
  st.s++; if(ok) st.r++;
  state.stats[id] = st; LS.set("stats", state.stats);
  state.session.total++; if(ok) state.session.right++;
  const pct = Math.round(100 * state.session.right / state.session.total);
  document.getElementById("score").textContent = "This session: " + state.session.right + " / " + state.session.total + " (" + pct + "%)";
}
export function weight(id){ const st = state.stats[id]; if(!st) return 3; return Math.max(0.3, 1 + 3 * (st.s - st.r) - 0.25 * Math.min(st.r, 3)); }
export function weighted(list){
  const pool = list.slice(), out = [];
  while(pool.length){
    const ws = pool.map(x => weight(x.id));
    let t = ws.reduce((a, b) => a + b, 0) * Math.random(), idx = 0;
    for(; idx < ws.length - 1; idx++){ t -= ws[idx]; if(t <= 0) break; }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
export function getDeck(cat){
  let d = state.decks[cat];
  if(!d){
    const src = POOLS[cat]();
    const items = state.order === "fight" ? src.slice().sort((a, b) => a.order - b.order) : weighted(src);
    d = state.decks[cat] = {items, i:0, right:0, done:0};
  }
  return d;
}

export function stopTimer(){
  if(state.raf){ cancelAnimationFrame(state.raf); state.raf = 0; }
  if(state.tout){ clearTimeout(state.tout); state.tout = 0; }
}
