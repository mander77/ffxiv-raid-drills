import { useEffect, useEffectEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { answerStep, type Pattern, type StepStatus, statusAfter } from "../../lib/practice";
import { cn } from "../../lib/utils";
import type { Drill, Point, StepResult } from "../../types";
import { ArenaFrame, type ArenaFrameProps } from "../arena/ArenaFrame";
import { LiveArena } from "../arena/LiveArena";
import { HudPrompt } from "../HudPrompt";
import { IconButton } from "../IconButton";
import { CorrectIcon, IncorrectIcon, NextMechanicIcon, ResetIcon } from "../icons";
import { LastAnswer } from "../LastAnswer";
import { KINDS, MechanicIcon } from "../MechanicIcon";
import { RuleBox } from "../RuleBox";
import { SetupText } from "../SetupText";
import { StepChips } from "../StepChips";
import { MechanicList } from "./MechanicList";

export interface DrillScreenProps {
  item: Drill;
  pattern: Pattern;
  /** Names the try: the mechanic, its pattern, the slot and the count of tries. A new one starts
      the screen fresh. */
  tryKey: string;
  /** The place of the mechanic in the list, and how many there are. */
  i: number;
  count: number;
  /** True when the mechanic has random parts, so New pattern gives a different one. */
  canChange: boolean;
  /** Called once when every step is answered, without Show me: true when every spot was correct. */
  onScore: (allCorrect: boolean) => void;
  onNextMechanic: () => void;
  /** Reset: the same pattern from its first step. */
  onReset: () => void;
  onNewPattern: () => void;
  /** Draw the mechanic again, so its weapons appear one at a time again. */
  onReplaySpawns: () => void;
  /** Open another mechanic, from the list of mechanics. */
  onPick: (drill: string) => void;
}

/** The screen of one Practice mechanic (a drill): click where you stand on the arena, one step at
    a time. It has the layout of Pressure's player. On a wide screen: on the left, the question with
    Show me (or why a spot was incorrect, or the result) over the mechanic, its steps, the last
    answer and, at the end, the rule; on the right, a bar over the list of mechanics, where you pick
    another mechanic. On a narrow screen, the same in one column: the left side over the arena, the
    right side under it, with the line sideways. */
export function DrillScreen({
  item,
  pattern,
  tryKey,
  i,
  count,
  canChange,
  onScore,
  onNextMechanic,
  onReset,
  onNewPattern,
  onReplaySpawns,
  onPick,
}: DrillScreenProps) {
  const { scene: sc, k } = pattern;
  const [results, setResults] = useState<StepResult[]>([]);
  const [status, setStatus] = useState<StepStatus>("ask");
  /** Show me is on: the correct spot for the step asked shows in blue. */
  const [shown, setShown] = useState(false);
  /** Show me was used, so this try does not count in your score: it was learning, not a test. */
  const [helped, setHelped] = useState(false);
  // A new try starts fresh. The screen is not given a key for it, so the list of mechanics stays
  // where it is, under your pointer; the screen's state is reset as react.dev shows for a prop that changes.
  const [shownTry, setShownTry] = useState(tryKey);
  if (shownTry !== tryKey) {
    setShownTry(tryKey);
    setResults([]);
    setStatus("ask");
    setShown(false);
    setHelped(false);
  }
  /** A wide screen (lg, 1024 px and up): the columns sit beside the arena, as in Pressure. */
  const wide = useMediaQuery("(min-width: 1024px)");

  const n = results.length;
  const done = n >= sc.steps.length;
  const multi = sc.steps.length > 1;
  const last = n > 0 ? results[n - 1] : undefined;

  function handleArenaClick(p: Point): void {
    // After an incorrect spot the mechanic waits for Next step, so a click does not answer by accident.
    if (done || status === "incorrect") return;
    const r = answerStep(sc, k, results, p);
    if (!r) return;
    const next = [...results, r];
    setResults(next);
    setStatus(statusAfter(sc, next));
    setShown(false);
    if (next.length >= sc.steps.length && !helped) onScore(next.every((x) => x.ok));
  }
  function handleShowMe(): void {
    setShown(!shown);
    if (!shown) setHelped(true);
  }
  const nextStep = (): void => setStatus("ask");

  // Enter: Next step after an answer, or Next mechanic at the end. Enter on a button is its click.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement | null)?.tagName === "BUTTON") return;
    if (done) {
      e.preventDefault();
      onNextMechanic();
    } else if (status !== "ask") {
      e.preventDefault();
      nextStep();
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const correct = results.filter((r) => r.ok).length;
  const allCorrect = correct === sc.steps.length;
  /** Reset: the same pattern from its first step. Always in the bar at the top of the left side. */
  const reset = (
    <IconButton label="Reset" variant="outline" onClick={onReset}>
      <ResetIcon aria-hidden="true" />
    </IconButton>
  );
  const hud = done ? (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2",
        allCorrect ? "border-success-foreground bg-success" : "border-danger-foreground bg-danger",
      )}
    >
      {allCorrect ? (
        <CorrectIcon aria-hidden="true" className="text-success-foreground" />
      ) : (
        <IncorrectIcon aria-hidden="true" className="text-danger-foreground" />
      )}
      <p className="flex-1 text-sm font-semibold" role="status">
        {allCorrect ? (multi ? "All steps correct" : "Correct") : multi ? `${correct} of ${sc.steps.length} correct` : "Not there"}
      </p>
      <IconButton label="Next mechanic" variant="default" onClick={onNextMechanic}>
        <NextMechanicIcon aria-hidden="true" />
      </IconButton>
      {reset}
    </div>
  ) : status === "incorrect" && last ? (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-danger-foreground bg-danger px-3 py-2">
      <IncorrectIcon aria-hidden="true" className="text-danger-foreground" />
      <p className="flex-1 text-sm" role="status">
        <span className="font-semibold">Not there.</span> {sc.steps[n - 1].a}
      </p>
      <Button size="sm" onClick={nextStep}>
        Next step
      </Button>
      {reset}
    </div>
  ) : (
    // Show me: the correct spot for this step, and its answer in place of the question. Your next
    // click still answers.
    <HudPrompt count={`${n + 1}/${sc.steps.length}`} text={shown ? sc.steps[n].a : sc.steps[n].q}>
      <Button size="sm" variant="outline" aria-pressed={shown} onClick={handleShowMe}>
        {shown ? "Hide" : "Show me"}
      </Button>
      {reset}
    </HudPrompt>
  );

  const panel = (
    <section aria-label="The mechanic" className="space-y-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {item.phase} · {item.time}
        </p>
        <h2 className="font-display text-xl tracking-wide">{item.title}</h2>
      </div>
      {/* What you do, with the icon the list of mechanics shows for it. */}
      <Badge>
        <MechanicIcon kind={item.kind} countClassName="text-count" />
        {KINDS[item.kind].name}
      </Badge>
      <SetupText key={tryKey} text={sc.setup} folded={n > 0} />
      {multi && <StepChips count={sc.steps.length} results={results} />}
      {/* The rule says why the spot is correct: at the end, and with Show me, which gives where. */}
      {(done || shown) && <RuleBox rule={sc.rule} />}
      {last && <LastAnswer ok={last.ok} question={sc.steps[n - 1].q} answer={sc.steps[n - 1].a} />}
      {!done && sc.spawnPlay && (
        <Button variant="outline" onClick={onReplaySpawns}>
          Watch the spawns again
        </Button>
      )}
    </section>
  );
  /** The bar over the list of mechanics, in the place and the look of Pressure's bar. */
  const bar = (
    <div className="flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-1.5 pl-3">
      <span className="flex-1 text-sm text-muted-foreground">
        Mechanic {i + 1} of {count}
      </span>
      {/* A mechanic with nothing random would look the same again, so it gets no New pattern. */}
      {canChange && (
        <Button variant="outline" size="sm" onClick={onNewPattern}>
          New pattern
        </Button>
      )}
    </div>
  );
  /** The same places as in Pressure's player (see FightScreen). */
  const sides: Partial<ArenaFrameProps> = wide
    ? {
        before: (
          <div className="flex w-68 flex-col gap-3">
            {hud}
            <ScrollArea className="min-h-0 flex-1">{panel}</ScrollArea>
          </div>
        ),
        beside: (
          <div className="flex w-80 flex-col gap-2">
            {bar}
            <MechanicList axis="y" current={item.id} onPick={onPick} className="flex-1" />
          </div>
        ),
        className: "mx-0 ml-68 mr-80 min-w-0 flex-1",
      }
    : {
        over: (
          <div className="space-y-3 pb-2">
            {hud}
            {panel}
          </div>
        ),
        under: (
          <div className="space-y-2">
            {bar}
            <MechanicList axis="x" current={item.id} onPick={onPick} />
          </div>
        ),
        fill: true,
      };
  const arena = (
    <ArenaFrame {...sides}>
      <LiveArena
        key={tryKey}
        scene={sc}
        k={k}
        results={results}
        showLast={status !== "ask" || done}
        hint={shown && status !== "incorrect"}
        onPointClick={handleArenaClick}
        className="block h-auto w-full"
      />
    </ArenaFrame>
  );
  return wide ? <div className="flex justify-center">{arena}</div> : arena;
}
