import { Check, X } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { answerStep, type Pattern, type Phase, phaseAfter } from "../../lib/practice";
import { cn } from "../../lib/utils";
import type { MapDrill, Point, StepResult } from "../../types";
import { PracticeArena } from "../arena/PracticeArena";
import { HudPrompt } from "../HudPrompt";
import { LastAnswer } from "../LastAnswer";
import { RuleBox } from "../RuleBox";
import { SetupText } from "../SetupText";
import { StepChips } from "../StepChips";

export interface PracticeDrillProps {
  item: MapDrill;
  pattern: Pattern;
  /** The place of the mechanic in the list, and how many there are. */
  i: number;
  count: number;
  /** True when the mechanic has random parts, so New pattern gives a different one. */
  canChange: boolean;
  /** Called once when every step is answered, without Show me: true when every spot was right. */
  onScore: (allRight: boolean) => void;
  onNextMechanic: () => void;
  /** The same pattern from its first step. */
  onAgain: () => void;
  onNewPattern: () => void;
  /** Draw the mechanic again, so its weapons appear one at a time again. */
  onReplaySpawns: () => void;
}

/** One Practice mechanic: click where you stand on the arena, one step at a time. Above the arena:
    the question with Show me, or why a spot was wrong, or the result. Beside it: the mechanic, its
    steps, the last answer and, at the end, the rule and the way on.
    Give it a `key` per mechanic, pattern and try, so each starts fresh. */
export function PracticeDrill({
  item,
  pattern,
  i,
  count,
  canChange,
  onScore,
  onNextMechanic,
  onAgain,
  onNewPattern,
  onReplaySpawns,
}: PracticeDrillProps) {
  const { scene: sc, k } = pattern;
  const [results, setResults] = useState<StepResult[]>([]);
  const [phase, setPhase] = useState<Phase>("ask");
  /** Show me is on: the right spot for the step asked shows in blue. */
  const [shown, setShown] = useState(false);
  /** Show me was used, so this try does not count in your score: it was learning, not a test. */
  const [helped, setHelped] = useState(false);

  const n = results.length;
  const done = n >= sc.steps.length;
  const multi = sc.steps.length > 1;
  const last = n > 0 ? results[n - 1] : undefined;

  function handleArenaClick(p: Point): void {
    // After a wrong spot the mechanic waits for Next step, so a click does not answer by accident.
    if (done || phase === "wrong") return;
    const r = answerStep(sc, k, results, p);
    if (!r) return;
    const next = [...results, r];
    setResults(next);
    setPhase(phaseAfter(sc, next));
    setShown(false);
    if (next.length >= sc.steps.length && !helped) onScore(next.every((x) => x.ok));
  }
  function handleShowMe(): void {
    setShown(!shown);
    if (!shown) setHelped(true);
  }
  const nextStep = (): void => setPhase("ask");

  // Enter: Next step after an answer, or Next mechanic at the end. Enter on a button is its click.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement | null)?.tagName === "BUTTON") return;
    if (done) {
      e.preventDefault();
      onNextMechanic();
    } else if (phase !== "ask") {
      e.preventDefault();
      nextStep();
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const right = results.filter((r) => r.ok).length;
  const allRight = right === sc.steps.length;
  const hud = done ? (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2",
        allRight ? "border-green-600 bg-green-50" : "border-destructive bg-red-50",
      )}
    >
      {allRight ? <Check aria-hidden="true" className="text-green-700" /> : <X aria-hidden="true" className="text-destructive" />}
      <p className="flex-1 text-sm font-semibold" role="status">
        {allRight ? (multi ? "All steps right" : "Right") : multi ? `${right} of ${sc.steps.length} right` : "Not there"}
      </p>
      <Button size="sm" onClick={onNextMechanic}>
        Next mechanic
      </Button>
      <Button size="sm" variant="outline" onClick={onAgain}>
        Again
      </Button>
    </div>
  ) : phase === "wrong" && last ? (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive bg-red-50 px-3 py-2">
      <X aria-hidden="true" className="text-destructive" />
      <p className="flex-1 text-sm" role="status">
        <span className="font-semibold">Not there.</span> {sc.steps[n - 1].a}
      </p>
      <Button size="sm" onClick={nextStep}>
        Next step
      </Button>
    </div>
  ) : (
    // Show me: the right spot for this step, and its answer in place of the question. Your next
    // click still answers.
    <HudPrompt count={`${n + 1}/${sc.steps.length}`} text={shown ? sc.steps[n].a : sc.steps[n].q}>
      <Button size="sm" variant="outline" aria-pressed={shown} onClick={handleShowMe}>
        {shown ? "Hide" : "Show me"}
      </Button>
    </HudPrompt>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-3">
        {hud}
        <PracticeArena
          scene={sc}
          k={k}
          results={results}
          showLast={phase !== "ask" || done}
          hint={shown && phase !== "wrong"}
          onPointClick={handleArenaClick}
          className="mx-auto block h-auto w-full max-w-[min(100%,40rem)]"
        />
      </div>
      <Card>
        <CardHeader>
          <CardDescription>
            {item.phase} · {i + 1} of {count}
          </CardDescription>
          <CardTitle className="text-xl">{item.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SetupText text={sc.setup} folded={n > 0} />
          {multi && <StepChips count={sc.steps.length} results={results} />}
          {!done && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              {multi && (
                <span className="block text-xs text-muted-foreground">
                  Step {n + 1} of {sc.steps.length}
                </span>
              )}
              <span className="font-medium">{sc.steps[n].q}</span>
            </div>
          )}
          {/* The rule says why the spot is right: at the end, and with Show me, which gives where. */}
          {(done || shown) && <RuleBox rule={sc.rule} />}
          {last && <LastAnswer ok={last.ok} question={sc.steps[n - 1].q} answer={sc.steps[n - 1].a} />}
          <div className="flex flex-wrap gap-2">
            {done && <Button onClick={onNextMechanic}>Next mechanic</Button>}
            {done && (
              <Button variant="outline" onClick={onAgain}>
                Again
              </Button>
            )}
            {!done && sc.spawnPlay && (
              <Button variant="outline" onClick={onReplaySpawns}>
                Watch the spawns again
              </Button>
            )}
            {/* A mechanic with nothing random would look the same again, so it gets no New pattern. */}
            {canChange && (
              <Button variant="outline" onClick={onNewPattern}>
                New pattern
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
