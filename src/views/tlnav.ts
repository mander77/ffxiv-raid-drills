// The fight list beside the arena on "Where do I stand?": every ability in cast order, grouped by
// phase, with the drills under the abilities they practice. Step by step and Real time both use
// it. Only what a click does differs, so each mode passes its own handlers to wireNav().
import { esc } from "../util";
import { view } from "../core";
import { MAPS } from "../data/drills";
import { PHASES, CATS, type Ability, type Cat } from "../data/abilities";
import { clock } from "../data/fight";

/** What the list highlights, and what can be clicked. */
export interface NavOpts {
  /** The drills to highlight. */
  current?: string[];
  /** The ability whose card is open. */
  open?: number;
  /** Only drills that pass can be clicked. Real time: the drills the fight clock reaches. */
  drillOk?: (id: string) => boolean;
  /** Only abilities that pass can be clicked. */
  abilityOk?: (a: Ability) => boolean;
  /** The tooltip on a greyed-out row. */
  offTitle?: string;
}

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
    h += '<li class="ph">' + esc(ph.name) + "</li>";
    for(const a of ph.rows){
      const ok = o.abilityOk ? o.abilityOk(a) : true;
      h += '<li><button type="button" class="ab" data-ab="' + i + '"' + (o.open === i ? ' aria-current="true"' : "") +
        (ok ? ' title="' + esc(catNames(a.cats)) + '"' : ' disabled title="' + esc(o.offTitle ?? "") + '"') + ">" +
        marks(a.cats) + '<span class="dn-time">' + clock(a.t) + "</span><span>" + esc(a.name) + "</span></button></li>";
      for(const id of a.drills ?? []){
        const dok = o.drillOk ? o.drillOk(id) : true;
        h += '<li><button type="button" class="dr" data-drill-id="' + id + '"' + (o.current?.includes(id) ? ' aria-current="step"' : "") +
          (dok ? "" : ' disabled title="' + esc(o.offTitle ?? "") + '"') + '><span class="dtag">Drill</span>' + esc(short(TITLE.get(id) ?? id)) + "</button></li>";
      }
      i++;
    }
  }
  return h + "</ol></nav>";
}

/** Send clicks on the list to the mode's handlers. Call it after the list is on the page. */
export function wireNav(onAbility: (i: number) => void, onDrill: (id: string) => void): void {
  view.querySelector(".tlnav")?.addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button");
    if(!b || b.disabled) return;
    if(b.dataset.ab) onAbility(Number(b.dataset.ab));
    else if(b.dataset.drillId) onDrill(b.dataset.drillId);
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
   list scrolls down; on narrow screens it is a strip that scrolls sideways. */
function scrollNav(): void {
  const nav = view.querySelector<HTMLElement>(".tlnav"), now = nav?.querySelector<HTMLElement>("[aria-current], .next");
  if(!nav || !now) return;
  nav.scrollTop = now.offsetTop - nav.clientHeight / 3;
  nav.scrollLeft = now.offsetLeft - (nav.clientWidth - now.offsetWidth) / 2;
}
