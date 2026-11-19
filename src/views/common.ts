// Pieces every tab uses: the tab header and the "round done" panel.
import { esc, el } from "../util";
import { state, TABS, view, app, type Deck, type QuizCat } from "../core";
import { JOBS } from "../data/jobs";
import type { Job } from "../types";

/** Your group's guide on wtfdig, opened with your strats picked: Hector (Toxic), Kindred No Buddies, Fixed (3CJ). */
export const WTFDIG = "https://wtfdig.info/74/m11s#hector:nobuddies:fixed";

export function tabHead(): string {
  const t = TABS.find(x => x.id === state.tab) ?? TABS[0];
  let h = '<div class="tabhead"><p class="lede">' + esc(t.lede) + "</p>";
  if(state.tab === "mech"){
    h += '<a class="btn ghost guide" href="' + WTFDIG + '" target="_blank" rel="noopener">Read the wtfdig guide first <span aria-hidden="true">↗</span></a>';
  }
  if(state.tab === "map"){
    h += '<div class="ctrl"><span id="play-lbl">Mode</span><div class="seg small" role="group" aria-labelledby="play-lbl">' +
      '<button type="button" id="play-step" data-play="step" aria-pressed="' + (state.play === "step") + '">Step by step</button>' +
      '<button type="button" id="play-time" data-play="time" aria-pressed="' + (state.play === "time") + '">Real time</button></div></div>';
  }
  if(state.tab === "job"){
    h += '<div class="ctrl"><span id="job-lbl">Job</span><div class="seg small" role="group" aria-labelledby="job-lbl">' +
      (Object.keys(JOBS) as Job[]).map(j => '<button type="button" id="job-' + j + '" data-job="' + j + '" aria-pressed="' + (state.job === j) + '">' + JOBS[j] + "</button>").join("") + "</div></div>";
  }
  return h + "</div>";
}

/** One row of toggle buttons with a label. `attr` names the data attribute that the click
    handler looks for (data-set, data-pick); `cur` is the value shown as pressed. */
export function segRow(attr: string, key: string, label: string, options: Array<[string, string]>, cur: string): string {
  return '<div class="ctrl" style="margin-top:12px"><span id="' + key + '-lbl">' + label + '</span><div class="seg small" role="group" aria-labelledby="' + key + '-lbl">' +
    options.map(([v, t]) => '<button type="button" data-' + attr + '="' + key + '" data-val="' + v + '" aria-pressed="' + (v === cur) + '">' + t + "</button>").join("") + "</div></div>";
}

/** The prompt row of the HUD above the arena: a short value on the left (a step count or a time)
    and the text to read. Real time adds a cast bar and a live countdown above it. */
export function hudPrompt(count: string, text: string, idle = false): string {
  return '<div class="hud"><div class="hq' + (idle ? " idle" : "") + '"><b class="hcount">' + esc(count) + "</b><span>" + esc(text) + "</span></div></div>";
}

export function renderRoundDone(cat: "map" | QuizCat, d: Deck<unknown>): void {
  const pct = d.done ? Math.round(100 * d.right / d.done) : 0;
  view.innerHTML = tabHead() + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Round done</b></div><h2>' + d.right + " of " + d.done + " right (" + pct + "%)</h2>" +
    "<p>Your progress stays in this browser.</p>" +
    '<div class="actions"><button type="button" class="btn" id="again">Go again</button></div></div></div>';
  el("again").addEventListener("click", () => { delete state.decks[cat]; app.render(); });
}
