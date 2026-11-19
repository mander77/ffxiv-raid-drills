// The landing screen: what the site does, and a card that links to each tab.
import { esc } from "../util";
import { routeLink } from "../router";
import { state, TABS, view, type Tab } from "../core";
import { MAPS } from "../data/drills";
import { ABILITIES } from "../data/abilities";
import { MECH, DEATH, NEXT_ITEMS } from "../data/questions";
import { JOB, JOBS } from "../data/jobs";
import type { Job } from "../types";

interface Card { kind: string; about: string; count: () => string }

// TS note: Exclude<Tab, "home" | "about"> is the Tab union without "home" and "about". Record
// then needs a card for every other tab, so a new tab in core.ts without a card here is a
// compile error. `count` is a function so it reads the data when the screen draws, not when the
// file loads. About this tool (views/about.ts) lists the same text as the app's features.
export const CARDS: Record<Exclude<Tab, "home" | "about">, Card> = {
  map: {kind:"Arena drills", about:"Click where you stand on the arena for each mechanic. Step by step gives one drill at a time with no timer. Real time runs the whole fight on the fight clock, to the enrage.",
    count: () => MAPS.length + " drills · " + ABILITIES.length + " abilities"},
  mech: {kind:"Quiz", about:"What each mechanic does and what you do in it, with an arena picture for each question. Read the wtfdig guide first.", count: () => MECH.length + " questions"},
  next: {kind:"Quiz", about:"Which mechanic comes next, so you know how much time you have to raise.", count: () => NEXT_ITEMS.length + " questions"},
  death: {kind:"Quiz", about:"Who to raise first, when to raise and when to wait.", count: () => DEATH.length + " questions"},
  job: {kind:"Quiz", about:"A suggested cooldown plan for White Mage or Sage, asked one hit at a time.",
    count: () => (Object.keys(JOBS) as Job[]).map(j => JOB.filter(x => x.job === j).length + " " + JOBS[j]).join(" · ")},
  pressure: {kind:"Timed quiz", about:"Mixed questions from the four quiz tabs on a short timer. It trains you to pick an answer every time.",
    count: () => "12 questions · 4 to 10 seconds each"},
  sheet: {kind:"Reference", about:"The rules, the positions, your timeline and the job plan on one page, with links to the sources.", count: () => "One page"}
};

const link = (id: Tab): string => '<a href="' + routeLink({tab:id}) + '">' + esc(TABS.find(t => t.id === id)?.label ?? id) + "</a>";

export function renderHome(): void {
  const home = TABS.find(t => t.id === "home");
  // TS note: after `if(t.id === "home" || t.id === "about") return`, TypeScript narrows t.id to
  // the other tabs, so CARDS[t.id] type-checks. Narrowing works on a property path such as t.id,
  // not only on a variable.
  const cards = TABS.map(t => {
    if(t.id === "home" || t.id === "about") return "";
    const c = CARDS[t.id];
    return '<li><a class="tabcard" href="' + routeLink({tab:t.id}) + '"><span class="tc-kind">' + esc(c.kind) + '</span><b class="tc-name">' + esc(t.label) + "</b>" +
      '<span class="tc-about">' + esc(c.about) + '</span><span class="tc-count">' + esc(c.count()) + "</span></a></li>";
  }).join("");
  view.innerHTML = '<div class="home"><section class="intro"><h2>Healer practice for M11S</h2>' +
    "<p>" + esc(home?.lede ?? "") + "</p>" +
    "<p>You are set as <b>" + state.slot + "</b>. Positions and answers follow your slot, so change it with the H1 / H2 switch at the top if you play the other one. Your progress stays in this browser.</p>" +
    "<p>The tabs run in the order to learn the fight: what each mechanic does, where you stand, what comes next, your cooldowns and your raises. A " +
    link("pressure") + " then tests it all, and the " + link("sheet") + " puts it on one page.</p></section>" +
    '<ol class="tabcards">' + cards + "</ol></div>";
  state.cur = {kind:"home"};
}
