// The Cheat sheet page (/sheet): the panic reset, the positions and your timeline on one page.
// TS note: a .tsx file is TypeScript that may hold JSX, the HTML-like tags below. Each tag compiles
// to a call to React, so the compiler checks every tag and attribute.
import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { WRAP } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { arenaSVG, drawBoss, drawOverlay } from "../arena";
import { CatKey } from "../components/CatKey";
import { catNames, Marks } from "../components/Marks";
import { state } from "../core";
import { tlCats } from "../data/abilities";
import { swordCross, swordPocket } from "../data/attacks";
import { CACTBOT_TIMELINE, WTFDIG } from "../data/sources";
import { TL } from "../data/timeline";
import { f1, leftOf, unit, vadd } from "../geometry";
import { routeLink } from "../router";
import { useSlotStore } from "../stores/slot";
import { TABS } from "../tabs";
import type { Point, Slot } from "../types";
import { bySlot, LS } from "../util";

/** A fixed sword example: the boss jumps west from the middle. The player's pocket is green.
    The arena pictures are built as SVG text (arena.ts), so this one stays text too. */
function swordDiagram(s: Slot): string {
  const P: Point = [21, 50],
    d: Point = [-1, 0],
    L = leftOf(d),
    mine = bySlot(s, { H1: 1, H2: -1 });
  const pocket = (side: number): Point[] => swordPocket(P, d, [L[0] * side, L[1] * side]);
  const poly = (pts: Point[], cls: string): string =>
    `<polygon class="zone ${cls}" points="${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ")}"/>`;
  const label = (side: number, txt: string): string => {
    const p = vadd(P, unit(vadd([-d[0], -d[1]], [L[0] * side, L[1] * side])), 29);
    return (
      '<g class="zlabel' +
      (side === mine ? "" : " other") +
      '"><rect x="' +
      f1(p[0] - 8) +
      '" y="' +
      f1(p[1] - 2.3) +
      '" width="16" height="4.6" rx=".9"/><text x="' +
      f1(p[0]) +
      '" y="' +
      f1(p[1]) +
      '">' +
      txt +
      "</text></g>"
    );
  };
  return arenaSVG(
    'aria-label="Sword example. The boss jumps west from the middle. G1 takes the pocket behind his left side, G2 the pocket behind his right side."',
    {
      ground: swordCross(P, d).map(drawOverlay).join(""),
      zones: poly(pocket(1), mine === 1 ? "ok" : "other") + poly(pocket(-1), mine === -1 ? "ok" : "other"),
      // Where he stood in the middle, his jump, and where he lands.
      boss:
        '<circle class="ghost" cx="50" cy="50" r="3.4"/><line class="jump" x1="46" y1="50" x2="33" y2="50"/>' +
        drawBoss({ x: P[0], y: P[1], f: 270 }),
      labels: label(1, "G1 / H1") + label(-1, "G2 / H2"),
    },
  );
}

/** One white box of the sheet, with its heading. */
interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="min-w-0 rounded-lg border border-line bg-card p-5">
      <h2 className="mt-0 mb-2.5 font-display text-[26px] tracking-[.02em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

// TS note: an interface for a component's props, like the parameter list of a C# method. A call
// such as <Rule name="Sword" text="..." card="k-sword" /> must give all three, or it is an error.
interface RuleProps {
  name: string;
  text: string;
  card: string;
}

/** One line of "Positions to remember": the mechanic, its rule in a sentence or two, and a link to
    the Learn card with the detail. */
function Rule({ name, text, card }: RuleProps) {
  return (
    <li>
      <b>{name}:</b> {text}{" "}
      <Link className="text-[13px] font-bold whitespace-nowrap text-heal-ink" to={routeLink({ tab: "mech", card })}>
        Learn →
      </Link>
    </li>
  );
}

interface SourceProps {
  href: string;
  label: string;
  note?: string;
}

/** A link to a guide or a source, with an optional note after it. */
function Source({ href, label, note }: SourceProps) {
  return (
    <li>
      <a className="text-link" href={href} target="_blank" rel="noopener">
        {label}
      </a>
      {/* TS note: `note && <span>` shows the span only when there is a note. JSX skips false and undefined. */}
      {note && (
        <>
          {" "}
          <span className="text-[14px] text-ink-2">{note}</span>
        </>
      )}
    </li>
  );
}

const CELL = "border-b border-line px-2.5 py-2 text-left align-top";

/** The whole cheat sheet, for the slot picked in the header. */
export function CheatSheetPage() {
  const slot = useSlotStore((st) => st.slot);
  // "Reset my progress" asks once before it erases: the first click sets this.
  const [confirm, setConfirm] = useState(false);
  function handleReset(): void {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    state.stats = {};
    LS.del("stats");
    state.decks = {};
    setConfirm(false);
  }
  // The scores still live in the old code (core.ts), which React does not watch. The page reads
  // them on each draw, and the reset above draws it again. They move to a store in a later step.
  const seen = Object.keys(state.stats).length;
  const lede = TABS.find((t) => t.id === "sheet")?.lede;

  return (
    // .rx turns on the small reset for React parts (app.css).
    <main className={cn("rx", WRAP, "pt-5 pb-14")}>
      <div className="mb-4">
        <p className="m-0 max-w-[68ch] text-ink-2">{lede}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 [&_p]:max-w-[72ch]">
        <Section title="Panic reset">
          <ol className="m-0 grid max-w-[72ch] gap-2 pl-[22px]">
            <li>Feet: go to your spot for the next mechanic.</li>
            <li>Self: if you are low, heal or shield yourself.</li>
            <li>Team: a hit soon? Heal the party.</li>
          </ol>
          <p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p>
        </Section>

        {/* One short line per mechanic, written for your role. The detail lives on its Learn card. */}
        <Section title="Positions to remember">
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-5 max-[861px]:grid-cols-[minmax(0,1fr)]">
            <ul className="m-0 grid max-w-[72ch] gap-2.5 pl-5">
              <Rule name="Weapon order" text="The first weapon is the one he faces. Then clockwise." card="k-first-weapon" />
              <Rule
                name="Sword"
                text={
                  "Stand in the pocket behind him, on the side he jumped from. Yours is his " +
                  bySlot(slot, { H1: "left", H2: "right" }) +
                  ", and your light party stacks on you."
                }
                card="k-sword"
              />
              <Rule
                name="Scythe"
                text={`Everyone stands close around him. You take the ${bySlot(slot, { H1: "handle end", H2: "blade end" })}.`}
                card="k-scythe"
              />
              <Rule name="Axe" text="The whole party stacks in the middle, out of the axe hit." card="k-axe" />
              <Rule
                name="Ultimate Trophy Weapons"
                text="First spawn south and a bit west: clockwise. A bit east: counterclockwise."
                card="k-ult-spawn"
              />
              <Rule
                name="Void Stardust"
                text="Start north of him. Drop each puddle just outside the last, a small step clockwise. Then stack or spread."
                card="k-void"
              />
              <Rule
                name="Second weapon set"
                text="Spot it before the puddles: the first is the one with its flat side square to him. Sword or scythe first: stack or spread toward it."
                card="k-assault-2"
              />
              <Rule
                name="Comet spread"
                text="Healers take any open spot, away from the tanks and melee and out of the last puddle."
                card="k-void-spread"
              />
              <Rule
                name="Orbital Omen"
                text="Stay against his side, where the #2 lines cross. After #1, cross through him. After #2, cross back."
                card="k-orbital"
              />
              <Rule
                name="Meteorain, your meteor"
                text={bySlot(slot, {
                  H1: "Drop it NW, inside his hitbox.",
                  H2: "Drop it SW, in line with the first SW rock, farther out.",
                })}
                card="k-meteor-drop"
              />
              <Rule
                name="Meteorain, tanks"
                text="Their tethers are tank busters at 5:09, 5:19 and 5:29. Heal them after each one."
                card="k-meteor-order"
              />
            </ul>
            <figure className="m-0 min-w-0">
              {/* TS note: dangerouslySetInnerHTML puts ready-made HTML into an element. The name is a
                  warning: use it only for text the app built itself, never for text from a user. */}
              <div
                className="[&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-[340px]"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: the app builds this SVG itself (arena.ts).
                dangerouslySetInnerHTML={{ __html: swordDiagram(slot) }}
              />
              <figcaption className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-ink-2">
                Example: he jumps west from the middle. The pockets on the side he came from are the two stack spots. Yours is green.
              </figcaption>
            </figure>
          </div>
        </Section>

        <Section title={`Your timeline as ${slot}`}>
          <CatKey />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-[14.5px]">
              <thead>
                <tr className="[&>th]:font-mono [&>th]:text-[11.5px] [&>th]:font-medium [&>th]:tracking-[.06em] [&>th]:text-ink-2 [&>th]:uppercase">
                  <th className={CELL}>Time</th>
                  <th className={CELL}>Mechanic</th>
                  <th className={CELL}>What you do</th>
                </tr>
              </thead>
              <tbody>
                {/* Each row shows the ability list's marks for what it covers, with the same colour key. */}
                {TL.map((e, i) => {
                  const cats = tlCats(i);
                  return (
                    <tr key={e.t + e.n}>
                      <td className={cn(CELL, "font-mono whitespace-nowrap tabular-nums")}>{e.t}</td>
                      <td className={cn(CELL, "min-w-[170px] font-bold")}>
                        {e.n}
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-normal text-ink-2">
                          <Marks cats={cats} size="md" />
                          {catNames(cats)}
                        </div>
                      </td>
                      <td className={CELL}>{e.job(slot)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[13px] text-ink-2">
            Times are from the cactbot fight timeline. Some phase 1 times move by a second or two with the axe or scythe opener.
          </p>
        </Section>

        <Section title="Sources">
          <ul className="m-0 grid list-none gap-1.5 p-0">
            <Source href={WTFDIG} label="wtfdig M11S" note="Your strats: Hector (Toxic), Kindred No Buddies, Fixed (3CJ)" />
            <Source href="https://www.youtube.com/watch?v=w1uuwzhyf5A" label="Hector's video guide" />
            <Source href="https://raidplan.io/plan/HJAbE7fuWodELUSB" label="Toxic Friends raidplan" note="Phases 1 and 2" />
            <Source href="https://raidplan.io/plan/hvbysrfwvrc55ahz" label="Kindred raidplan" note="Arena Split" />
            <Source href="https://raidplan.io/plan/KXVlSGwV3zqON3CJ" label="Fixed Stampede raidplan" note="Ecliptic Stampede" />
            <Source
              href="https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide"
              label="Icy Veins M11S guide"
              note="Mechanic details, enrage at 11:00"
            />
            <Source href={CACTBOT_TIMELINE} label="cactbot r11s timeline" note="Times" />
          </ul>
        </Section>

        <Section title="Your progress">
          <p>You answered {seen} different items so far. Progress stays in this browser only.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Button variant="outline" onClick={handleReset}>
              {confirm ? "Click again to erase progress" : "Reset my progress"}
            </Button>
          </div>
        </Section>
      </div>
    </main>
  );
}
