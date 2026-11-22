// The Cheat sheet page (/sheet): every mechanic with its picture, the panic reset and your timeline
// on one page.
// TS note: a .tsx file is TypeScript that may hold JSX, the HTML-like tags below. Each tag compiles
// to a call to React, so the compiler checks every tag and attribute.
import { type ReactNode, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LearnPicture } from "../components/arena/LearnPicture";
import { CategoryDots, categoryNames } from "../components/CategoryDots";
import { CategoryKey } from "../components/CategoryKey";
import { PageContainer } from "../components/PageContainer";
import { timelineCategories } from "../data/abilities";
import { LEARN_PICTURES } from "../data/pictures";
import { learnCard, practiceDrill, type ReferenceEntry, referenceByPhase, slotAnswer } from "../data/reference";
import { CACTBOT_TIMELINE, WTFDIG } from "../data/sources";
import { TIMELINE } from "../data/timeline";
import { useSectionInView } from "../hooks/useSectionInView";
import { useProgressStore } from "../stores/progress";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import type { Slot } from "../types";

/** The phases of the fight in order, each with its mechanics. */
const PHASES = referenceByPhase();

/** The short name of a phase, "Phase 1" from "Phase 1: Trophy Weapons", for its chip. */
function shortPhase(phase: string): string {
  return phase.split(":")[0];
}

/** The page address of a phase's heading, "phase-1", so its chip can jump to it. */
function phaseId(phase: string): string {
  return shortPhase(phase).toLowerCase().replace(" ", "-");
}

/** The name of a drill on its button: "Practice" when the mechanic has one drill, or "Practice:
    axe" from "Raw Steel Trophy: axe" when it has more. */
function practiceLabel(drill: string, many: boolean): string {
  const title = practiceDrill(drill).title;
  return many ? `Practice: ${title.split(": ").at(-1)}` : "Practice";
}

interface MechanicCardProps {
  entry: ReferenceEntry;
  slot: Slot;
}

/** One mechanic: its time and name, its Learn answer picture for your slot, its rules, the answers
    that are yours alone, and links to the tabs that train it. */
function MechanicCard({ entry, slot }: MechanicCardProps) {
  const card = learnCard(entry.picture);
  const fig = LEARN_PICTURES[entry.picture]?.(slot);
  const yours = entry.cards.map((id) => slotAnswer(id, slot)).filter((a) => a !== undefined);
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-muted-foreground tabular-nums">{card.time}</span>
          <span className="font-display text-lg tracking-wide">{entry.name}</span>
        </CardTitle>
      </CardHeader>
      {/* From tablet width the text sits beside the picture; on a phone, under it. */}
      <CardContent className="flex flex-col gap-4 px-4 md:flex-row md:items-start">
        {fig && (
          <LearnPicture
            fig={fig}
            answered
            label={`${entry.name} on the arena. The green area shows the answer.`}
            className="block h-auto w-full md:w-sm md:shrink-0 lg:w-md xl:w-xl"
          />
        )}
        <div className="min-w-0 space-y-4">
          <ul className="list-disc space-y-1 pl-5">
            {entry.cards.map((id) => (
              <li key={id}>{learnCard(id).build(slot).rule}</li>
            ))}
          </ul>
          {yours.map((answer) => (
            <p key={answer}>
              <span className="font-semibold">As {slot}:</span> {answer}
            </p>
          ))}
          <nav aria-label={`Train ${entry.name}`} className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/learn/${entry.cards[0]}`}>Learn</Link>
            </Button>
            {entry.drills.map((d) => (
              <Button key={d} asChild variant="outline" size="sm">
                <Link to={`/practice/${d}`}>{practiceLabel(d, entry.drills.length > 1)}</Link>
              </Button>
            ))}
            {entry.timeline && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/timeline/${entry.timeline}`}>Timeline</Link>
              </Button>
            )}
          </nav>
        </div>
      </CardContent>
    </Card>
  );
}

interface MechanicsProps {
  slot: Slot;
}

/** Every mechanic in fight order, by phase, with a chip to jump to each phase. */
function Mechanics({ slot }: MechanicsProps) {
  return (
    <section aria-labelledby="mechanics" className="space-y-4">
      <h2 id="mechanics" className="font-display text-2xl tracking-wide">
        Every mechanic as {slot}
      </h2>
      <nav aria-label="Go to a phase" className="flex flex-wrap gap-2">
        {PHASES.map((p) => (
          <Button key={p.phase} asChild variant="outline" size="sm">
            <a href={`#${phaseId(p.phase)}`}>{shortPhase(p.phase)}</a>
          </Button>
        ))}
      </nav>
      {PHASES.map((p) => (
        // The wide-screen header stays at the top, so a phase heading stops below it.
        <section key={p.phase} aria-labelledby={phaseId(p.phase)} className="space-y-3">
          <h3 id={phaseId(p.phase)} className="scroll-mt-32 font-display text-xl tracking-wide">
            {p.phase}
          </h3>
          <div className="space-y-4">
            {p.entries.map((e) => (
              <MechanicCard key={e.name} entry={e} slot={slot} />
            ))}
          </div>
        </section>
      ))}
      <BackButtons />
    </section>
  );
}

/** The page addresses of the phase headings, in order. */
const PHASE_IDS = PHASES.map((p) => phaseId(p.phase));

/** How far from the top of the screen a phase heading counts as reached, in pixels: below the
    wide-screen header, which stays at the top. The app's choice. */
const PHASE_REACHED = 150;

/** Two buttons in the bottom corner, once you scroll into the mechanics: back to the start of the
    phase you are in, and back to the top of the page. */
function BackButtons() {
  const inView = useSectionInView(PHASE_IDS, PHASE_REACHED);
  if (inView === null) return null;
  const phase = PHASES[PHASE_IDS.indexOf(inView)].phase;
  return (
    <nav aria-label="Go back" className="fixed right-4 bottom-4 z-10 flex gap-2">
      <Button asChild size="sm" className="shadow-md">
        <a href={`#${inView}`}>↑ {shortPhase(phase)}</a>
      </Button>
      <Button asChild size="sm" className="shadow-md">
        <a href="#top">↑ Top</a>
      </Button>
    </nav>
  );
}

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
        <CardTitle className="font-display text-lg tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/** How many questions and drills you answered, and Reset, which asks once before it erases. */
function Progress() {
  const seen = useProgressStore((st) => Object.keys(st.scores).length);
  const reset = useProgressStore((st) => st.reset);
  const [confirm, setConfirm] = useState(false);
  function handleReset(): void {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    reset();
    setConfirm(false);
  }
  return (
    <>
      <p>You answered {seen} different items so far. Progress stays in this browser only.</p>
      <Button variant={confirm ? "destructive" : "outline"} onClick={handleReset}>
        {confirm ? "Click again to erase progress" : "Reset my progress"}
      </Button>
    </>
  );
}

/** The whole cheat sheet, for the slot picked in the header. */
export function CheatSheetPage() {
  const slot = useSlotStore((st) => st.slot);
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/sheet")?.lede}</p>

        <Mechanics slot={slot} />

        <Section title="Panic reset">
          <ol className="list-decimal space-y-2 pl-6">
            <li>Feet: go to your spot for the next mechanic.</li>
            <li>Self: if you are low, heal or shield yourself.</li>
            <li>Team: a hit soon? Heal the party.</li>
          </ol>
          <p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p>
        </Section>

        <Section title={`Your timeline as ${slot}`}>
          <CategoryKey />
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
              {TIMELINE.map((e, i) => {
                const cats = timelineCategories(i);
                return (
                  <TableRow key={e.t + e.n}>
                    <TableCell className="align-top font-mono tabular-nums">{e.t}</TableCell>
                    <TableCell className="min-w-[170px] align-top font-medium whitespace-normal">
                      {e.n}
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                        <CategoryDots cats={cats} size="md" />
                        {categoryNames(cats)}
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
        <Section title="Your progress">
          <Progress />
        </Section>
      </PageContainer>
    </main>
  );
}
