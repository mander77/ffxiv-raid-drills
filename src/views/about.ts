// The About this tool screen: who made the tool and why, and what it can do.
import { esc } from "../util";
import { routeLink } from "../router";
import { state, TABS, view } from "../core";
import { CARDS } from "./home";
import { WTFDIG, tabHead } from "./common";

const BOSSMOD = "https://github.com/awgil/ffxiv_bossmod";
const CACTBOT = "https://github.com/OverlayPlugin/cactbot";

const ABOUT_ME = "I have played Final Fantasy XIV for more than ten years, and I have tried savage raiding many times. " +
  "As a casual player, I often struggle to master the mechanics, and I cannot practice in the game as much as I would like. " +
  "Every savage pull needs a full party of eight, so learning a fight by trial and error also uses other people's time. " +
  "I built this tool so I can practice the mechanics outside the game and get to know the fight at my own pace, without inconveniencing anyone. " +
  "I hope other players find it useful too. Today it covers the healers in M11S. " +
  "I plan to add more roles (ranged, melee and tanks) and more fights over time.";

const out = (href: string, text: string): string => '<a href="' + href + '" target="_blank" rel="noopener">' + esc(text) + "</a>";

/** What works across the tabs. The text is HTML, because some items link to their sources. */
const ACROSS: Array<{name: string; html: string}> = [
  {name:"Real time", html:"The boss turns and jumps as he does in the game. A timeline like cactbot's, a cast bar and a countdown ring show what comes next. Play at 0.5x to 2x speed, watch the right moves, or play back your own run."},
  {name:"Fight patterns", html:"Pick a weapon order or another pattern to practice it on purpose, or leave it on Random. Every drill and fight has a code, and the Share button gives a link that opens the same pattern."},
  {name:"Your slot", html:"Switch between H1 and H2 at the top. Positions and answers follow your slot. Your progress stays in your browser."},
  {name:"Sources", html:"Positions follow the " + out(WTFDIG, "wtfdig guide") + " for Hector (Toxic), Kindred No Buddies and Fixed (3CJ) Ecliptic. Attack sizes come from " +
    out(BOSSMOD, "BossMod") + ", and times from the " + out(CACTBOT, "cactbot") + " timeline."}
];

export function renderAbout(): void {
  // One item for each practice tab, with the same text as its card on the Home screen.
  const tabs = TABS.map(t => {
    if(t.id === "home" || t.id === "about") return "";
    return '<li><a href="' + routeLink({tab:t.id}) + '">' + esc(t.label) + "</a>: " + esc(CARDS[t.id].about) + "</li>";
  }).join("");
  const across = ACROSS.map(a => "<li><b>" + esc(a.name) + "</b>: " + a.html + "</li>").join("");
  view.innerHTML = tabHead() + '<div class="about">' +
    '<section><h2>About me</h2><p>' + esc(ABOUT_ME) + "</p></section>" +
    '<section><h2>What the tool does</h2><ul class="features">' + tabs + "</ul>" +
    '<h3>Across the tool</h3><ul class="features">' + across + "</ul></section></div>";
  state.cur = {kind:"about"};
}
