// The cheat sheet: the panic reset, the positions and your timeline on one page.
import { bySlot, esc, LS, el } from "../util";
import { state, view } from "../core";
import { TL } from "../data/timeline";
import { tlCats } from "../data/abilities";
import { marks, catNames, catKey } from "./tlnav";
import { f1, vadd, unit, leftOf } from "../geometry";
import { arenaSVG, drawOverlay, drawBoss } from "../arena";
import { swordCross, swordPocket } from "../data/attacks";
import { tabHead } from "./common";
import { CACTBOT_TIMELINE, WTFDIG } from "../data/sources";
import { routeLink } from "../router";
import type { Point, Slot } from "../types";

/** A fixed sword example: the boss jumps west from the middle. The player's pocket is green. */
function swordDiagram(s: Slot): string {
  const P: Point = [21, 50], d: Point = [-1, 0], L = leftOf(d), mine = bySlot(s, {H1:1, H2:-1});
  const pocket = (side: number): Point[] => swordPocket(P, d, [L[0] * side, L[1] * side]);
  const poly = (pts: Point[], cls: string): string => '<polygon class="zone ' + cls + '" points="' + pts.map(p => f1(p[0]) + "," + f1(p[1])).join(" ") + '"/>';
  const label = (side: number, txt: string): string => { const p = vadd(P, unit(vadd([-d[0], -d[1]], [L[0] * side, L[1] * side])), 29);
    return '<g class="zlabel' + (side === mine ? "" : " other") + '"><rect x="' + f1(p[0] - 8) + '" y="' + f1(p[1] - 2.3) + '" width="16" height="4.6" rx=".9"/><text x="' + f1(p[0]) + '" y="' + f1(p[1]) + '">' + txt + "</text></g>"; };
  return arenaSVG('aria-label="Sword example. The boss jumps west from the middle. G1 takes the pocket behind his left side, G2 the pocket behind his right side."', {
    ground:swordCross(P, d).map(drawOverlay).join(""),
    zones:poly(pocket(1), mine === 1 ? "ok" : "other") + poly(pocket(-1), mine === -1 ? "ok" : "other"),
    // Where he stood in the middle, his jump, and where he lands.
    boss:'<circle class="ghost" cx="50" cy="50" r="3.4"/><line class="jump" x1="46" y1="50" x2="33" y2="50"/>' + drawBoss({x:P[0], y:P[1], f:270}),
    labels:label(1, "G1 / H1") + label(-1, "G2 / H2"),
  });
}
/** One line of "Positions to remember": the mechanic, its rule in a sentence or two, and a link to
    the Learn card with the detail. */
const rule = (name: string, text: string, card: string): string =>
  "<li><b>" + esc(name) + ":</b> " + esc(text) + ' <a class="more" href="' + routeLink({tab:"mech", card}) + '">Learn &rarr;</a></li>';

export function renderSheet(): void {
  const s = state.slot;
  // Each row shows the ability list's marks for what it covers, with the same colour key.
  const rows = TL.map((e, i) => { const cats = tlCats(i);
    return '<tr><td class="t">' + e.t + '</td><td class="n">' + esc(e.n) + '<div class="cmline">' + marks(cats) + esc(catNames(cats)) + "</div></td><td>" + esc(e.job(s)) + "</td></tr>"; }).join("");
  const seen = Object.keys(state.stats).length;
  view.innerHTML = tabHead() + '<div class="sheet">' +
    "<section><h2>Panic reset</h2><ol>" +
    "<li>Feet: go to your spot for the next mechanic.</li>" +
    "<li>Self: if you are low, heal or shield yourself.</li>" +
    "<li>Team: a hit soon? Heal the party.</li></ol>" +
    "<p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p></section>" +
    // One short line per mechanic, written for your role. The detail lives on its Learn card.
    '<section><h2>Positions to remember</h2><div class="cols"><div><ul class="rules">' +
    rule("Weapon order", "The first weapon is the one he faces. Then clockwise.", "k-first-weapon") +
    rule("Sword", "Stand in the pocket behind him, on the side he jumped from. Yours is his " + bySlot(s, {H1:"left", H2:"right"}) + ", and your light party stacks on you.", "k-sword") +
    rule("Scythe", "Everyone stands close around him. You take the " + bySlot(s, {H1:"handle end", H2:"blade end"}) + ".", "k-scythe") +
    rule("Axe", "The whole party stacks in the middle, out of the axe hit.", "k-axe") +
    rule("Ultimate Trophy Weapons", "First spawn south and a bit west: clockwise. A bit east: counterclockwise.", "k-ult-spawn") +
    rule("Void Stardust", "Start north of him. Drop each puddle just outside the last, a small step clockwise. Then stack or spread.", "k-void") +
    rule("Second weapon set", "Spot it before the puddles: the first is the one with its flat side square to him. Sword or scythe first: stack or spread toward it.", "k-assault-2") +
    rule("Comet spread", "Healers take any open spot, away from the tanks and melee and out of the last puddle.", "k-void-spread") +
    rule("Orbital Omen", "Stay against his side, where the #2 lines cross. After #1, cross through him. After #2, cross back.", "k-orbital") +
    rule("Meteorain, your meteor", bySlot(s, {H1:"Drop it NW, inside his hitbox.", H2:"Drop it SW, in line with the first SW rock, farther out."}), "k-meteor-drop") +
    rule("Meteorain, tanks", "Their tethers are tank busters at 5:09, 5:19 and 5:29. Heal them after each one.", "k-meteor-order") +
    '</ul></div><figure class="mini">' + swordDiagram(s) +
    "<figcaption>Example: he jumps west from the middle. The pockets on the side he came from are the two stack spots. Yours is green.</figcaption></figure></div></section>" +
    "<section><h2>Your timeline as " + s + "</h2>" + catKey() + '<div class="tablebox"><table><thead><tr><th>Time</th><th>Mechanic</th><th>What you do</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
    '<p class="hint">Times are from the cactbot fight timeline. Some phase 1 times move by a second or two with the axe or scythe opener.</p></section>' +
    '<section><h2>Sources</h2><ul class="links">' +
    '<li><a href="' + WTFDIG + '" target="_blank" rel="noopener">wtfdig M11S</a> <span>Your strats: Hector (Toxic), Kindred No Buddies, Fixed (3CJ)</span></li>' +
    '<li><a href="https://www.youtube.com/watch?v=w1uuwzhyf5A" target="_blank" rel="noopener">Hector\'s video guide</a></li>' +
    '<li><a href="https://raidplan.io/plan/HJAbE7fuWodELUSB" target="_blank" rel="noopener">Toxic Friends raidplan</a> <span>Phases 1 and 2</span></li>' +
    '<li><a href="https://raidplan.io/plan/hvbysrfwvrc55ahz" target="_blank" rel="noopener">Kindred raidplan</a> <span>Arena Split</span></li>' +
    '<li><a href="https://raidplan.io/plan/KXVlSGwV3zqON3CJ" target="_blank" rel="noopener">Fixed Stampede raidplan</a> <span>Ecliptic Stampede</span></li>' +
    '<li><a href="https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide" target="_blank" rel="noopener">Icy Veins M11S guide</a> <span>Mechanic details, enrage at 11:00</span></li>' +
    '<li><a href="' + CACTBOT_TIMELINE + '" target="_blank" rel="noopener">cactbot r11s timeline</a> <span>Times</span></li></ul></section>' +
    "<section><h2>Your progress</h2><p>You answered " + seen + " different items so far. Progress stays in this browser only.</p>" +
    '<div class="actions"><button type="button" class="btn ghost" id="reset">' + (state.confirmReset ? "Click again to erase progress" : "Reset my progress") + "</button></div></section></div>";
  state.cur = {kind:"sheet"};
  el("reset").addEventListener("click", () => {
    if(!state.confirmReset){ state.confirmReset = true; return renderSheet(); }
    state.confirmReset = false; state.stats = {}; LS.del("stats"); state.decks = {}; renderSheet();
  });
}
