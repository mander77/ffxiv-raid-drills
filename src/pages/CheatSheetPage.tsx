// The Cheat Sheet page (/sheet): every mechanic with its picture, the panic reset and your timeline
// on one page.
// TS note: a .tsx file is TypeScript that may hold JSX, the HTML-like tags below. Each tag compiles
// to a call to React, so the compiler checks every tag and attribute.
import { type ComponentProps, type MouseEvent, type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LearnPicture } from "../components/arena/LearnPicture";
import { CategoryIcons, categoryNames } from "../components/CategoryIcons";
import { CategoryKey } from "../components/CategoryKey";
import { LineList } from "../components/LineList";
import { PageContainer } from "../components/PageContainer";
import type { FightData } from "../data/fights/types";
import { useFight, useFightLink } from "../hooks/useFight";
import { useSectionInView } from "../hooks/useSectionInView";
import { prefersLessMotion } from "../lib/dom";
import { learnCard, practiceDrill, referenceByPhase, slotAnswer } from "../lib/reference";
import { scoresOf, useProgressStore } from "../stores/progress";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import type { ReferenceEntry, Slot } from "../types";

/** The phases of the fight in order, each with its mechanics. */
type SheetPhases = ReturnType<typeof referenceByPhase>;
/** One section of the page: the address of its heading, and its button's label. */
interface SheetSection {
  id: string;
  label: string;
}

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
function practiceLabel(fight: FightData, drill: string, many: boolean): string {
  const title = practiceDrill(fight, drill).title;
  return many ? `Practice: ${title.split(": ").at(-1)}` : "Practice";
}

interface MechanicCardProps {
  entry: ReferenceEntry;
  slot: Slot;
}

/** One mechanic: its time and name, its Learn answer picture for your slot, its rules, the answers
    that are yours alone, and links to the tabs that train it. */
function MechanicCard({ entry, slot }: MechanicCardProps) {
  const fight = useFight();
  const link = useFightLink();
  const card = learnCard(fight, entry.picture);
  const fig = fight.pictures[entry.picture]?.(slot);
  const yours = entry.cards.map((id) => slotAnswer(fight, id, slot)).filter((a) => a !== undefined);
  // Every rule line of its cards, each once: two cards can share a line.
  const rules = [...new Set(entry.cards.flatMap((id) => learnCard(fight, id).build(slot).rule))];
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
          <LineList lines={rules} className="space-y-1" />
          {yours.map((answer) => (
            <p key={answer}>
              <span className="font-semibold">As {slot}:</span> {answer}
            </p>
          ))}
          <nav aria-label={`Train ${entry.name}`} className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={link(`/learn/${entry.cards[0]}`)}>Learn</Link>
            </Button>
            {entry.drills.map((d) => (
              <Button key={d} asChild variant="outline" size="sm">
                <Link to={link(`/practice/${d}`)}>{practiceLabel(fight, d, entry.drills.length > 1)}</Link>
              </Button>
            ))}
            {entry.timeline && (
              <Button asChild variant="outline" size="sm">
                <Link to={link(`/timeline/${entry.timeline}`)}>Timeline</Link>
              </Button>
            )}
          </nav>
        </div>
      </CardContent>
    </Card>
  );
}

interface MechanicsProps {
  phases: SheetPhases;
  slot: Slot;
}

/** Every mechanic in fight order, by phase. */
function Mechanics({ phases, slot }: MechanicsProps) {
  return (
    <section aria-labelledby="mechanics" className="space-y-4">
      <h2 id="mechanics" className="font-display text-2xl tracking-wide">
        Every Mechanic as {slot}
      </h2>
      {phases.map((p) => (
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
    </section>
  );
}

/** The sections of the page in order, for the Back and Next buttons: the phases, the panic reset
    and the timeline. Each id is the address of the section's heading. Sources and Your progress
    are left out: they are short and end the page, so their headings never scroll up to the top,
    and a jump to them would seem to do nothing. They come right after the timeline. */
const sectionsOf = (phases: SheetPhases): SheetSection[] => [
  ...phases.map((p) => ({ id: phaseId(p.phase), label: shortPhase(p.phase) })),
  { id: "panic-reset", label: "Panic Reset" },
  { id: "timeline", label: "Timeline" },
];

interface JumpLinkProps extends ComponentProps<"a"> {
  /** The id of the section to go to, or "top" for the top of the page. */
  to: string;
  /** True to scroll there smoothly; otherwise the page jumps there at once. */
  smooth?: boolean;
}

/** A link to a section of this page. A click jumps there, or with `smooth` scrolls there, unless
    the player asked their system for less motion. Button's asChild passes its classes on to it. */
function JumpLink({ to, smooth = false, ...props }: JumpLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    const behavior = smooth && !prefersLessMotion() ? "smooth" : "instant";
    if (to === "top") window.scrollTo({ top: 0, behavior });
    // scrollIntoView keeps the section's scroll margin, so it stops below the wide-screen header.
    else document.getElementById(to)?.scrollIntoView({ behavior });
  }
  return <a {...props} href={`#${to}`} onClick={handleClick} />;
}

/** The two short cards that end the page: the buttons at its top list them after the stops of
    Back and Next. */
const LAST_SECTIONS: readonly SheetSection[] = [
  { id: "sources", label: "Sources" },
  { id: "progress", label: "Your Progress" },
];

interface SectionsProps {
  /** The stops of Back and Next, in page order. */
  sections: readonly SheetSection[];
}

/** A row of buttons at the top of the page, one per section, to jump to it. */
function SectionChips({ sections }: SectionsProps) {
  return (
    <nav aria-label="Sections on this page" className="flex flex-wrap gap-2">
      {[...sections, ...LAST_SECTIONS].map((x) => (
        <Button key={x.id} asChild variant="outline" size="sm">
          <JumpLink to={x.id}>{x.label}</JumpLink>
        </Button>
      ))}
    </nav>
  );
}

/** How far from the top of the screen a section heading counts as reached, in pixels: below the
    wide-screen header, which stays at the top. The app's choice. */
const SECTION_REACHED = 150;

/** Buttons in the bottom corner, once you scroll to the first phase: back to the section before
    the one you are in, on to the next section, and back to the top of the page. */
function SectionButtons({ sections }: SectionsProps) {
  const ids = useMemo(() => sections.map((x) => x.id), [sections]);
  const inView = useSectionInView(ids, SECTION_REACHED);
  if (inView === null) return null;
  const i = sections.findIndex((x) => x.id === inView);
  const back = sections[i - 1];
  const next = sections[i + 1];
  return (
    <nav aria-label="Go to a section" className="fixed right-4 bottom-4 z-10 flex gap-2">
      {back && (
        <Button asChild size="sm" className="shadow-md">
          <JumpLink to={back.id} smooth>
            ↑ {back.label}
          </JumpLink>
        </Button>
      )}
      {next && (
        <Button asChild size="sm" className="shadow-md">
          <JumpLink to={next.id} smooth>
            ↓ {next.label}
          </JumpLink>
        </Button>
      )}
      <Button asChild size="sm" className="shadow-md">
        <JumpLink to="top" smooth>
          ↑ Top
        </JumpLink>
      </Button>
    </nav>
  );
}

interface SectionProps {
  /** The address of the section, for the buttons that jump to it. */
  id: string;
  title: string;
  children: ReactNode;
}

/** One card of the sheet, with its heading. The wide-screen header stays at the top, so a jump to
    the card stops below it. */
function Section({ id, title, children }: SectionProps) {
  return (
    <Card id={id} className="scroll-mt-32">
      <CardHeader>
        <CardTitle className="font-display text-lg tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

interface YourProgressProps {
  slot: Slot;
}

/** How many questions and drills you answered in your slot, and Reset, which asks once before it
    erases the progress of every slot in this fight. */
function YourProgress({ slot }: YourProgressProps) {
  const fight = useFight().id;
  const seen = useProgressStore((st) => Object.keys(scoresOf(st, fight, slot)).length);
  const reset = useProgressStore((st) => st.reset);
  const [confirm, setConfirm] = useState(false);
  function handleReset(): void {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    reset(fight);
    setConfirm(false);
  }
  return (
    <>
      <p>
        You answered {seen} different items as {slot} so far. Progress stays in this browser only.
      </p>
      <Button variant={confirm ? "destructive" : "outline"} onClick={handleReset}>
        {confirm ? "Click Again to Erase Progress" : "Reset My Progress"}
      </Button>
    </>
  );
}

/** The whole cheat sheet, for the slot picked in the header. */
export function CheatSheetPage() {
  const slot = useSlotStore((st) => st.slot);
  const fight = useFight();
  const phases = useMemo(() => referenceByPhase(fight), [fight]);
  const sections = useMemo(() => sectionsOf(phases), [phases]);
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/sheet")?.lede}</p>
        <SectionChips sections={sections} />

        <Mechanics phases={phases} slot={slot} />

        <Section id="panic-reset" title="Panic Reset">
          <ol className="list-decimal space-y-2 pl-6">
            <li>Feet: go to your spot for the next mechanic.</li>
            <li>Self: if you are low, heal or shield yourself.</li>
            <li>Team: a hit soon? Heal the party.</li>
          </ol>
          <p>Say it in your head: feet, self, team. If you are not sure, any of these beats standing still.</p>
        </Section>

        <Section id="timeline" title={`Your Timeline as ${slot}`}>
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
              {/* Each row shows the ability list's category icons for what it covers, with the same key. */}
              {fight.timeline.map((e, i) => {
                const cats = fight.timelineCategories(i);
                return (
                  <TableRow key={e.t + e.n}>
                    <TableCell className="align-top font-mono tabular-nums">{e.t}</TableCell>
                    <TableCell className="min-w-[170px] align-top font-medium whitespace-normal">
                      {e.n}
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                        <CategoryIcons cats={cats} />
                        {categoryNames(cats)}
                      </div>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <LineList lines={e.job(slot)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">{fight.timelineNote}</p>
        </Section>

        <Section id="sources" title="Sources">
          <ul className="space-y-1.5">
            {fight.sources.map((src) => (
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
        <Section id="progress" title="Your Progress">
          <YourProgress slot={slot} />
        </Section>
        <SectionButtons sections={sections} />
      </PageContainer>
    </main>
  );
}
