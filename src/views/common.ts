// Pieces every tab uses: the tab header and the "round done" panel.
import { render, type ComponentChild } from "preact";
import { esc, el } from "../util";
import { state, TABS, view, app, type Deck, type QuizCat } from "../core";

/* A screen built with Preact draws into its own root element inside #view. The screens that still
   build HTML as text replace everything in #view, root included. The next Preact screen then
   starts on a new root, so Preact never works on elements that are gone. */
let root: HTMLElement | null = null;
/** Draw a Preact screen into #view. Drawing again into the same screen updates it in place. */
export function mountView(node: ComponentChild): void {
  if(!root || root.parentNode !== view){
    // Let Preact clean up the old screen first (its effects and handlers).
    if(root) render(null, root);
    root = document.createElement("div");
    root.className = "viewroot";
    view.replaceChildren(root);
  }
  render(node, root);
}

/** The one-line intro of the tab on screen. */
export const lede = (): string => (TABS.find(x => x.id === state.tab) ?? TABS[0]).lede;

export function tabHead(): string {
  return '<div class="tabhead"><p class="lede">' + esc(lede()) + "</p></div>";
}

/** A row that scrolls sideways: mark each edge that has more past it ("fl" left, "fr" right),
    now and after each scroll, so the CSS can fade that edge. */
export function fadeEdges(row: HTMLElement): void {
  const mark = (): void => {
    row.classList.toggle("fl", row.scrollLeft > 2);
    row.classList.toggle("fr", row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
  };
  mark();
  row.addEventListener("scroll", mark, {passive:true});
}

/** One row of toggle buttons with a label. `attr` names the data attribute that the click
    handler looks for (data-set, data-pick); `cur` is the value shown as pressed. */
export function segRow(attr: string, key: string, label: string, options: readonly (readonly [string, string])[], cur: string): string {
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
