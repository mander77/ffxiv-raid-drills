// Pieces every tab uses: the tab header and the "round done" panel.
import { esc, el } from "../util";
import { state, TABS, view, app, type Deck, type QuizCat } from "../core";

/** Your group's guide on wtfdig, opened with your strats picked: Hector (Toxic), Kindred No Buddies, Fixed (3CJ). */
export const WTFDIG = "https://wtfdig.info/74/m11s#hector:nobuddies:fixed";

export function tabHead(): string {
  const t = TABS.find(x => x.id === state.tab) ?? TABS[0];
  return '<div class="tabhead"><p class="lede">' + esc(t.lede) + "</p></div>";
}

/** One row of toggle buttons with a label. `attr` names the data attribute that the click
    handler looks for (data-set, data-pick); `cur` is the value shown as pressed. */
export function segRow(attr: string, key: string, label: string, options: Array<[string, string]>, cur: string): string {
  return '<div class="ctrl" style="margin-top:12px"><span id="' + key + '-lbl">' + label + '</span><div class="seg small" role="group" aria-labelledby="' + key + '-lbl">' +
    options.map(([v, t]) => '<button type="button" data-' + attr + '="' + key + '" data-val="' + v + '" aria-pressed="' + (v === cur) + '">' + t + "</button>").join("") + "</div></div>";
}

/** The prompt row of the HUD above the Practice arena: the step count on the left, the text to
    read, and an optional button (HTML) on the right. */
export function hudPrompt(count: string, text: string, button = ""): string {
  return '<div class="hud"><div class="hq"><b class="hcount">' + esc(count) + "</b><span>" + esc(text) + "</span>" + button + "</div></div>";
}

export function renderRoundDone(cat: "map" | QuizCat, d: Deck<unknown>): void {
  const pct = d.done ? Math.round(100 * d.right / d.done) : 0;
  view.innerHTML = tabHead() + '<div class="qwrap"><div class="panel"><div class="eyebrow"><b>Round done</b></div><h2>' + d.right + " of " + d.done + " right (" + pct + "%)</h2>" +
    "<p>Your progress stays in this browser.</p>" +
    '<div class="actions"><button type="button" class="btn" id="again">Go again</button></div></div></div>';
  el("again").addEventListener("click", () => { delete state.decks[cat]; app.render(); });
}
