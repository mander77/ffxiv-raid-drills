import type { Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Where an answer stands: open to pick, picked (a Learn card before Lock in), and after the
    answer, correct, your incorrect pick, or one of the others. */
export type AnswerState = "open" | "picked" | "correct" | "incorrect" | "other";

export interface AnswerButtonProps {
  n: number;
  text: string;
  state: AnswerState;
  /** The explanation, under the correct answer after you answer. */
  why?: string;
  /** For a Learn card before the answer: true when this answer is the picked one. */
  pressed?: boolean;
  onClick: () => void;
  /** Called with true when you point at the answer or move to it with Tab, false when you leave. */
  onPoint: (on: boolean) => void;
  /** The button's element, for the card to scroll it into view. */
  // TS note: Ref<T> is anything React accepts as a ref: an object from useRef, or a function. In
  // React 19 a component takes `ref` as a plain prop.
  ref?: Ref<HTMLButtonElement>;
}

/** One answer on a question card: its number key, its text, and after the answer, whether it was
    correct. */
export function AnswerButton({ n, text, state, why, pressed, onClick, onPoint, ref }: AnswerButtonProps) {
  const done = state === "correct" || state === "incorrect" || state === "other";
  return (
    <Button
      ref={ref}
      variant={state === "correct" || state === "incorrect" ? state : "outline"}
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
        state === "other" && "opacity-60",
      )}
    >
      <Badge variant="secondary" className="font-mono">
        {n}
      </Badge>
      <span className="space-y-1">
        <span className="block">
          {text}
          {state === "incorrect" && (
            <Badge variant="destructive" className="ml-2">
              Your pick
            </Badge>
          )}
        </span>
        {why && (
          <span className="block font-normal text-muted-foreground">
            <span className="font-semibold text-success-foreground">Correct answer.</span> {why}
          </span>
        )}
      </span>
    </Button>
  );
}
