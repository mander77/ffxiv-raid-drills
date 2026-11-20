// The picture on a Timeline card: the fight timeline at the moment of the question, the way the
// cactbot overlay shows it, and a strip of the four phases with where you are in the fight.
import { esc } from "../util";
import { TL } from "../data/timeline";
import { PHASES, tlCats } from "../data/abilities";
import { marks } from "./tlnav";
import type { QuizItem } from "../types";

const toSec = (t: string): number => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
const mmss = (s: number): string => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
/** The enrage, in seconds: the end of the phase strip. */
const END = 660;
/** At least this many rows show after the one that just happened, and at most MAX_ROWS. */
const MIN_ROWS = 5, MAX_ROWS = 8;
/** A row's bar fills as its time comes closer: empty a minute out, full at its time. */
const FILL_AT = 60;

/** The phases as [short name, start, end] in seconds, for the strip. */
const STRIP = PHASES.map((p, k) => {
  const start = k === 0 ? 0 : Math.min(...p.rows.map(a => a.t));
  const next = PHASES[k + 1], end = next ? Math.min(...next.rows.map(a => a.t)) : END;
  return {name:p.name.split(": ")[1] ?? p.name, start, end};
});

/** The phase strip: each phase as wide as it lasts, labelled P1 to P4 (the names do not fit in
    the short phases), and a mark where `now` is. The line under it names the phase you are in. */
function strip(now: number): string {
  const k = Math.max(0, STRIP.findIndex(p => now >= p.start && now < p.end));
  return '<div class="tlstrip" aria-hidden="true">' +
    STRIP.map((p, x) => '<span style="width:' + ((p.end - p.start) / END * 100).toFixed(2) + '%" title="' + esc(p.name) + '">P' + (x + 1) + "</span>").join("") +
    '<i class="here" style="left:' + (now / END * 100).toFixed(2) + '%"></i></div>' +
    '<p class="tlwhere"><b>P' + (k + 1) + " · " + esc(STRIP[k].name) + "</b> " + mmss(now) + " of " + mmss(END) + "</p>";
}

/** The picture for a Timeline card (ids "n-<row>" and "r-<row>": row <row> just happened), or
    null for any other card. Before the answer, the coming rows show their bars and countdowns
    but not their names. After it, the names show, and the right one is outlined. */
export function timelineFig(item: QuizItem, answered: boolean, rightName: string): string | null {
  const m = /^[nr]-(\d+)$/.exec(item.id);
  if(!m) return null;
  const i = Number(m[1]), now = toSec(TL[i].t);
  const right = TL.findIndex((e, x) => x > i && e.n === rightName);
  const last = Math.min(TL.length - 1, i + MAX_ROWS, Math.max(i + MIN_ROWS, right));
  let h = strip(now) + '<ol class="ftl tlq" aria-label="Fight timeline">' +
    '<li class="now"><i style="width:100%"></i><span>' + marks(tlCats(i)) + esc(TL[i].n) + "</span><b>" + TL[i].t + "</b></li>";
  for(let x = i + 1; x <= last; x++){
    const left = toSec(TL[x].t) - now, fill = Math.max(0, Math.min(1, 1 - left / FILL_AT));
    const name = answered ? marks(tlCats(x)) + esc(TL[x].n) : '<span class="tlhide">? ? ?</span>';
    h += '<li class="' + (answered && x === right ? "right" : "") + '"><i style="width:' + (fill * 100).toFixed(1) + '%"></i><span>' + name + "</span><b>in " + (left < 60 ? left + " s" : mmss(left)) + "</b></li>";
  }
  return '<div class="tlfig">' + h + "</ol></div>";
}
