// The cheat sheet: rules, positions, timeline and the suggested job plan on one page.
import { S, esc, LS, el } from "../util";
import { state, view, QUIZ_POOLS } from "../core";
import { TL, KIND } from "../data/timeline";
import { JOBS } from "../data/jobs";
import { f1, vadd, unit, leftOf } from "../geometry";
import { floorSVG, drawOverlay, drawWaymarks, drawBoss } from "../arena";
import { tabHead, WTFDIG } from "./common";
import type { Point, Slot } from "../types";

/** A fixed sword example: the boss jumps west from the middle. The player's pocket is green. */
export function swordDiagram(s: Slot): string {
  const P: Point = [21, 50], d: Point = [-1, 0], L = leftOf(d), HW = 7, mine = S(s, 1, -1);
  const pocket = (side: number): Point[] => {
    const sv: Point = [L[0] * side, L[1] * side], corner = vadd(vadd(P, d, -HW), sv, HW);
    return [corner, vadd(corner, d, -32), vadd(vadd(corner, d, -32), sv, 32), vadd(corner, sv, 32)];
  };
  const poly = (pts: Point[], cls: string): string => '<polygon class="zone ' + cls + '" points="' + pts.map(p => f1(p[0]) + "," + f1(p[1])).join(" ") + '"/>';
  const label = (side: number, txt: string): string => { const p = vadd(P, unit(vadd([-d[0], -d[1]], [L[0] * side, L[1] * side])), 17);
    return '<g class="zlabel' + (side === mine ? "" : " other") + '"><rect x="' + f1(p[0] - 8) + '" y="' + f1(p[1] - 2.3) + '" width="16" height="4.6" rx=".9"/><text x="' + f1(p[0]) + '" y="' + f1(p[1]) + '">' + txt + "</text></g>"; };
  let h = '<svg viewBox="-4 -6 108 110" role="img" aria-label="Sword example. The boss jumps west from the middle. G1 takes the pocket behind his left side, G2 the pocket behind his right side.">';
  h += floorSVG(false) + '<text class="compass" x="50" y="-2.2">N</text>';
  h += '<g clip-path="url(#arenaClip)">' + drawOverlay({t:"band", x:171, y:50, x2:-129, y2:50, w:HW * 2}) + drawOverlay({t:"band", x:21, y:-100, x2:21, y2:200, w:HW * 2}) +
    poly(pocket(1), mine === 1 ? "ok" : "other") + poly(pocket(-1), mine === -1 ? "ok" : "other") + "</g>";
  h += '<circle class="ghost" cx="50" cy="50" r="3.4"/><line class="jump" x1="46" y1="50" x2="33" y2="50"/>';
  h += drawWaymarks() + drawBoss({x:P[0], y:P[1], f:270}) + label(1, "G1 / H1") + label(-1, "G2 / H2");
  return h + "</svg>";
}
export function renderSheet(): void {
  const s = state.slot;
  const rows = TL.map(e => '<tr><td class="t">' + e.t + '</td><td class="n">' + esc(e.n) + '<br><span class="chip k-' + e.k + '">' + KIND[e.k] + "</span></td><td>" + esc(e.job(s)) + "</td></tr>").join("");
  const seen = Object.keys(state.stats).length;
  view.innerHTML = tabHead() + '<div class="sheet">' +
    '<div class="cols"><section><h2>Someone died</h2><ol>' +
    "<li>Are you about to die? Heal yourself first.</li>" +
    "<li>Did Andrew call “let's get them up”? Raise now and say “I got it.”</li>" +
    "<li>Did someone else say “I got it”? Do not raise. Heal the party.</li>" +
    "<li>Did a raidwide just land, with more damage soon? Heal the party first, then raise.</li>" +
    "<li>Is a scythe or a bait about to resolve? Raise right after it.</li>" +
    "<li>Otherwise, raise now with Swiftcast. 5 to 8 seconds is the limit.</li></ol>" +
    "<p>In the nados (Ultimate Trophy Weapons), the dead player must be up by the 3rd weapon. They stand up where you are, so raise from a safe spot.</p></section>" +
    "<section><h2>Panic reset</h2><ol>" +
    "<li>Feet: go to your spot for the next mechanic.</li>" +
    "<li>Self: if you are low, heal or shield yourself.</li>" +
    "<li>Team: a hit soon? Heal the party. Quiet? Raise, and say “I got it.”</li></ol>" +
    "<p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p></section></div>" +
    '<section><h2>Positions to remember</h2><div class="cols"><div><ul class="rules">' +
    "<li><b>Weapon order:</b> the first weapon is the one he faces. Then he goes clockwise.</li>" +
    "<li><b>Sword:</b> the cross lines up with the way he jumped. Stand in the pocket behind him, on the side he jumped from: G1 on his left, G2 on his right. As " + s + ", you take the " + S(s, "left", "right") + " pocket, and your light party stacks on you.</li>" +
    "<li><b>Scythe:</b> H1 at the butt, H2 at the point, close in.</li>" +
    "<li><b>Axe:</b> the whole party stacks in the middle, out of the axe AoE.</li>" +
    "<li><b>Ultimate Trophy Weapons:</b> watch the first spawn. South and slightly west means clockwise, south and slightly east means counterclockwise. The second is NW or NE, then the cardinals, ending north. He resolves them in spawn order.</li>" +
    "<li><b>Void Stardust:</b> start north of the boss. Drop each puddle just outside the last one, a small step clockwise. Then stack or spread. Before the puddles, find the first weapon of the second set. If it is a sword or scythe, stack or spread toward it, and use Sprint or Expedient if it is far.</li>" +
    "<li><b>Assault Evolved, second set (after Void Stardust):</b> the weapon with its flat side square to the boss goes first. Then clockwise, the same as the first set.</li>" +
    "<li><b>Comet spread (after Void Stardust):</b> free for all for healers and ranged. Take any open spot, away from the tanks and melee and out of the puddles. Fixed spots: MT NW, OT NE, M1 SW, M2 SE.</li>" +
    "<li><b>Orbital Omen (Hector's dodge):</b> stay against the boss hitbox, at his side. Start where the #2 lines cross. After #1 and Fire and Fury, cross the hitbox to the opposite middle square. After #2, cross back and stay.</li>" +
    "<li><b>Meteorain, melee (1st set):</b> the melee step in close to the boss to take the first markers. M1 drops NE and M2 drops SW, both inside the boss hitbox. Everyone else stacks NW for the first line stack, with the tanks in front.</li>" +
    "<li><b>Meteorain, tanks:</b> the tanks stand in front of the first line stack. Then each set, tethers link to the two rocks closest to the boss: the MT takes the NE or NW tether, the OT takes the SW tether. Each tether is a tank buster (5:09, 5:19 and 5:29), so the tanks stay out of the party stack and you heal them after each one. After the third tether, they hide behind the rocks too.</li>" +
    "<li><b>Meteorain, your meteor:</b> " + S(s, "drop it NW, inside the boss hitbox.", "drop it SW, in line with the first SW rock, farther out.") + "</li>" +
    "<li><b>Meteorain, ranged (3rd set):</b> the ranged step in close to the boss to take the markers. R1 drops SW near the edge, at the end of the SW line, and leaves room behind it to hide. R2 drops NE, inside the boss hitbox.</li>" +
    '</ul></div><figure class="mini">' + swordDiagram(s) +
    "<figcaption>Example: he jumps west from the middle. The pockets on the side he came from are the two stack spots. Yours is green.</figcaption></figure></div></section>" +
    "<section><h2>Your timeline as " + s + '</h2><div class="tablebox"><table><thead><tr><th>Time</th><th>Mechanic</th><th>Your job</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
    '<p class="hint">Times are from the cactbot fight timeline. Some phase 1 times move by a second or two with the axe or scythe opener.</p></section>' +
    "<section><h2>Suggested " + JOBS[state.job] + ' plan</h2><div class="tablebox"><table><thead><tr><th>Time</th><th>When</th><th>Press</th></tr></thead><tbody>' +
    QUIZ_POOLS.job().slice().sort((a, b) => a.order - b.order).map(it => { const q = it.build(s), right = q.options.find(o => o.ok); return '<tr><td class="t">' + esc(it.time) + '</td><td class="n">' + esc(q.rule) + "</td><td>" + esc(right?.t ?? "") + "</td></tr>"; }).join("") +
    '</tbody></table></div><p class="hint">Switch jobs on the My job tab. This plan uses only your own buttons. Agree with your co-healer who covers each raidwide.</p></section>' +
    '<section><h2>Sources</h2><ul class="links">' +
    '<li><a href="' + WTFDIG + '" target="_blank" rel="noopener">wtfdig M11S</a> <span>Your strats: Hector (Toxic), Kindred No Buddies, Fixed (3CJ)</span></li>' +
    '<li><a href="https://www.youtube.com/watch?v=w1uuwzhyf5A" target="_blank" rel="noopener">Hector\'s video guide</a></li>' +
    '<li><a href="https://raidplan.io/plan/HJAbE7fuWodELUSB" target="_blank" rel="noopener">Toxic Friends raidplan</a> <span>Phases 1 and 2</span></li>' +
    '<li><a href="https://raidplan.io/plan/hvbysrfwvrc55ahz" target="_blank" rel="noopener">Kindred raidplan</a> <span>Arena Split</span></li>' +
    '<li><a href="https://raidplan.io/plan/KXVlSGwV3zqON3CJ" target="_blank" rel="noopener">Fixed Stampede raidplan</a> <span>Ecliptic Stampede</span></li>' +
    '<li><a href="https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide" target="_blank" rel="noopener">Icy Veins M11S guide</a> <span>Mechanic details, enrage at 11:00</span></li>' +
    '<li><a href="https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/raid/r11s.txt" target="_blank" rel="noopener">cactbot r11s timeline</a> <span>Times</span></li>' +
    '<li><a href="https://ffxiv.consolegameswiki.com/wiki/Resurrect" target="_blank" rel="noopener">consolegameswiki: Resurrect</a> <span>Raised players appear at the caster</span></li></ul></section>' +
    "<section><h2>Your progress</h2><p>You answered " + seen + " different items so far. Progress stays in this browser only.</p>" +
    '<div class="actions"><button type="button" class="btn ghost" id="reset">' + (state.confirmReset ? "Click again to erase progress" : "Reset my progress") + "</button></div></section></div>";
  state.cur = {kind:"sheet"};
  el("reset").addEventListener("click", () => {
    if(!state.confirmReset){ state.confirmReset = true; return renderSheet(); }
    state.confirmReset = false; state.stats = {}; LS.del("stats"); state.decks = {}; renderSheet();
  });
}
