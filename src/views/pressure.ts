// The Pressure tab: the same questions, fast. A quick round of 12 timed questions from Learn and
// Timeline, or the full fight on the fight clock (fight.ts).
import { LS, el, readingMs } from "../util";
import { state, view, weighted, record, stopTimer } from "../core";
import { MECH, NEXT_ITEMS } from "../data/questions";
import { tabHead } from "./common";
import { prepMCQ, drawMCQ } from "./quiz";
import { fightWanted, fightNeedsSlot, renderFight, startFightRun, watchFight } from "./fight";

/** A link to a fight opens it, and a new role (H1 or H2) keeps the fight on screen. Otherwise the
    start screen shows. */
export function renderPressure(): void {
  if(fightWanted() || fightNeedsSlot()) return renderFight();
  renderPressureStart();
}

function renderPressureStart(): void {
  view.innerHTML = tabHead() + '<div class="qwrap pchoices"><div class="panel"><div class="eyebrow"><b>Quick round</b><span>12 questions</span></div>' +
    "<h2>Timed questions</h2><p>Questions from Learn and Timeline. Time to read, then a short timer to decide. Aim for zero freezes.</p>" +
    '<div class="ctrl" style="margin-top:14px"><span id="secs-lbl">Seconds to decide</span><div class="seg small" role="group" aria-labelledby="secs-lbl">' +
    [4, 6, 8, 10].map(n => '<button type="button" id="secs-' + n + '" data-secs="' + n + '" aria-pressed="' + (state.psecs === n) + '">' + n + "</button>").join("") +
    '</div></div><div class="actions"><button type="button" class="btn" id="p-start">Start</button><span class="hint keys"><kbd>Enter</kbd> start</span></div></div>' +
    '<div class="panel"><div class="eyebrow"><b>Full fight</b><span>Every mechanic in order</span></div>' +
    "<h2>The whole fight on the clock</h2><p>The run: click your spot before each hit lands. About 5 minutes, with your score at the end. Watch: the whole fight plays with the right moves.</p>" +
    // A first run can stop at each new mechanic, so you can look before the clock runs.
    '<label class="pstops"><input type="checkbox" id="p-stops"' + (LS.get("fstops", false) ? " checked" : "") + "> Stop at each new mechanic, so I can look first</label>" +
    '<div class="actions"><button type="button" class="btn" id="p-fight">Start the run</button><button type="button" class="btn ghost" id="p-watch">Watch the right moves</button></div></div></div>';
  state.cur = {kind:"pstart"};
  view.querySelectorAll<HTMLElement>("[data-secs]").forEach(b => b.addEventListener("click", () => {
    state.psecs = Number(b.dataset.secs); LS.set("psecs", state.psecs); renderPressureStart();
  }));
  el("p-start").addEventListener("click", startPressure);
  el("p-fight").addEventListener("click", startFightRun);
  el("p-watch").addEventListener("click", watchFight);
  el<HTMLInputElement>("p-stops").addEventListener("change", e => LS.set("fstops", (e.target as HTMLInputElement).checked));
}

export function startPressure(): void {
  const pool = [...MECH, ...NEXT_ITEMS];
  state.pressure = {queue:weighted(pool).slice(0, 12), i:0, right:0, wrong:0, froze:0};
  showPressureQ();
}

export function showPressureQ(): void {
  const pr = state.pressure;
  if(!pr) return;
  if(pr.i >= pr.queue.length) return renderPressureDone();
  prepMCQ(pr.queue[pr.i], "pressure");
  view.innerHTML = tabHead() + '<div class="qwrap"><div class="panel" id="q-panel"></div></div>';
  drawMCQ();
  startTimer();
}

/* Two phases. First the reading time, which depends on the length of the question and its
   answers: the bar fills up. Then the decision time the player chose: the bar drains.
   An answer counts in either phase. Only the end of the decision time counts as a freeze.
   A timeout ends the question even when the tab is in the background.
   The animation frame loop only moves the bar. */
function startTimer(): void {
  stopTimer();
  const cur = state.cur;
  if(!cur || cur.kind !== "mcq") return;
  const read = readingMs([cur.q.prompt, ...cur.q.options.map(o => o.t)]), decide = state.psecs * 1000, t0 = performance.now();
  state.tout = window.setTimeout(() => { state.tout = 0; timeout(); }, read + decide);
  const tick = (now: number): void => {
    const bar = document.getElementById("timer"), lbl = document.getElementById("timer-lbl"), c = state.cur;
    if(!bar || !c || c.kind !== "mcq" || c.answered){ state.raf = 0; return; }
    const t = now - t0, reading = t < read;
    const fill = reading ? t / read : Math.max(0, 1 - (t - read) / decide);
    (bar.firstElementChild as HTMLElement).style.width = (fill * 100).toFixed(1) + "%";
    bar.classList.toggle("reading", reading);
    bar.classList.toggle("low", !reading && fill < 0.34);
    if(lbl) lbl.textContent = reading ? "Read" : "Decide";
    state.raf = reading || fill > 0 ? requestAnimationFrame(tick) : 0;
  };
  state.raf = requestAnimationFrame(tick);
}

export function timeout(): void {
  const c = state.cur;
  if(!c || c.kind !== "mcq" || c.cat !== "pressure" || c.answered) return;
  stopTimer();
  c.answered = true; c.slow = true; c.pick = -1;
  if(state.pressure) state.pressure.froze++;
  record(c.item.id, false);
  drawMCQ();
}

function renderPressureDone(): void {
  const pr = state.pressure;
  if(!pr) return;
  const msg = pr.froze === 0 ? "No freezes. You made a choice every time, which is the habit you want in the fight." :
    "Each freeze is a moment you would stand still in the fight. Run it again and aim for zero freezes, even if some answers are wrong.";
  view.innerHTML = tabHead() + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Round done</b></div><h2>' + pr.right + " of " + pr.queue.length + " right</h2>" +
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">' + pr.right + '</div></div><div class="bad"><span>Wrong</span><div class="big">' + pr.wrong + '</div></div><div class="slow"><span>Froze</span><div class="big">' + pr.froze + "</div></div></div>" +
    "<p>" + msg + '</p><div class="actions"><button type="button" class="btn" id="p-again">Run it again</button><button type="button" class="btn ghost" id="p-speed">Change speed</button></div></div></div>';
  state.cur = {kind:"pdone"};
  el("p-again").addEventListener("click", startPressure);
  el("p-speed").addEventListener("click", renderPressureStart);
}
