import { LS } from "../util.js";
import { state, view, weighted, record, stopTimer, POOLS } from "../core.js";
import { MECH, DEATH, NEXT_ITEMS } from "../data/questions.js";
import { tabHead } from "./common.js";
import { prepMCQ, drawMCQ } from "./quiz.js";

/* ---------- pressure round ---------- */
export function renderPressureStart(){
  let h = tabHead(false) + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Pressure round</b><span>12 questions</span></div>' +
    "<h2>Practice deciding fast</h2><p>Each question has a short timer. When it runs out, the round counts a freeze and shows you the answer. Aim for zero freezes first. Correct answers come with practice.</p>" +
    '<div class="ctrl" style="margin-top:14px"><span id="secs-lbl">Seconds per question</span><div class="seg small" role="group" aria-labelledby="secs-lbl">' +
    [4,6,8,10].map(n => '<button type="button" id="secs-' + n + '" data-secs="' + n + '" aria-pressed="' + (state.psecs === n) + '">' + n + "</button>").join("") +
    '</div></div><div class="actions"><button type="button" class="btn" id="p-start">Start</button><span class="hint"><kbd>Enter</kbd> start</span></div></div></div>';
  view.innerHTML = h;
  state.cur = {kind:"pstart"};
  view.querySelectorAll("[data-secs]").forEach(b => b.addEventListener("click", () => { state.psecs = Number(b.dataset.secs); LS.set("psecs", state.psecs); renderPressureStart(); }));
  document.getElementById("p-start").addEventListener("click", startPressure);
}
export function startPressure(){
  const pool = [...MECH, ...DEATH, ...NEXT_ITEMS, ...POOLS.job()];
  state.pressure = {queue:weighted(pool).slice(0, 12), i:0, right:0, wrong:0, froze:0};
  showPressureQ();
}
export function showPressureQ(){
  const pr = state.pressure;
  if(pr.i >= pr.queue.length) return renderPressureDone();
  prepMCQ(pr.queue[pr.i], "pressure");
  view.innerHTML = tabHead(false) + '<div class="qwrap"><div class="panel" id="q-panel"></div></div>';
  drawMCQ();
  startTimer();
}
export function startTimer(){
  stopTimer();
  const ms = state.psecs * 1000, t0 = performance.now();
  state.tout = setTimeout(() => { state.tout = 0; timeout(); }, ms);
  const tick = now => {
    const el = document.getElementById("timer");
    if(!el || state.cur.answered){ state.raf = 0; return; }
    const left = Math.max(0, 1 - (now - t0) / ms);
    el.firstChild.style.width = (left * 100).toFixed(1) + "%";
    el.classList.toggle("low", left < 0.34);
    state.raf = left > 0 ? requestAnimationFrame(tick) : 0;
  };
  state.raf = requestAnimationFrame(tick);
}
export function timeout(){
  const c = state.cur; if(!c || c.kind !== "mcq" || c.cat !== "pressure" || c.answered) return;
  stopTimer();
  c.answered = true; c.slow = true; c.pick = -1;
  state.pressure.froze++;
  record(c.item.id, false);
  drawMCQ();
}
export function renderPressureDone(){
  const pr = state.pressure;
  const msg = pr.froze === 0 ? "No freezes. You made a choice every time, which is the habit you want in the fight." :
    "Each freeze is a moment you would stand still in the fight. Run it again and aim for zero freezes, even if some answers are wrong.";
  view.innerHTML = tabHead(false) + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Round done</b></div><h2>' + pr.right + " of " + pr.queue.length + " right</h2>" +
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">' + pr.right + '</div></div><div class="bad"><span>Wrong</span><div class="big">' + pr.wrong + '</div></div><div class="slow"><span>Froze</span><div class="big">' + pr.froze + "</div></div></div>" +
    "<p>" + msg + '</p><div class="actions"><button type="button" class="btn" id="p-again">Run it again</button><button type="button" class="btn ghost" id="p-speed">Change speed</button></div></div></div>';
  state.cur = {kind:"pdone"};
  document.getElementById("p-again").addEventListener("click", startPressure);
  document.getElementById("p-speed").addEventListener("click", renderPressureStart);
}
