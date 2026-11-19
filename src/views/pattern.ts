// The fight pattern picks: each random part of the fight, Random or a pick. Real time shows all
// of them on its start screen. A Step by step drill shows the ones that fit it. Both share the
// same picks (state.choices), so a pick made in one place counts in the other.
import { state, view, setChoices } from "../core";
import { cleanChoices, CHOICE_ROWS, type Picks } from "../data/fight";
import type { WeaponType } from "../data/drills";
import { segRow } from "./common";

/** The rows for these picks, in fight order. */
export function patternRows(keys: Array<keyof Picks>): string {
  return CHOICE_ROWS.filter(r => keys.includes(r.key)).map(r => r.key === "set1" || r.key === "set2" ? orderRow(r.key, r.label)
    : segRow("pick", "fc-" + r.key, r.label, [["random", "Random"] as [string, string]].concat(r.options), state.choices[r.key])).join("");
}

/** True when any of these picks is not Random. */
export const picked = (keys: Array<keyof Picks>): boolean => keys.some(k => state.choices[k] !== "random");

/* A weapon order: Random or Set order, then three cards in the order the boss takes them.
   On Random the cards show "?" and stay put. Set order numbers them 1, 2, 3 in the default
   order, and then you can drag a card to a new place, or focus it and use the arrow keys. */
const WEAPON_NAMES: Record<WeaponType, string> = {sword:"Sword", axe:"Axe", scythe:"Scythe"};
function orderRow(key: "set1" | "set2", label: string): string {
  const cur = state.choices[key], random = cur === "random", order = (random ? "sword-axe-scythe" : cur).split("-") as WeaponType[];
  return '<div class="ctrl" style="margin-top:12px"><span id="fc-' + key + '-lbl">' + label + '</span>' +
    '<div class="seg small" role="group" aria-labelledby="fc-' + key + '-lbl"><button type="button" data-pick="fc-' + key + '" data-val="random" aria-pressed="' + random + '">Random</button>' +
    '<button type="button" data-pick="fc-' + key + '" data-val="' + order.join("-") + '" aria-pressed="' + !random + '">Set order</button></div>' +
    '<ol class="wcards' + (random ? " random" : "") + '" data-key="' + key + '" aria-label="' + label + (random ? ": random" : ": drag the cards, or use the arrow keys") + '">' +
    order.map((w, i) => '<li class="wcard" data-w="' + w + '"' + (random ? "" : ' tabindex="0"') + ' aria-label="' + WEAPON_NAMES[w] + (random ? ", order random" : ", number " + (i + 1)) + '">' +
      "<b>" + (random ? "?" : i + 1) + "</b>" + WEAPON_NAMES[w] + "</li>").join("") + "</ol></div>";
}

/** Wire the pick buttons and weapon cards on the page. `after` redraws the screen once a pick
    is saved: Real time redraws its start screen, Step by step builds the drill again. */
export function wirePattern(after: () => void): void {
  view.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach(b => b.addEventListener("click", () => {
    // cleanChoices checks the value, so only a known pick goes into the saved choices.
    setChoices(cleanChoices({...state.choices, [(b.dataset.pick ?? "").replace("fc-", "")]: b.dataset.val}));
    after();
  }));
  wireCards(after);
}

/* Drag and the arrow keys for the weapon cards. Pointer events work for a mouse and a finger.
   While a card is dragged, it changes places with a neighbor once the pointer passes the middle
   of that neighbor; the new order is saved when you let go. */
function wireCards(after: () => void): void {
  // On Random the cards stay put: press Set order first.
  view.querySelectorAll<HTMLElement>(".wcards:not(.random)").forEach(list => {
    const key = list.dataset.key === "set2" ? "set2" : "set1";
    const cards = (): HTMLElement[] => [...list.querySelectorAll<HTMLElement>(".wcard")];
    const save = (focusW?: string): void => {
      setChoices(cleanChoices({...state.choices, [key]: cards().map(c => c.dataset.w).join("-")}));
      after();
      if(focusW) view.querySelector<HTMLElement>('.wcards[data-key="' + key + '"] [data-w="' + focusW + '"]')?.focus();
    };
    const mid = (c: HTMLElement): number => { const r = c.getBoundingClientRect(); return r.left + r.width / 2; };
    cards().forEach(card => {
      card.addEventListener("pointerdown", e => {
        e.preventDefault();
        try { card.setPointerCapture(e.pointerId); } catch { /* a synthetic event has no real pointer */ }
        card.classList.add("dragging");
        let moved = false;
        const move = (ev: PointerEvent): void => {
          const all = cards(), i = all.indexOf(card), prev = all[i - 1], next = all[i + 1];
          if(next && ev.clientX > mid(next)){ list.insertBefore(next, card); moved = true; }
          else if(prev && ev.clientX < mid(prev)){ list.insertBefore(card, prev); moved = true; }
          if(moved) cards().forEach((c, n) => { const b = c.querySelector("b"); if(b) b.textContent = String(n + 1); });
        };
        const up = (): void => {
          card.removeEventListener("pointermove", move); card.removeEventListener("pointerup", up); card.removeEventListener("pointercancel", up);
          card.classList.remove("dragging");
          if(moved) save();   // a tap with no move changes nothing
        };
        card.addEventListener("pointermove", move); card.addEventListener("pointerup", up); card.addEventListener("pointercancel", up);
      });
      card.addEventListener("keydown", e => {
        const all = cards(), i = all.indexOf(card), j = e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowRight" ? i + 1 : -1;
        if(j < 0 || j >= all.length) return;
        e.preventDefault(); e.stopPropagation();   // the arrows move the card, not the fight clock
        if(j < i) list.insertBefore(card, all[j]); else list.insertBefore(all[j], card);
        save(card.dataset.w);
      });
    });
  });
}
