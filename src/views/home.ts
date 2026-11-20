// The landing screen: what the site does, and a card that links to each tab.
import { esc } from "../util";
import { routeLink } from "../router";
import { state, TABS, view, type Tab } from "../core";
import { WTFDIG } from "./common";
import { MAPS } from "../data/drills";
import { ABILITIES } from "../data/abilities";
import { MECH, DEATH, NEXT_ITEMS } from "../data/questions";
import { JOB, JOBS } from "../data/jobs";
import type { Job } from "../types";

interface Card { kind: string; about: string; count: () => string }

const BOSSMOD = "https://github.com/awgil/ffxiv_bossmod";
const CACTBOT = "https://github.com/OverlayPlugin/cactbot";
const out = (href: string, text: string): string => '<a href="' + href + '" target="_blank" rel="noopener">' + esc(text) + "</a>";

/** Why the tool exists, in the author's words, shown at the bottom of the screen. */
const ABOUT_ME = [
  "I have played Final Fantasy XIV for more than ten years and tried savage raiding many times. As a casual player, I struggle to master the mechanics, and I cannot practice in the game as much as I would like.",
  "So I built this tool to learn fights outside the game, at my own pace, without making seven other people wait for me. I hope it helps you too."
];

// TS note: Exclude<Tab, "home"> is the Tab union without "home". Record then needs a card for
// every other tab, so a new tab in core.ts without a card here is a compile error.
// `count` is a function so it reads the data when the screen draws, not when the file loads.
const CARDS: Record<Exclude<Tab, "home">, Card> = {
  map: {kind:"Arena drills", about:"Click your spot, step by step or on the fight clock.",
    count: () => MAPS.length + " drills · " + ABILITIES.length + " abilities"},
  mech: {kind:"Quiz", about:"Learn what each mechanic does, with a picture.", count: () => MECH.length + " questions"},
  next: {kind:"Quiz", about:"Know what comes next, so you know when to raise.", count: () => NEXT_ITEMS.length + " questions"},
  death: {kind:"Quiz", about:"Who to raise first, and when to wait.", count: () => DEATH.length + " questions"},
  job: {kind:"Quiz", about:"A cooldown plan for White Mage or Sage.",
    count: () => (Object.keys(JOBS) as Job[]).map(j => JOB.filter(x => x.job === j).length + " " + JOBS[j]).join(" · ")},
  pressure: {kind:"Timed quiz", about:"Quick mixed questions on a timer.",
    count: () => "12 questions · 4 to 10 seconds each"},
  sheet: {kind:"Reference", about:"Everything on one page.", count: () => "One page"}
};


export function renderHome(): void {
  // TS note: after `if(t.id === "home") return`, TypeScript narrows t.id to the other tabs,
  // so CARDS[t.id] type-checks. Narrowing works on a property path such as t.id, not only on a variable.
  const cards = TABS.map(t => {
    if(t.id === "home") return "";
    const c = CARDS[t.id];
    return '<li><a class="tabcard" href="' + routeLink({tab:t.id}) + '"><span class="tc-kind">' + esc(c.kind) + '</span><b class="tc-name">' + esc(t.label) + "</b>" +
      '<span class="tc-about">' + esc(c.about) + '</span><span class="tc-count">' + esc(c.count()) + "</span></a></li>";
  }).join("");
  view.innerHTML = '<div class="home">' +
    // The picture is a static file: public/nydori.jpeg, served at /nydori.jpeg.
    '<section class="hero"><img src="/nydori.jpeg" width="480" height="848" alt="My character in Final Fantasy XIV, in a green hooded robe, holding up a card">' +
    '<div><p class="kicker">M11S · The Tyrant (Savage) · Healers</p><h2>Practice savage mechanics without a party</h2>' +
    "<p>Learn where to stand, what comes next, when to raise and which cooldown to press, away from the raid. The answers follow Hector (Toxic), Kindred No Buddies and Fixed (3CJ) Ecliptic.</p>" +
    "<p>You are set as <b>" + state.slot + "</b>. Change it with the H1 / H2 switch at the top. Your progress stays in this browser.</p></div></section>" +
    '<section class="pick"><h2>Pick a drill</h2><p class="small">The tabs run in the order to learn the fight.</p><ol class="tabcards">' + cards + "</ol></section>" +
    '<section class="me"><p class="kicker">About me</p>' + ABOUT_ME.map(p => "<p>" + esc(p) + "</p>").join("") +
    '<p class="soon">Today: M11S healers. Coming later: ranged, melee, tanks and more fights.</p>' +
    '<p class="small">Positions follow the ' + out(WTFDIG, "wtfdig guide") + "; attack sizes come from " + out(BOSSMOD, "BossMod") + " and times from " + out(CACTBOT, "cactbot") + ".</p></section></div>";
  state.cur = {kind:"home"};
}
