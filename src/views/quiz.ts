// Multiple-choice cards, used by the quiz tabs and the pressure round.
import { esc, shuffle, el } from "../util";
import { state, getDeck, record, view, stopTimer, type McqCur, type QuizCat } from "../core";
import { tabHead, renderRoundDone, fadeEdges } from "./common";
import { showRoute } from "../router";
import { showPressureQ } from "./pressure";
import { MECH_FIGS } from "../data/figs";
import { MECH_GROUPS } from "../data/questions";
import { PHASES } from "../data/abilities";
import { figSVG } from "../arena";
import { timelineFig } from "./tlfig";
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
  const d = getDeck(cat);
  if(ask){ const i = d.items.findIndex(x => x.id === ask); if(i >= 0) d.i = i; }
  if(d.i >= d.items.length){ showRoute({tab:cat}); return renderRoundDone(cat, d); }
  prepMCQ(d.items[d.i], cat);
  showRoute({tab:cat, card:d.items[d.i].id});
  view.innerHTML = tabHead() + '<div class="qwrap"><div class="panel" id="q-panel"></div></div>';
  drawMCQ();
}

/* ---------- moving between cards ---------- */
/** When each phase starts, in seconds, for the Timeline chips. */
const PHASE_STARTS = PHASES.map((p, k) => k === 0 ? 0 : Math.min(...p.rows.map(a => a.t)));
const PHASE_CHIPS = PHASES.map((p, k) => "P" + (k + 1) + " · " + (p.name.split(": ")[1] ?? p.name));
const toSec = (t: string): number => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };

/** The chips over a card: the Learn cards by mechanic, the Timeline cards by phase. Each chip
    lists its cards (their places in the deck), in fight order. */
function chipGroups(cat: QuizCat): Array<{name: string; idx: number[]}> {
  const keyOf = (it: QuizItem): string => cat === "mech" ? MECH_GROUPS.find(g => g.ids.includes(it.id))?.name ?? ""
    : PHASE_CHIPS[PHASE_STARTS.reduce((k, start, i) => toSec(it.time) >= start ? i : k, 0)];
  const groups: Array<{name: string; idx: number[]}> = [];
  getDeck(cat).items.forEach((it, i) => {
    const name = keyOf(it);
    if(!name) return;
    const g = groups.find(x => x.name === name);
    if(g) g.idx.push(i); else groups.push({name, idx:[i]});
  });
  return groups;
}

/** Back and Next, then the chips: a chip goes to the first card it covers, and the chip of the
    card on screen is lit. */
function navHTML(cat: QuizCat): string {
  const d = getDeck(cat);
  return '<div class="qnav"><button type="button" class="btn ghost" id="q-prev"' + (d.i <= 0 ? " disabled" : "") + '>&lsaquo; Back</button>' +
    '<button type="button" class="btn ghost" id="q-fwd"' + (d.i >= d.items.length - 1 ? " disabled" : "") + ">Next &rsaquo;</button></div>";
}
function chipsHTML(cat: QuizCat): string {
  const d = getDeck(cat);
  return '<div class="qchips" role="group" aria-label="' + (cat === "mech" ? "Go to a mechanic" : "Go to a phase") + '">' +
    chipGroups(cat).map(g => '<button type="button" class="qchip" data-jump="' + g.idx[0] + '"' + (g.idx.includes(d.i) ? ' aria-current="true"' : "") + ">" + esc(g.name) + "</button>").join("") + "</div>";
}

/** The arena picture of a card, when its question has one (the Mechanics questions). */
const figOf = (c: McqCur): Fig | undefined => MECH_FIGS[c.item.id]?.(state.slot);

/** True when you pick an answer, see it on the picture, and then lock it in: the Learn tab.
    The quick round under Pressure stays one click per answer, because it trains fast decisions. */
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
  // A Timeline question has a picture of the fight timeline at that moment instead.
  const tl = fig ? null : timelineFig(item, c.answered, q.options.find(o => o.ok)?.t ?? "");
  let prog = "";
  if(c.cat === "pressure"){ const pr = state.pressure; if(pr) prog = "Question " + (pr.i + 1) + " of " + pr.queue.length; }
  else { const d = getDeck(c.cat); prog = "Card " + (d.i + 1) + " of " + d.items.length; }
  let h = '<div class="qtop"><div class="eyebrow"><b>' + esc(item.phase) + "</b><span>" + esc(item.time) + '</span><span class="progress">' + prog + "</span></div>" +
    (c.cat !== "pressure" ? navHTML(c.cat) : "") + "</div>" + (c.cat !== "pressure" ? chipsHTML(c.cat) : "");
  if(c.cat === "pressure" && !c.answered)
    h += '<div class="tphase" id="timer-lbl">Read</div><div class="timer reading" id="timer" aria-hidden="true"><i style="width:0"></i></div>';
  h += "<h2>" + esc(q.prompt) + "</h2>";
  // A Mechanics question has an arena picture beside the answers (above them on a phone).
  // The Pressure round shows it too, because it asks the same questions. There the timer runs,
  // so on a phone the answers come first ("qfirst") and are all on screen when it starts.
  const grid = '<div class="qgrid' + (c.cat === "pressure" ? " qfirst" : "") + '">';
  if(fig) h += grid + '<figure class="qfig" id="q-fig">' + figHTML(c, fig, c.sel) + '</figure><div class="qmain">';
  else if(tl) h += grid + '<figure class="qfig qtl">' + tl + '</figure><div class="qmain">';
  h += '<div class="opts" role="group" aria-label="Answers">';
  // After the answer, the right answer holds its own explanation, and a wrong pick is tagged.
  const okPick = c.answered && c.pick >= 0 && c.opts[c.pick].ok;
  c.opts.forEach((o, i) => {
    let cls = "opt", more = "";
    if(c.answered){
      if(o.ok){ cls += " ok"; more = '<span class="optwhy"><b>Right answer.</b> ' + esc(q.why) + "</span>"; }
      else if(i === c.pick){ cls += " bad"; more = ' <span class="opttag">Your pick</span>'; }
      else cls += " dim";
    }
    else if(pv && i === c.sel) cls += " sel";
    const pressed = pv && !c.answered ? ' aria-pressed="' + (i === c.sel) + '"' : "";
    h += '<button type="button" class="' + cls + '" data-i="' + i + '"' + pressed + (c.answered ? " disabled" : "") + '><span class="key">' + (i + 1) + "</span><span>" + esc(o.t) + more + "</span></button>";
  });
  h += "</div>";
  if(c.answered){
    // The colours on the answers say how it went. A screen reader hears it, and a timeout gets
    // its own card: freezing is what the quick round trains you out of.
    h += c.slow
      ? '<div class="fb slow" role="status"><h3>Too slow</h3><p>In the fight, this is the moment you would stand still. Any action beats freezing.</p></div>'
      : '<p class="sr" role="status">' + (okPick ? "Right." : "Not this one.") + "</p>";
    h += '<div class="rule"><span>Rule</span><strong>' + esc(q.rule) + "</strong></div>";
    if(q.src) h += '<p class="src">Source: ' + esc(q.src) + "</p>";
    h += '<div class="actions"><button type="button" class="btn" id="q-next">Next</button><span class="hint keys"><kbd>Enter</kbd> next</span></div>';
  } else if(pv){
    // On a phone the answers are below the picture, so once you pick one, Lock in answer stays
    // in a bar at the bottom of the screen ("lockbar on", see pickOpt).
    h += '<div class="actions lockbar' + (c.sel >= 0 ? " on" : "") + '" id="q-actions"><button type="button" class="btn" id="q-lock"' + (c.sel < 0 ? " disabled" : "") + ">Lock in answer</button>" +
      '<span class="hint">Pick an answer to see it on the map.<span class="keys"> <kbd>1</kbd> to <kbd>' + c.opts.length + "</kbd> pick, <kbd>Enter</kbd> lock in.</span></span></div>";
  } else {
    h += '<p class="hint keys" style="margin-top:12px">Press <kbd>1</kbd> to <kbd>' + c.opts.length + "</kbd> or click an answer.</p>";
  }
  if(fig || tl) h += "</div></div>";
  p.innerHTML = h;
  p.parentElement?.classList.toggle("wide", Boolean(fig || tl));
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
  // TS note: `cat` is a const narrowed to QuizCat by the check, and the arrow function keeps that
  // narrowing, because a const can never change after the check.
  const cat = c.cat;
  if(cat !== "pressure"){
    const go = (i: number): void => { const d = getDeck(cat); d.i = Math.max(0, Math.min(d.items.length - 1, i)); renderQuiz(cat); };
    document.getElementById("q-prev")?.addEventListener("click", () => go(getDeck(cat).i - 1));
    document.getElementById("q-fwd")?.addEventListener("click", () => go(getDeck(cat).i + 1));
    // TS note: querySelector<HTMLButtonElement> types the result, so `.dataset` is known to exist.
    p.querySelectorAll<HTMLButtonElement>("[data-jump]").forEach(b => b.addEventListener("click", () => go(Number(b.dataset.jump))));
    // On a phone the chips are one row that scrolls sideways. Scroll the current chip to the middle.
    const row = p.querySelector<HTMLElement>(".qchips"), on = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if(row && on && row.scrollWidth > row.clientWidth) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
    if(row) fadeEdges(row);
  }
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
  document.getElementById("q-actions")?.classList.add("on");
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
