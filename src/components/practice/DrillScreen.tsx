import { useEffect, useEffectEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { isPageKey } from "../../lib/dom";
import { answerStep, kindsOf, type Pattern, type StepStatus, statusAfter } from "../../lib/practice";
import type { Drill, Point, StepResult } from "../../types";
import { ArenaFrame, type ArenaFrameProps } from "../arena/ArenaFrame";
import { LiveArena } from "../arena/LiveArena";
import { IconButton } from "../IconButton";
import { NextMechanicIcon, ResetIcon } from "../icons";
import { LastAnswer } from "../LastAnswer";
import { KINDS, MechanicIcon } from "../MechanicIcon";
import { PromptBar } from "../PromptBar";
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

/** One try at a mechanic: the answers so far, and Show me. */
interface TryState {
  /** The try this state belongs to (`DrillScreenProps.tryKey`). */
  tryKey: string;
  results: StepResult[];
  status: StepStatus;
  /** Show me is on: the correct spot for the step asked shows in blue. */
  shown: boolean;
  /** Show me was used, so this try does not count in your score: it was learning, not a test. */
  helped: boolean;
  /** After the try: the step you review with the step chips, or null for the result. */
  at: number | null;
}

/** A try with no answers yet. */
const freshTry = (tryKey: string): TryState => ({
  tryKey,
  results: [],
  status: "ask",
  shown: false,
  helped: false,
  at: null,
});

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
  // The state of a try is kept with the try it belongs to. A new try reads fresh state from its
  // first draw, so the screen never draws a new mechanic with the last one's answers. The screen
  // is not given a key for a new try, so the list of mechanics stays where it is, under your pointer.
  const [saved, setSaved] = useState(() => freshTry(tryKey));
  const { results, status, shown, helped, at } = saved.tryKey === tryKey ? saved : freshTry(tryKey);
  /** Changes this try's state; a change names only the fields it sets. */
  const update = (change: Partial<TryState>): void => setSaved({ tryKey, results, status, shown, helped, at, ...change });
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
    update({ results: next, status: statusAfter(sc, next), shown: false });
    if (next.length >= sc.steps.length && !helped) onScore(next.every((x) => x.ok));
  }
  function handleShowMe(): void {
    // Show me makes the try a helped one, and Hide does not undo that.
    update({ shown: !shown, helped: helped || !shown });
  }
  const nextStep = (): void => update({ status: "ask" });
  /** After the try, the step chips show a step: the arena and the prompt bar as they were then. */
  const goToStep = (step: number): void => update({ at: step });
  /** Try from here: answer the step on screen and the ones after it again. The answers before it
      stay. A part of a try does not count in your score, as with Show me. */
  function handleTryFromHere(): void {
    if (at === null) return;
    update({ results: results.slice(0, at), status: "ask", shown: false, helped: true, at: null });
  }

  // Enter: Next step after an answer, or Next mechanic at the end. Enter on a button is its click.
  // After the try, the arrows go to the step before or after; from the result, to the last or the first.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!isPageKey(e)) return;
    if (done && multi && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const back = e.key === "ArrowLeft";
      const end = sc.steps.length - 1;
      goToStep(at === null ? (back ? end : 0) : Math.max(0, Math.min(end, at + (back ? -1 : 1))));
      return;
    }
    if (e.key !== "Enter") return;
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
  // Each state of the bar has its own key, so the bar is drawn new when the state changes: the
  // Reset you just clicked is a new button then, and its tooltip does not stay open over the arena.
  const nextMechanic = (
    <IconButton label="Next mechanic" variant="default" onClick={onNextMechanic}>
      <NextMechanicIcon aria-hidden="true" />
    </IconButton>
  );
  /** After the try, the step the chips show (its place and your answer), or null for the result. */
  const seen = done && at !== null ? { at, r: results[at] } : null;
  const hud = seen ? (
    <PromptBar
      key="review"
      tone={seen.r.ok ? "correct" : "incorrect"}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={handleTryFromHere}>
            Try from here
          </Button>
          {nextMechanic}
          {reset}
        </>
      }
    >
      {/* Short, beside three buttons: the step's answer shows in full under the chips. */}
      <p role="status">
        <span className="block">
          Step {seen.at + 1}/{sc.steps.length}
        </span>{" "}
        <span className="font-semibold">{seen.r.ok ? "Correct" : "Not there"}</span>
      </p>
    </PromptBar>
  ) : done ? (
    <PromptBar
      key="done"
      tone={allCorrect ? "correct" : "incorrect"}
      actions={
        <>
          {nextMechanic}
          {reset}
        </>
      }
    >
      <p className="font-semibold" role="status">
        {allCorrect ? (multi ? "All steps correct" : "Correct") : multi ? `${correct} of ${sc.steps.length} correct` : "Not there"}
      </p>
    </PromptBar>
  ) : status === "incorrect" && last ? (
    <PromptBar
      key="step"
      tone="incorrect"
      actions={
        <>
          <Button size="sm" onClick={nextStep}>
            Next step
          </Button>
          {reset}
        </>
      }
    >
      <p role="status">
        <span className="font-semibold">Not there.</span> {sc.steps[n - 1].a[0]}
      </p>
    </PromptBar>
  ) : (
    // Show me: the correct spot for this step, and its answer in place of the question. Your next
    // click still answers.
    <PromptBar
      key="ask"
      count={`${n + 1}/${sc.steps.length}`}
      actions={
        <>
          <Button size="sm" variant="outline" aria-pressed={shown} onClick={handleShowMe}>
            {shown ? "Hide" : "Show me"}
          </Button>
          {reset}
        </>
      }
    >
      <p className="font-medium">{shown ? sc.steps[n].a[0] : sc.steps[n].q}</p>
    </PromptBar>
  );

  const panel = (
    <section aria-label="The mechanic" className="space-y-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {item.phase} · {item.time}
        </p>
        <h2 className="font-display text-xl tracking-wide">{item.title}</h2>
      </div>
      {/* What you do, with the icon the list of mechanics shows for it: one badge per kind it can be. */}
      <div className="flex flex-wrap gap-1.5">
        {kindsOf(item).map((kind) => (
          <Badge key={kind}>
            <MechanicIcon kind={kind} soak={item.soak} />
            {KINDS[kind].name}
          </Badge>
        ))}
      </div>
      <SetupText lines={sc.setup} ordered={sc.ordered} />
      {/* During the try the chips only show how far you got; after it, they go to a step. */}
      {multi && <StepChips count={sc.steps.length} results={results} at={at ?? undefined} onPick={done ? goToStep : undefined} />}
      {/* Your answer goes under the chips: the last one, or the step the chips show. */}
      {seen ? <LastAnswer ok={seen.r.ok} answer={sc.steps[seen.at].a} /> : last && <LastAnswer ok={last.ok} answer={sc.steps[n - 1].a} />}
      {/* The rule says why the spot is correct: at the end, and with Show me, which gives where. */}
      {(done || shown) && <RuleBox rule={sc.rule} />}
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
          <div className="flex w-80 flex-col gap-3">
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
        // On a tall screen the list of mechanics runs on to the bottom of the screen.
        tallSides: true,
        className: "mx-0 ml-80 mr-80 min-w-0 flex-1",
      }
    : {
        // The prompt bar sticks to the top of the screen while you scroll down to the arena.
        bar: hud,
        over: <div className="pb-2">{panel}</div>,
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
        // A step under review: the arena as it was when you answered it, and no clicks.
        results={seen ? results.slice(0, seen.at + 1) : results}
        showLast={status !== "ask" || done}
        hint={shown && status !== "incorrect"}
        onPointClick={seen ? undefined : handleArenaClick}
        pickSpot={!seen}
        className="block h-auto w-full"
      />
    </ArenaFrame>
  );
  return wide ? <div className="flex justify-center">{arena}</div> : arena;
}
