// Multiple-choice cards, used by the quiz tabs and the pressure round.
import { esc, shuffle, el } from "../util";
import { state, getDeck, record, view, stopTimer, type McqCur, type QuizCat } from "../core";
import { tabHead, renderRoundDone } from "./common";
import { showPressureQ } from "./pressure";
import type { QuizItem } from "../types";

/** The card on screen. Only call this while a multiple-choice card shows. */
function card(): McqCur {
  const c = state.cur;
  if(!c || c.kind !== "mcq") throw new Error("No question is showing");
  return c;
}

export function prepMCQ(item: QuizItem, cat: QuizCat | "pressure"): void {
  const q = item.build(state.slot);
  state.cur = {kind:"mcq", cat, item, q, opts:shuffle(q.options.map(o => ({...o}))), answered:false, pick:-1, slow:false};
}

export function renderQuiz(cat: QuizCat): void {
  const d = getDeck(cat);
  if(d.i >= d.items.length) return renderRoundDone(cat, d);
  prepMCQ(d.items[d.i], cat);
  view.innerHTML = tabHead(true) + '<div class="qwrap"><div class="panel" id="q-panel"></div></div>';
  drawMCQ();
}

export function drawMCQ(): void {
  const c = card(), item = c.item, q = c.q, p = el("q-panel");
  let prog = "";
  if(c.cat === "pressure"){ const pr = state.pressure; if(pr) prog = "Question " + (pr.i + 1) + " of " + pr.queue.length; }
  else { const d = getDeck(c.cat); prog = "Card " + (d.i + 1) + " of " + d.items.length; }
  let h = '<div class="eyebrow"><b>' + esc(item.phase) + "</b><span>" + esc(item.time) + '</span><span class="progress">' + prog + "</span></div>";
  if(c.cat === "pressure" && !c.answered) h += '<div class="timer" id="timer" aria-hidden="true"><i></i></div>';
  h += "<h2>" + esc(q.prompt) + '</h2><div class="opts" role="group" aria-label="Answers">';
  c.opts.forEach((o, i) => {
    let cls = "opt";
    if(c.answered){ if(o.ok) cls += " ok"; else if(i === c.pick) cls += " bad"; else cls += " dim"; }
    h += '<button type="button" class="' + cls + '" data-i="' + i + '"' + (c.answered ? " disabled" : "") + '><span class="key">' + (i + 1) + "</span><span>" + esc(o.t) + "</span></button>";
  });
  h += "</div>";
  if(c.answered){
    const ok = c.pick >= 0 && c.opts[c.pick].ok;
    const cls = c.slow ? "slow" : (ok ? "ok" : "bad");
    const head = c.slow ? "Too slow" : (ok ? "Right" : "Not this one");
    h += '<div class="fb ' + cls + '" role="status"><h3>' + head + "</h3>";
    if(c.slow) h += "<p>In the fight, this is the moment you would stand still. Any action beats freezing.</p>";
    h += "<p>" + esc(q.why) + "</p></div>";
    h += '<div class="rule"><span>Rule</span><strong>' + esc(q.rule) + "</strong></div>";
    if(q.src) h += '<p class="src">Source: ' + esc(q.src) + "</p>";
    h += '<div class="actions"><button type="button" class="btn" id="q-next">Next</button><span class="hint"><kbd>Enter</kbd> next</span></div>';
  } else {
    h += '<p class="hint" style="margin-top:12px">Press <kbd>1</kbd> to <kbd>' + c.opts.length + "</kbd> or click an answer.</p>";
  }
  p.innerHTML = h;
  p.querySelectorAll<HTMLElement>(".opt").forEach(b => b.addEventListener("click", () => answer(Number(b.dataset.i))));
  const nx = document.getElementById("q-next");
  if(nx){ nx.addEventListener("click", nextQ); nx.focus({preventScroll:true}); }
}

export function answer(i: number): void {
  const c = state.cur;
  if(!c || c.kind !== "mcq" || c.answered) return;
  stopTimer();
  c.answered = true; c.pick = i;
  const ok = c.opts[i].ok === true;
  record(c.item.id, ok);
  if(c.cat === "pressure"){ if(state.pressure){ if(ok) state.pressure.right++; else state.pressure.wrong++; } }
  else { const d = getDeck(c.cat); d.done++; if(ok) d.right++; }
  drawMCQ();
}

export function nextQ(): void {
  const c = card();
  if(c.cat === "pressure"){ if(state.pressure) state.pressure.i++; return showPressureQ(); }
  getDeck(c.cat).i++;
  renderQuiz(c.cat);
}
