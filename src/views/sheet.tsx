// The cheat sheet: the panic reset, the positions and your timeline on one page.
// This is the first screen built with Preact. The others still build HTML as text.
// TS note: a .tsx file is TypeScript that may hold JSX, the HTML-like tags below. tsconfig.json
// tells the compiler to turn each tag into a call to Preact (see "jsx" and "jsxImportSource").
import { useState } from "preact/hooks";
import { bySlot, LS } from "../util";
import { state } from "../core";
import { TL } from "../data/timeline";
import { tlCats } from "../data/abilities";
import { catNames } from "./tlnav";
import { Marks } from "../components/Marks";
import { CatKey } from "../components/CatKey";
import { f1, vadd, unit, leftOf } from "../geometry";
import { arenaSVG, drawOverlay, drawBoss } from "../arena";
import { swordCross, swordPocket } from "../data/attacks";
import { lede, mountView } from "./common";
import { CACTBOT_TIMELINE, WTFDIG } from "../data/sources";
import { routeLink } from "../router";
import type { Point, Slot } from "../types";

/** A fixed sword example: the boss jumps west from the middle. The player's pocket is green.
    The arena pictures are built as SVG text (arena.ts), so this one stays text too. */
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

// TS note: an interface for a component's props, like the parameter list of a C# method. A call
// such as <Rule name="Sword" text="..." card="k-sword" /> must give all three, or it is an error.
interface RuleProps { name: string; text: string; card: string }
/** One line of "Positions to remember": the mechanic, its rule in a sentence or two, and a link to
    the Learn card with the detail. */
function Rule({name, text, card}: RuleProps) {
  return <li><b>{name}:</b> {text} <a class="more" href={routeLink({tab:"mech", card})}>Learn →</a></li>;
}

/** A link to a guide or a source, with an optional note after it. */
function Source({href, label, note}: {href: string; label: string; note?: string}) {
  // TS note: `note && <span>` shows the span only when there is a note. JSX skips false and undefined.
  return <li><a href={href} target="_blank" rel="noopener">{label}</a>{note && <> <span>{note}</span></>}</li>;
}

/** The whole cheat sheet for one slot. */
export function Sheet({slot: s}: {slot: Slot}) {
  // TS note: useState is a hook. It keeps a value between draws of this component and gives a
  // function to change it; a change draws the component again. TypeScript infers the type
  // (boolean) from the first value. Here it holds "the reset button was clicked once".
  const [confirm, setConfirm] = useState(false);
  const reset = (): void => {
    if(!confirm){ setConfirm(true); return; }
    state.stats = {}; LS.del("stats"); state.decks = {};
    setConfirm(false);
  };
  const seen = Object.keys(state.stats).length;
  return <>
    <div class="tabhead"><p class="lede">{lede()}</p></div>
    <div class="sheet">
      <section>
        <h2>Panic reset</h2>
        <ol>
          <li>Feet: go to your spot for the next mechanic.</li>
          <li>Self: if you are low, heal or shield yourself.</li>
          <li>Team: a hit soon? Heal the party.</li>
        </ol>
        <p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p>
      </section>
      {/* One short line per mechanic, written for your role. The detail lives on its Learn card. */}
      <section>
        <h2>Positions to remember</h2>
        <div class="cols">
          <div>
            <ul class="rules">
              <Rule name="Weapon order" text="The first weapon is the one he faces. Then clockwise." card="k-first-weapon" />
              <Rule name="Sword" text={"Stand in the pocket behind him, on the side he jumped from. Yours is his " + bySlot(s, {H1:"left", H2:"right"}) + ", and your light party stacks on you."} card="k-sword" />
              <Rule name="Scythe" text={"Everyone stands close around him. You take the " + bySlot(s, {H1:"handle end", H2:"blade end"}) + "."} card="k-scythe" />
              <Rule name="Axe" text="The whole party stacks in the middle, out of the axe hit." card="k-axe" />
              <Rule name="Ultimate Trophy Weapons" text="First spawn south and a bit west: clockwise. A bit east: counterclockwise." card="k-ult-spawn" />
              <Rule name="Void Stardust" text="Start north of him. Drop each puddle just outside the last, a small step clockwise. Then stack or spread." card="k-void" />
              <Rule name="Second weapon set" text="Spot it before the puddles: the first is the one with its flat side square to him. Sword or scythe first: stack or spread toward it." card="k-assault-2" />
              <Rule name="Comet spread" text="Healers take any open spot, away from the tanks and melee and out of the last puddle." card="k-void-spread" />
              <Rule name="Orbital Omen" text="Stay against his side, where the #2 lines cross. After #1, cross through him. After #2, cross back." card="k-orbital" />
              <Rule name="Meteorain, your meteor" text={bySlot(s, {H1:"Drop it NW, inside his hitbox.", H2:"Drop it SW, in line with the first SW rock, farther out."})} card="k-meteor-drop" />
              <Rule name="Meteorain, tanks" text="Their tethers are tank busters at 5:09, 5:19 and 5:29. Heal them after each one." card="k-meteor-order" />
            </ul>
          </div>
          <figure class="mini">
            {/* TS note: dangerouslySetInnerHTML puts ready-made HTML into an element. The name is a
                warning: use it only for text the app built itself, never for text from a user. */}
            <div dangerouslySetInnerHTML={{__html:swordDiagram(s)}} />
            <figcaption>Example: he jumps west from the middle. The pockets on the side he came from are the two stack spots. Yours is green.</figcaption>
          </figure>
        </div>
      </section>
      <section>
        <h2>Your timeline as {s}</h2>
        <CatKey />
        <div class="tablebox">
          <table>
            <thead><tr><th>Time</th><th>Mechanic</th><th>What you do</th></tr></thead>
            <tbody>
              {/* Each row shows the ability list's marks for what it covers, with the same colour key. */}
              {TL.map((e, i) => { const cats = tlCats(i);
                return <tr key={e.t + e.n}>
                  <td class="t">{e.t}</td>
                  <td class="n">{e.n}<div class="cmline"><Marks cats={cats} />{catNames(cats)}</div></td>
                  <td>{e.job(s)}</td>
                </tr>; })}
            </tbody>
          </table>
        </div>
        <p class="hint">Times are from the cactbot fight timeline. Some phase 1 times move by a second or two with the axe or scythe opener.</p>
      </section>
      <section>
        <h2>Sources</h2>
        <ul class="links">
          <Source href={WTFDIG} label="wtfdig M11S" note="Your strats: Hector (Toxic), Kindred No Buddies, Fixed (3CJ)" />
          <Source href="https://www.youtube.com/watch?v=w1uuwzhyf5A" label="Hector's video guide" />
          <Source href="https://raidplan.io/plan/HJAbE7fuWodELUSB" label="Toxic Friends raidplan" note="Phases 1 and 2" />
          <Source href="https://raidplan.io/plan/hvbysrfwvrc55ahz" label="Kindred raidplan" note="Arena Split" />
          <Source href="https://raidplan.io/plan/KXVlSGwV3zqON3CJ" label="Fixed Stampede raidplan" note="Ecliptic Stampede" />
          <Source href="https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide" label="Icy Veins M11S guide" note="Mechanic details, enrage at 11:00" />
          <Source href={CACTBOT_TIMELINE} label="cactbot r11s timeline" note="Times" />
        </ul>
      </section>
      <section>
        <h2>Your progress</h2>
        <p>You answered {seen} different items so far. Progress stays in this browser only.</p>
        <div class="actions">
          <button type="button" class="btn ghost" id="reset" onClick={reset}>{confirm ? "Click again to erase progress" : "Reset my progress"}</button>
        </div>
      </section>
    </div>
  </>;
}

export function renderSheet(): void {
  state.cur = {kind:"sheet"};
  mountView(<Sheet slot={state.slot} />);
}
