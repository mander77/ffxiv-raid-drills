// Multiple-choice cards, used by the quiz tabs and the pressure round.
import { esc, shuffle, el, LS } from "../util";
import { state, getDeck, record, view, stopTimer, type McqCur, type QuizCat } from "../core";
import { tabHead, renderRoundDone } from "./common";
import { showRoute } from "../router";
import { JOB } from "../data/jobs";
import { showPressureQ } from "./pressure";
import { MECH_FIGS } from "../data/figs";
import { figSVG } from "../arena";
import type { Fig, QuizItem } from "../types";

/** The card on screen. Only call this while a multiple-choice card shows. */
function card(): McqCur {
  const c = state.cur;
  if(!c || c.kind !== "mcq") throw new Error("No question is showing");
  return c;
}

export function prepMCQ(item: QuizItem, cat: QuizCat | "pressure"): void {
  const q = item.build(state.slot);
  // TS note: ({...o, k}) copies the answer and adds its place in the question's own list,
  // so the shuffle does not lose which answer preview belongs to it.
  state.cur = {kind:"mcq", cat, item, q, opts:shuffle(q.options.map((o, k) => ({...o, k}))), answered:false, pick:-1, sel:-1, slow:false};
}

/* Any card of a quiz tab can be opened directly: from the "Go to question" list on the card, or
   with a link such as #mech/k-sword (see router.ts). While a card shows, the address bar holds
   its link, so you can copy it. */
let wanted: {cat: QuizCat; id: string} | null = null;
export function openQuestion(cat: QuizCat, id: string): void { wanted = {cat, id}; }

export function renderQuiz(cat: QuizCat): void {
  const ask = wanted?.cat === cat ? wanted.id : null;
  wanted = null;
  // A My job card belongs to one job. A link to the other job's card switches the job.
  const jobCard = cat === "job" && ask ? JOB.find(x => x.id === ask) : undefined;
  if(jobCard?.job && jobCard.job !== state.job){ state.job = jobCard.job; LS.set("job", state.job); delete state.decks.job; }
  const d = getDeck(cat);
  if(ask){ const i = d.items.findIndex(x => x.id === ask); if(i >= 0) d.i = i; }
  if(d.i >= d.items.length){ showRoute({tab:cat}); return renderRoundDone(cat, d); }
  prepMCQ(d.items[d.i], cat);
  showRoute({tab:cat, card:d.items[d.i].id});
  view.innerHTML = tabHead() + '<div class="qwrap"><div class="panel" id="q-panel"></div></div>';
  drawMCQ();
}

/** The "Go to question" list: every card of the tab in fight order, grouped by phase. */
function jumpList(cat: QuizCat): string {
  const d = getDeck(cat), cut = (s: string): string => s.length <= 58 ? s : s.slice(0, s.lastIndexOf(" ", 56)) + "…";
  let h = '<label class="qjump"><span>Go to question</span><select id="q-jump">', phase = "";
  d.items.forEach((it, i) => {
    if(it.phase !== phase){ h += (phase ? "</optgroup>" : "") + '<optgroup label="' + esc(it.phase) + '">'; phase = it.phase; }
    h += '<option value="' + i + '"' + (i === d.i ? " selected" : "") + ">" + (i + 1) + ". " + esc(it.time) + " · " + esc(cut(it.build(state.slot).prompt)) + "</option>";
  });
  return h + "</optgroup></select></label>";
}

/** The arena picture of a card, when its question has one (the Mechanics questions). */
const figOf = (c: McqCur): Fig | undefined => MECH_FIGS[c.item.id]?.(state.slot);

/** True when you pick an answer, see it on the picture, and then lock it in: the Mechanics tab.
    The Pressure round stays one click per answer, because it trains fast decisions. */
export const previews = (c: McqCur): boolean => c.cat === "mech" && Boolean(figOf(c)?.options);

/** The picture and its caption. `show` is the answer to draw (its place on screen), or -1. */
function figHTML(c: McqCur, f: Fig, show: number): string {
  const p = show >= 0 && !c.answered ? f.options?.[c.opts[show].k] : undefined;
  const label = c.answered ? "Arena picture. The green area shows the answer." : p ? "Arena picture of answer " + (show + 1) + "." : "Arena picture of the setup.";
  return figSVG(f, c.answered, label, p) + (f.note && c.answered ? "<figcaption>" + esc(f.note) + "</figcaption>" : "");
}

/** Draw answer `i` on the picture (-1 for the setup), without drawing the rest of the card again. */
function showFig(i: number): void {
  const c = state.cur, box = document.getElementById("q-fig");
  if(!c || c.kind !== "mcq" || c.answered || !box) return;
  const f = figOf(c);
  if(f) box.innerHTML = figHTML(c, f, i);
}
/** Draw the picked answer again, or the setup when none is picked. */
function showPicked(): void {
  const c = state.cur;
  if(c && c.kind === "mcq") showFig(c.sel);
}

export function drawMCQ(): void {
  const c = card(), item = c.item, q = c.q, p = el("q-panel"), fig = figOf(c), pv = previews(c);
  let prog = "";
  if(c.cat === "pressure"){ const pr = state.pressure; if(pr) prog = "Question " + (pr.i + 1) + " of " + pr.queue.length; }
  else { const d = getDeck(c.cat); prog = "Card " + (d.i + 1) + " of " + d.items.length; }
  let h = '<div class="qtop"><div class="eyebrow"><b>' + esc(item.phase) + "</b><span>" + esc(item.time) + '</span><span class="progress">' + prog + "</span></div>" +
    (c.cat !== "pressure" ? jumpList(c.cat) : "") + "</div>";
  if(c.cat === "pressure" && !c.answered)
    h += '<div class="tphase" id="timer-lbl">Read</div><div class="timer reading" id="timer" aria-hidden="true"><i style="width:0"></i></div>';
  h += "<h2>" + esc(q.prompt) + "</h2>";
  // A Mechanics question has an arena picture beside the answers (above them on a phone).
  // The Pressure round shows it too, because it asks the same questions.
  if(fig) h += '<div class="qgrid"><figure class="qfig" id="q-fig">' + figHTML(c, fig, c.sel) + '</figure><div class="qmain">';
  h += '<div class="opts" role="group" aria-label="Answers">';
  c.opts.forEach((o, i) => {
    let cls = "opt";
    if(c.answered){ if(o.ok) cls += " ok"; else if(i === c.pick) cls += " bad"; else cls += " dim"; }
    else if(pv && i === c.sel) cls += " sel";
    const pressed = pv && !c.answered ? ' aria-pressed="' + (i === c.sel) + '"' : "";
    h += '<button type="button" class="' + cls + '" data-i="' + i + '"' + pressed + (c.answered ? " disabled" : "") + '><span class="key">' + (i + 1) + "</span><span>" + esc(o.t) + "</span></button>";
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
  } else if(pv){
    h += '<div class="actions"><button type="button" class="btn" id="q-lock"' + (c.sel < 0 ? " disabled" : "") + ">Lock in answer</button>" +
      '<span class="hint">Pick an answer to see it on the map. <kbd>1</kbd> to <kbd>' + c.opts.length + "</kbd> pick, <kbd>Enter</kbd> lock in.</span></div>";
  } else {
    h += '<p class="hint" style="margin-top:12px">Press <kbd>1</kbd> to <kbd>' + c.opts.length + "</kbd> or click an answer.</p>";
  }
  if(fig) h += "</div></div>";
  p.innerHTML = h;
  p.parentElement?.classList.toggle("wide", Boolean(fig));
  p.querySelectorAll<HTMLElement>(".opt").forEach(b => {
    const i = Number(b.dataset.i);
    if(!pv){ b.addEventListener("click", () => answer(i)); return; }
    b.addEventListener("click", () => pickOpt(i));
    // Pointing at an answer, or moving to it with Tab, draws it. Leaving it draws the picked one again.
    b.addEventListener("mouseenter", () => showFig(i));
    b.addEventListener("focus", () => showFig(i));
    b.addEventListener("mouseleave", showPicked);
    b.addEventListener("blur", showPicked);
  });
  document.getElementById("q-lock")?.addEventListener("click", lockIn);
  // TS note: querySelector<HTMLSelectElement> types the result, so `.value` is known to exist.
  // TS note: `cat` is a const narrowed to QuizCat by the check, and the arrow function keeps that
  // narrowing, because a const can never change after the check.
  const jump = document.querySelector<HTMLSelectElement>("#q-jump"), cat = c.cat;
  if(jump && cat !== "pressure") jump.addEventListener("change", () => { getDeck(cat).i = Number(jump.value); renderQuiz(cat); });
  const nx = document.getElementById("q-next");
  if(nx){ nx.addEventListener("click", nextQ); nx.focus({preventScroll:true}); }
}

/** Pick answer i for a preview. It stays on the picture until you lock it in or pick another. */
export function pickOpt(i: number): void {
  const c = state.cur;
  if(!c || c.kind !== "mcq" || c.answered || !previews(c) || i < 0 || i >= c.opts.length) return;
  c.sel = i;
  document.querySelectorAll<HTMLElement>("#q-panel .opt").forEach(b => {
    const on = Number(b.dataset.i) === i;
    b.classList.toggle("sel", on);
    b.setAttribute("aria-pressed", String(on));
    // Focus follows the pick, also from a number key, so Enter then locks in the answer you see.
    if(on && document.activeElement !== b) b.focus({preventScroll:true});
  });
  // TS note: getElementById returns a plain HTMLElement. The type argument of querySelector
  // gives HTMLButtonElement instead, which has the `disabled` property.
  const lock = document.querySelector<HTMLButtonElement>("#q-lock");
  if(lock) lock.disabled = false;
  showFig(i);
}

/** Lock in the picked answer. */
export function lockIn(): void {
  const c = state.cur;
  if(c && c.kind === "mcq" && !c.answered && c.sel >= 0) answer(c.sel);
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
