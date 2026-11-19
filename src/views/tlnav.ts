// The fight list beside the arena on "Where do I stand?": every ability in cast order, grouped by
// phase, with the drills under the abilities they practice. Step by step and Real time both use
// it. Only what a click does differs, so each mode passes its own handlers to wireNav().
import { esc } from "../util";
import { view } from "../core";
import { MAPS } from "../data/drills";
import { PHASES, CATS, type Cat } from "../data/abilities";
import { clock } from "../data/fight";

/** What the list highlights: the drills on screen, or the ability whose card is open. */
export interface NavOpts { current?: string[]; open?: number }

// TS note: `as const` turns [m.id, m.title] into a fixed pair. Without it, TypeScript reads it as a
// plain string[] and the Map constructor, which needs [key, value] pairs, does not accept it.
const TITLE = new Map(MAPS.map(m => [m.id, m.title] as const));

/** Under the Raw Steel Trophy row, the drill "Raw Steel Trophy: axe" reads better as "Axe". */
function short(title: string): string {
  const s = title.includes(": ") ? title.slice(title.indexOf(": ") + 2) : title;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The coloured marks of a row. A row with no category gets a grey one. */
export function marks(cats: Cat[]): string {
  return '<span class="cms" aria-hidden="true">' + (cats.length ? cats : ["none"]).map(c => '<i class="cm ' + c + '"></i>').join("") + "</span>";
}
export const catNames = (cats: Cat[]): string => cats.map(c => CATS[c]).join(", ") || "No category";

export function tlNav(o: NavOpts = {}): string {
  const key = (Object.keys(CATS) as Cat[]).map(c => "<span>" + marks([c]) + CATS[c] + "</span>").join("");
  let i = 0, h = '<nav class="drillnav tlnav" aria-label="Fight timeline"><div class="cmkey">' + key + "</div><ol>";
  for(const ph of PHASES){
    // "Phase 1: Trophy Weapons" shows as a band: the phase number above, the name below.
    const [num, name = ""] = ph.name.split(": ");
    h += '<li class="ph"><b>' + esc(num) + "</b><span>" + esc(name) + "</span></li>";
    for(const a of ph.rows){
      h += '<li><button type="button" class="ab" data-ab="' + i + '"' + (o.open === i ? ' aria-current="true"' : "") + ' title="' + esc(catNames(a.cats)) + '">' +
        marks(a.cats) + '<span class="dn-time">' + clock(a.t) + "</span><span>" + esc(a.name) + "</span></button></li>";
      // data-row: the ability this drill sits under, so Real time can pick the nearer of two.
      for(const id of a.drills ?? [])
        h += '<li><button type="button" class="dr" data-drill-id="' + id + '" data-row="' + i + '"' + (o.current?.includes(id) ? ' aria-current="step"' : "") +
          '><span class="dtag">Drill</span>' + esc(short(TITLE.get(id) ?? id)) + "</button></li>";
      i++;
    }
  }
  return h + "</ol></nav>";
}

/** Send clicks on the list to the mode's handlers. Call it after the list is on the page. */
// TS note: Step by step passes an onDrill that takes only the id. That still fits this type,
// because TypeScript, like JavaScript, lets a function ignore arguments it does not need.
export function wireNav(onAbility: (i: number) => void, onDrill: (id: string, row: number) => void): void {
  view.querySelector(".tlnav")?.addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button");
    if(!b) return;
    if(b.dataset.ab) onAbility(Number(b.dataset.ab));
    else if(b.dataset.drillId) onDrill(b.dataset.drillId, Number(b.dataset.row));
  });
  scrollNav();
}

/** Real time: highlight the drills on the arena now, and the next ability to happen. */
export function markNav(drills: string[], next: number): void {
  view.querySelectorAll<HTMLButtonElement>(".tlnav .dr").forEach(b => {
    if(drills.includes(b.dataset.drillId ?? "")) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });
  view.querySelectorAll<HTMLButtonElement>(".tlnav .ab").forEach(b => b.classList.toggle("next", Number(b.dataset.ab) === next));
  scrollNav();
}

/* Keep the highlighted row in view inside the list, without moving the page. On wide screens the
   rows scroll down under the colour key; on narrow screens the whole list is a strip that
   scrolls sideways. */
function scrollNav(): void {
  const nav = view.querySelector<HTMLElement>(".tlnav"), list = nav?.querySelector<HTMLElement>("ol"), now = nav?.querySelector<HTMLElement>("[aria-current], .next");
  if(!nav || !list || !now) return;
  list.scrollTop = now.offsetTop - list.clientHeight / 3;
  nav.scrollLeft = now.offsetLeft - (nav.clientWidth - now.offsetWidth) / 2;
}
