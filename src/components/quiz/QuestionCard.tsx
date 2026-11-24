import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LEARN_PICTURES } from "../../data/pictures";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { timerOf } from "../../lib/pressure";
import type { Option, QuizItem, Slot } from "../../types";
import { shuffle } from "../../util";
import { ArenaFrame } from "../arena/ArenaFrame";
import { LearnPicture } from "../arena/LearnPicture";
import { PromptBar } from "../PromptBar";
import { RuleBox } from "../RuleBox";
import { StickyBar } from "../StickyBar";
import { AnswerButton } from "./AnswerButton";
import { TimelinePicture, timelineRowOf } from "./TimelinePicture";
import { TimerBar } from "./TimerBar";

/** An answer as shown: its text and correctness, and `k`, its place in the question's own list,
    which its preview on the picture follows. */
type ShownOption = Option & { k: number };

/** A wide screen (lg, 1024 px and up): a card with an arena picture has the layout of Practice. */
const WIDE = "(min-width: 1024px)";

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
  const correct = useRef<HTMLButtonElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  /** A timed card: its timer, made once, and whether the time ran out (you froze). */
  const [timer] = useState(() => (decideSecs ? timerOf([q.prompt, ...q.options.map((o) => o.t)], decideSecs) : null));
  const [slow, setSlow] = useState(false);

  const answered = pick !== null || slow;
  const fig = LEARN_PICTURES[item.id]?.(slot);
  const previews = previewAnswers && Boolean(fig?.options);
  const row = fig ? null : timelineRowOf(item);
  const correctName = q.options.find((o) => o.ok)?.t ?? "";
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

  // After the answer, Next takes the focus, so Enter goes on, and what changed scrolls into view.
  // On a wide screen the rule sits under the prompt bar, always in view, and the answers scroll in
  // their own column, so the correct answer, with its explanation, scrolls into view there. On a
  // narrow screen the rule sits over the answers, under the sticky bar: it scrolls into view.
  useEffect(() => {
    if (!answered) return;
    next.current?.focus({ preventScroll: true });
    if (window.matchMedia(WIDE).matches) correct.current?.scrollIntoView({ block: "nearest" });
    else rule.current?.scrollIntoView({ block: "nearest" });
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

  /** A wide screen (lg, 1024 px and up): a card with an arena picture has the layout of Practice. */
  const wide = useMediaQuery(WIDE);
  const pictureLabel = answered
    ? "Arena picture. The green area shows the answer."
    : preview && shown !== null
      ? `Arena picture of answer ${shown + 1}.`
      : "Arena picture of the setup.";
  const arena = fig && <LearnPicture fig={fig} answered={answered} preview={preview} label={pictureLabel} className="h-auto w-full" />;
  const note = answered && fig?.note;

  const okPick = pick !== null && opts[pick].ok === true;
  /** The prompt bar: the question with Lock in, then how the answer went with Next. */
  const bar = (
    <PromptBar
      tone={!answered ? "ask" : okPick ? "correct" : "incorrect"}
      actions={
        answered ? (
          <Button ref={next} size="sm" onClick={onNext}>
            Next
          </Button>
        ) : (
          previews && (
            <Button size="sm" disabled={sel === null} onClick={() => sel !== null && lockIn(sel)}>
              Lock In
            </Button>
          )
        )
      }
    >
      {answered && (
        <p className="font-semibold" role="status">
          {slow ? "Froze: the time ran out." : okPick ? "Correct." : "Not this one."}
        </p>
      )}
      <h2 className={cn("text-balance", answered ? "text-muted-foreground" : "text-base font-semibold")}>{q.prompt}</h2>
    </PromptBar>
  );
  const choices = (
    <fieldset className="space-y-2">
      <legend className="sr-only">Answers</legend>
      {opts.map((o, i) => (
        <AnswerButton
          key={o.t}
          ref={o.ok ? correct : undefined}
          n={i + 1}
          text={o.t}
          state={!answered ? (previews && sel === i ? "picked" : "open") : o.ok ? "correct" : i === pick ? "incorrect" : "other"}
          why={answered && o.ok ? q.why : undefined}
          pressed={previews && !answered ? sel === i : undefined}
          onClick={() => handleOptionClick(i)}
          onPoint={(on) => previews && !answered && setHover(on ? i : null)}
        />
      ))}
    </fieldset>
  );
  /** After the answer: the rule and the source. */
  const feedback = answered && (
    <>
      <RuleBox ref={rule} rule={q.rule} />
      {q.src && <p className="text-xs text-muted-foreground">Source: {q.src}</p>}
    </>
  );
  /** The keys, under the answers. They hide on a touch screen. */
  const keys = answered ? (
    <KeyHint>
      <Kbd>Enter</Kbd> next
    </KeyHint>
  ) : previews ? (
    <p className="text-sm text-muted-foreground">
      Pick an answer to see it on the picture, then Lock in.
      <KeyHint>
        {" "}
        <Kbd>1</Kbd> to <Kbd>{opts.length}</Kbd> pick, <Kbd>Enter</Kbd> lock in.
      </KeyHint>
    </p>
  ) : (
    <KeyHint>
      Press <Kbd>1</Kbd> to <Kbd>{opts.length}</Kbd> or click an answer.
    </KeyHint>
  );
  // After the answer the rule comes first, over the answers, so it is the first thing you see.
  const answers = (
    <div className="space-y-4">
      {feedback}
      {choices}
      {keys}
    </div>
  );

  // A wide screen, with an arena picture: a column against the arena's floor, lined up with its
  // top, as on Practice, running on to the bottom of a tall screen. The prompt bar sits at its
  // top, where Practice has its bar, and after the answer the rule sits under it, so both are
  // always in view; the answers scroll under them. The arena gets the height the question took
  // above it.
  if (wide && arena) {
    return (
      <div className="space-y-4">
        {top}
        {timer && <TimerBar timer={timer} stopped={answered} onTimeout={handleTimeout} />}
        <div className="flex justify-center">
          <ArenaFrame
            before={
              <div className="flex w-80 flex-col gap-4">
                {bar}
                {feedback}
                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-4">
                    {choices}
                    {keys}
                    {note && <p className="text-sm text-muted-foreground">{note}</p>}
                  </div>
                </ScrollArea>
              </div>
            }
            tallSides
            className="mx-0 ml-80 min-w-0 flex-1"
          >
            <figure>{arena}</figure>
          </ArenaFrame>
        </div>
      </div>
    );
  }

  const picture = arena ? (
    <figure>
      <ArenaFrame>{arena}</ArenaFrame>
      {note && <figcaption className="mt-2 text-sm text-muted-foreground">{note}</figcaption>}
    </figure>
  ) : row !== null ? (
    <TimelinePicture row={row} answered={answered} correctName={correctName} />
  ) : null;

  // The card's box holds the whole card, so the prompt bar sticks to the top of the screen until
  // you have scrolled past all of it.
  return (
    <div className="space-y-4">
      {top}
      {timer && <TimerBar timer={timer} stopped={answered} onTimeout={handleTimeout} />}
      <StickyBar>{bar}</StickyBar>
      {/* A Learn card's arena picture gets the wide column; a Timeline card's picture the narrow one. */}
      <div
        className={cn(
          "grid gap-6",
          fig ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" : row !== null && "md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]",
        )}
      >
        {/* The picture sits beside the answers, on the right. On a phone it goes above them. */}
        {picture && <div className="md:order-last">{picture}</div>}
        {answers}
      </div>
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
