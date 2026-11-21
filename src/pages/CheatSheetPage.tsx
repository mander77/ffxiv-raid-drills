// The Cheat sheet page (/sheet): the panic reset, the positions and your timeline on one page.
// TS note: a .tsx file is TypeScript that may hold JSX, the HTML-like tags below. Each tag compiles
// to a call to React, so the compiler checks every tag and attribute.
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WRAP } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { Arena } from "../components/arena/Arena";
import { BossMark } from "../components/arena/BossMark";
import { Shape } from "../components/arena/Shape";
import { ZoneMark } from "../components/arena/ZoneMark";
import { CatKey } from "../components/CatKey";
import { catNames, Marks } from "../components/Marks";
import { tlCats } from "../data/abilities";
import { swordCross, swordPocket } from "../data/attacks";
import { CACTBOT_TIMELINE, WTFDIG } from "../data/sources";
import { TL } from "../data/timeline";
import { f1, leftOf, unit, vadd } from "../geometry";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import type { Point, Slot } from "../types";
import { bySlot } from "../util";

interface SwordExampleProps {
  slot: Slot;
  className?: string;
}

/** A fixed sword example: the boss jumps west from the middle. The pockets on the side he came
    from are the two stack spots. Yours is green, the other light party's is grey. */
function SwordExample({ slot, className }: SwordExampleProps) {
  const P: Point = [21, 50];
  const d: Point = [-1, 0];
  const L = leftOf(d);
  const mine = bySlot(slot, { H1: 1, H2: -1 });
  const pocket = (side: number): Point[] => swordPocket(P, d, [L[0] * side, L[1] * side]);
  const label = (side: number, text: string) => {
    const p = vadd(P, unit(vadd([-d[0], -d[1]], [L[0] * side, L[1] * side])), 29);
    return (
      <g className={side === mine ? "zlabel" : "zlabel other"}>
        <rect x={f1(p[0] - 8)} y={f1(p[1] - 2.3)} width="16" height="4.6" rx=".9" />
        <text x={f1(p[0])} y={f1(p[1])}>
          {text}
        </text>
      </g>
    );
  };
  return (
    <Arena
      label="Sword example. The boss jumps west from the middle. G1 takes the pocket behind his left side, G2 the pocket behind his right side."
      className={className}
      layers={{
        // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of the example never change order.
        ground: swordCross(P, d).map((o, i) => <Shape key={i} o={o} />),
        zones: (
          <>
            <ZoneMark z={{ poly: pocket(1) }} cls={mine === 1 ? "ok" : "other"} />
            <ZoneMark z={{ poly: pocket(-1) }} cls={mine === -1 ? "ok" : "other"} />
          </>
        ),
        // Where he stood in the middle, his jump, and where he lands.
        boss: (
          <>
            <circle className="ghost" cx="50" cy="50" r="3.4" />
            <line className="jump" x1="46" y1="50" x2="33" y2="50" />
            <BossMark boss={{ x: P[0], y: P[1], f: 270 }} />
          </>
        ),
        labels: (
          <>
            {label(1, "G1 / H1")}
            {label(-1, "G2 / H2")}
          </>
        ),
      }}
    />
  );
}

/** One line of "Positions to remember": the mechanic, and its rule for your slot in a sentence or two. */
interface Rule {
  name: string;
  text: (s: Slot) => string;
}

/** One short line per mechanic, in fight order, written for your role. */
const RULES: readonly Rule[] = [
  { name: "Weapon order", text: () => "The first weapon is the one he faces. Then clockwise." },
  {
    name: "Sword",
    text: (s) =>
      `Stand in the pocket behind him, on the side he jumped from. Yours is his ${bySlot(s, { H1: "left", H2: "right" })}, and your light party stacks on you.`,
  },
  { name: "Scythe", text: (s) => `Everyone stands close around him. You take the ${bySlot(s, { H1: "handle end", H2: "blade end" })}.` },
  { name: "Axe", text: () => "The whole party stacks in the middle, out of the axe hit." },
  { name: "Ultimate Trophy Weapons", text: () => "First spawn south and a bit west: clockwise. A bit east: counterclockwise." },
  {
    name: "Void Stardust",
    text: () => "Start north of him. Drop each puddle just outside the last, a small step clockwise. Then stack or spread.",
  },
  {
    name: "Second weapon set",
    text: () =>
      "Spot it before the puddles: the first is the one with its flat side square to him. Sword or scythe first: stack or spread toward it.",
  },
  { name: "Comet spread", text: () => "Healers take any open spot, away from the tanks and melee and out of the last puddle." },
  {
    name: "Orbital Omen",
    text: () => "Stay against his side, where the #2 lines cross. After #1, cross through him. After #2, cross back.",
  },
  {
    name: "Meteorain, your meteor",
    text: (s) => bySlot(s, { H1: "Drop it NW, inside his hitbox.", H2: "Drop it SW, in line with the first SW rock, farther out." }),
  },
  { name: "Meteorain, tanks", text: () => "Their tethers are tank busters at 5:09, 5:19 and 5:29. Heal them after each one." },
];

/** A guide or a source, with an optional note after it. */
const SOURCES: readonly { href: string; label: string; note?: string }[] = [
  { href: WTFDIG, label: "wtfdig M11S", note: "Your strats: Hector (Toxic), Kindred No Buddies, Fixed (3CJ)" },
  { href: "https://www.youtube.com/watch?v=w1uuwzhyf5A", label: "Hector's video guide" },
  { href: "https://raidplan.io/plan/HJAbE7fuWodELUSB", label: "Toxic Friends raidplan", note: "Phases 1 and 2" },
  { href: "https://raidplan.io/plan/hvbysrfwvrc55ahz", label: "Kindred raidplan", note: "Arena Split" },
  { href: "https://raidplan.io/plan/KXVlSGwV3zqON3CJ", label: "Fixed Stampede raidplan", note: "Ecliptic Stampede" },
  {
    href: "https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide",
    label: "Icy Veins M11S guide",
    note: "Mechanic details, enrage at 11:00",
  },
  { href: CACTBOT_TIMELINE, label: "cactbot r11s timeline", note: "Times" },
];

interface SectionProps {
  title: string;
  children: ReactNode;
}

/** One card of the sheet, with its heading. */
function Section({ title, children }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/** The whole cheat sheet, for the slot picked in the header. */
export function CheatSheetPage() {
  const slot = useSlotStore((st) => st.slot);
  return (
    <main className={cn(WRAP, "space-y-6 py-6")}>
      <p className="text-muted-foreground">{tabOf("/sheet")?.lede}</p>

      <Section title="Panic reset">
        <ol className="list-decimal space-y-2 pl-6">
          <li>Feet: go to your spot for the next mechanic.</li>
          <li>Self: if you are low, heal or shield yourself.</li>
          <li>Team: a hit soon? Heal the party.</li>
        </ol>
        <p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p>
      </Section>

      <Section title="Positions to remember">
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="list-disc space-y-2 pl-5">
            {RULES.map((r) => (
              <li key={r.name}>
                <span className="font-semibold">{r.name}:</span> {r.text(slot)}
              </li>
            ))}
          </ul>
          <figure className="min-w-0">
            <SwordExample slot={slot} className="mx-auto block h-auto w-full max-w-sm" />
            <figcaption className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Example: he jumps west from the middle. The pockets on the side he came from are the two stack spots. Yours is green.
            </figcaption>
          </figure>
        </div>
      </Section>

      <Section title={`Your timeline as ${slot}`}>
        <CatKey />
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Mechanic</TableHead>
              <TableHead>What you do</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Each row shows the ability list's marks for what it covers, with the same colour key. */}
            {TL.map((e, i) => {
              const cats = tlCats(i);
              return (
                <TableRow key={e.t + e.n}>
                  <TableCell className="align-top font-mono tabular-nums">{e.t}</TableCell>
                  <TableCell className="min-w-[170px] align-top font-medium whitespace-normal">
                    {e.n}
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <Marks cats={cats} size="md" />
                      {catNames(cats)}
                    </div>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">{e.job(slot)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground">
          Times are from the cactbot fight timeline. Some phase 1 times move by a second or two with the axe or scythe opener.
        </p>
      </Section>

      <Section title="Sources">
        <ul className="space-y-1.5">
          {SOURCES.map((src) => (
            <li key={src.href}>
              <a className="text-primary underline underline-offset-4" href={src.href} target="_blank" rel="noopener">
                {src.label}
              </a>
              {/* TS note: `note && <span>` shows the span only when there is a note. JSX skips false and undefined. */}
              {src.note && <span className="text-sm text-muted-foreground"> {src.note}</span>}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
