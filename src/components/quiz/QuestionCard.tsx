import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { LEARN_PICTURES } from "../../data/pictures";
import { timerOf } from "../../lib/pressure";
import type { Option, QuizItem, Slot } from "../../types";
import { shuffle } from "../../util";
import { LearnPicture } from "../arena/LearnPicture";
import { RuleBox } from "../RuleBox";
import { TimelinePicture, timelineRowOf } from "./TimelinePicture";
import { TimerBar } from "./TimerBar";

/** An answer as shown: its text and rightness, and `k`, its place in the question's own list,
    which its preview on the picture follows. */
type ShownOption = Option & { k: number };

export interface QuestionCardProps {
  item: QuizItem;
  slot: Slot;
  /** Pick an answer to see it on the picture, then lock it in (Learn). Without it, one click
      answers, which also trains fast choices in the timed round. */
  previewAnswers?: boolean;
  /** What goes above the question: the phase, the time, the card count and the way around. */
  top?: ReactNode;
  /** Called once, when you lock in an answer. */
  onAnswer: (ok: boolean) => void;
  /** Called when you go on to the next card. */
  onNext: () => void;
  /** A timed card (the quick round on Pressure): the seconds to decide, after the time to read. */
  decideSecs?: number;
  /** Called once, when the time runs out before an answer. */
  onTimeout?: () => void;
}

/** A multiple-choice card. A Learn card has an arena picture, and its answers show on the picture
    before you lock one in. A Timeline card has a picture of the fight timeline instead.
    Give it a `key` per card and slot, so each card starts fresh. */
export function QuestionCard({ item, slot, previewAnswers = false, top, onAnswer, onNext, decideSecs, onTimeout }: QuestionCardProps) {
  // TS note: a function passed to useState runs only on the first draw, so the answers are built
  // and shuffled once per card, not on every draw.
  const [q] = useState(() => item.build(slot));
  const [opts] = useState<ShownOption[]>(() => shuffle(q.options.map((o, k) => ({ ...o, k }))));
  const [pick, setPick] = useState<number | null>(null);
  /** The answer picked to see on the picture, not locked in yet. */
  const [sel, setSel] = useState<number | null>(null);
  /** The answer you point at or move to with Tab. It shows on the picture while you do. */
  const [hover, setHover] = useState<number | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  /** A timed card: its timer, made once, and whether the time ran out (too slow). */
  const [timer] = useState(() => (decideSecs ? timerOf([q.prompt, ...q.options.map((o) => o.t)], decideSecs) : null));
  const [slow, setSlow] = useState(false);

  const answered = pick !== null || slow;
  const fig = LEARN_PICTURES[item.id]?.(slot);
  const previews = previewAnswers && Boolean(fig?.options);
  const row = fig ? null : timelineRowOf(item);
  const rightName = q.options.find((o) => o.ok)?.t ?? "";
  const shown = hover ?? sel;
  const preview = !answered && shown !== null ? fig?.options?.[opts[shown].k] : undefined;

  function lockIn(i: number): void {
    if (answered) return;
    setPick(i);
    onAnswer(opts[i].ok === true);
  }
  function handleTimeout(): void {
    if (answered) return;
    setSlow(true);
    onTimeout?.();
  }
  function handleOptionClick(i: number): void {
    if (previews) setSel(i);
    else lockIn(i);
  }

  // After the answer, Next takes the focus, so Enter goes on.
  useEffect(() => {
    if (answered) next.current?.focus({ preventScroll: true });
  }, [answered]);

  // The keyboard: a number key picks an answer (or answers, without previews), and Enter locks in
  // the picked one or goes on to the next card. Enter on a button is that button's own click.
  // TS note: useEffectEvent makes a function that always sees the latest state, for the listener
  // below. The listener is then added once, not again after every draw.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";
    if (!answered && /^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i >= opts.length) return;
      e.preventDefault();
      if (previews) setSel(i);
      else lockIn(i);
    } else if (!answered && previews && e.key === "Enter" && sel !== null && !onButton) {
      e.preventDefault();
      lockIn(sel);
    } else if (answered && e.key === "Enter" && !onButton) {
      e.preventDefault();
      onNext();
    }
  });
  // The keys listen on the window, outside React, so an effect adds and removes the listener.
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const picture = fig ? (
    <figure>
      <LearnPicture
        fig={fig}
        answered={answered}
        preview={preview}
        label={
          answered
            ? "Arena picture. The green area shows the answer."
            : preview && shown !== null
              ? `Arena picture of answer ${shown + 1}.`
              : "Arena picture of the setup."
        }
        className="h-auto w-full"
      />
      {answered && fig.note && <figcaption className="mt-2 text-sm text-muted-foreground">{fig.note}</figcaption>}
    </figure>
  ) : row !== null ? (
    <TimelinePicture row={row} answered={answered} rightName={rightName} />
  ) : null;

  const okPick = pick !== null && opts[pick].ok === true;
  return (
    <div className="space-y-4 max-md:pb-20">
      {top}
      {timer && <TimerBar timer={timer} stopped={answered} onTimeout={handleTimeout} />}
      <h2 className="text-xl font-semibold text-balance">{q.prompt}</h2>
      <div className={cn("grid gap-6", picture && "md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]")}>
        {/* The picture sits beside the answers, on the right. On a phone it goes above them. */}
        {picture && <div className="md:order-last">{picture}</div>}
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="sr-only">Answers</legend>
            {opts.map((o, i) => (
              <AnswerButton
                key={o.t}
                n={i + 1}
                text={o.t}
                state={!answered ? (previews && sel === i ? "picked" : "open") : o.ok ? "right" : i === pick ? "wrong" : "other"}
                why={answered && o.ok ? q.why : undefined}
                pressed={previews && !answered ? sel === i : undefined}
                onClick={() => handleOptionClick(i)}
                onPoint={(on) => previews && !answered && setHover(on ? i : null)}
              />
            ))}
          </fieldset>

          {answered ? (
            <>
              <p className={cn(slow ? "font-medium text-amber-700" : "sr-only")} role="status">
                {slow ? "Too slow: the time ran out." : okPick ? "Right." : "Not this one."}
              </p>
              <RuleBox rule={q.rule} />
              {q.src && <p className="text-xs text-muted-foreground">Source: {q.src}</p>}
              <ActionBar>
                <Button ref={next} onClick={onNext}>
                  Next
                </Button>
                <KeyHint>
                  <Kbd>Enter</Kbd> next
                </KeyHint>
              </ActionBar>
            </>
          ) : previews ? (
            // On a phone the answers sit under the picture, so Lock in stays in a bar at the bottom.
            <ActionBar pinned={sel !== null}>
              <Button disabled={sel === null} onClick={() => sel !== null && lockIn(sel)}>
                Lock in answer
              </Button>
              <p className="text-sm text-muted-foreground">
                Pick an answer to see it on the picture.
                <KeyHint>
                  {" "}
                  <Kbd>1</Kbd> to <Kbd>{opts.length}</Kbd> pick, <Kbd>Enter</Kbd> lock in.
                </KeyHint>
              </p>
            </ActionBar>
          ) : (
            <KeyHint>
              Press <Kbd>1</Kbd> to <Kbd>{opts.length}</Kbd> or click an answer.
            </KeyHint>
          )}
        </div>
      </div>
    </div>
  );
}

type AnswerState = "open" | "picked" | "right" | "wrong" | "other";

interface AnswerButtonProps {
  n: number;
  text: string;
  state: AnswerState;
  /** The explanation, under the right answer after you answer. */
  why?: string;
  /** For a Learn card before the answer: true when this answer is the picked one. */
  pressed?: boolean;
  onClick: () => void;
  /** Called with true when you point at the answer or move to it with Tab, false when you leave. */
  onPoint: (on: boolean) => void;
}

/** One answer: its number key, its text, and after the answer, whether it was right. */
function AnswerButton({ n, text, state, why, pressed, onClick, onPoint }: AnswerButtonProps) {
  const done = state === "right" || state === "wrong" || state === "other";
  return (
    <Button
      variant="outline"
      aria-pressed={pressed}
      disabled={done}
      onClick={onClick}
      onMouseEnter={() => onPoint(true)}
      onMouseLeave={() => onPoint(false)}
      onFocus={() => onPoint(true)}
      onBlur={() => onPoint(false)}
      className={cn(
        "h-auto w-full items-start justify-start gap-3 py-2 text-left whitespace-normal disabled:opacity-100",
        state === "picked" && "border-primary ring-2 ring-primary",
        state === "right" && "border-green-600 bg-green-50",
        state === "wrong" && "border-destructive bg-red-50",
        state === "other" && "opacity-60",
      )}
    >
      <Badge variant="secondary" className="font-mono">
        {n}
      </Badge>
      <span className="space-y-1">
        <span className="block">
          {text}
          {state === "wrong" && (
            <Badge variant="destructive" className="ml-2">
              Your pick
            </Badge>
          )}
        </span>
        {why && (
          <span className="block font-normal text-muted-foreground">
            <span className="font-semibold text-green-700">Right answer.</span> {why}
          </span>
        )}
      </span>
    </Button>
  );
}

interface ActionBarProps {
  children: ReactNode;
  /** On a phone, keep the bar at the bottom of the screen. */
  pinned?: boolean;
}

/** The row of actions under the answers. */
function ActionBar({ children, pinned = true }: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        // Fixed to the screen, not sticky: the answers sit below the picture, so a sticky bar would
        // stay inside their column, off screen.
        pinned && "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-10 max-md:border-t max-md:bg-background max-md:px-4 max-md:py-3",
      )}
    >
      {children}
    </div>
  );
}

interface KeyHintProps {
  children: ReactNode;
}

/** A hint about keyboard keys. It hides on a touch screen, where there is no keyboard. */
function KeyHint({ children }: KeyHintProps) {
  return <span className="text-sm text-muted-foreground pointer-coarse:hidden">{children}</span>;
}
