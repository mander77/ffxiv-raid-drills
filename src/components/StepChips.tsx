import { type KeyboardEvent, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CorrectIcon, IncorrectIcon } from "./icons";

export interface StepChipsProps {
  /** How many steps the mechanic has. */
  count: number;
  /** The steps answered so far, in order. */
  results: readonly { ok: boolean }[];
  /** In review: the step on screen, marked with a ring. */
  at?: number;
  /** Go to a step. Given, the chips are buttons (review); left out, they only show progress. */
  onPick?: (i: number) => void;
}

/** One chip per step of a mechanic: a check or a cross for an answered step. While the site tests
    you, the chips are badges and the step you are on is filled in. In review (with onPick), they
    are buttons: a click, or the arrow keys on a chip, goes to that step. */
export function StepChips({ count, results, at, onPick }: StepChipsProps) {
  const now = results.length;
  const list = useRef<HTMLOListElement>(null);
  /** The arrow keys on a chip go to the step before or after, and take the focus with them. */
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number): void {
    const j = e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowRight" ? i + 1 : -1;
    if (!onPick || j < 0 || j >= count) return;
    e.preventDefault();
    onPick(j);
    list.current?.querySelectorAll("button")[j]?.focus();
  }
  return (
    <ol ref={list} aria-label="Steps" className="flex flex-wrap gap-1.5">
      {/* TS note: Array.from({length: n}, fn) makes an array of n items from fn(_, index), like
          Enumerable.Range(0, n).Select(...) in C#. */}
      {Array.from({ length: count }, (_x, i) => {
        const r = results[i];
        const result = r ? (r.ok ? ", correct" : ", incorrect") : "";
        const icon = r && (r.ok ? <CorrectIcon aria-hidden="true" /> : <IncorrectIcon aria-hidden="true" />);
        return onPick ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are numbered by their place.
          <li key={i}>
            <Button
              size="sm"
              variant={r ? (r.ok ? "correct" : "incorrect") : "outline"}
              // The step on screen gets a ring, apart from its check or cross.
              className={cn("rounded-full", i === at && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
              aria-label={`Step ${i + 1}${result}`}
              aria-current={i === at ? "step" : undefined}
              onClick={() => onPick(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            >
              {i + 1}
              {icon}
            </Button>
          </li>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are numbered by their place.
          <li key={i} aria-label={`Step ${i + 1}${result || (i === now ? ", now" : "")}`}>
            <Badge variant={r ? (r.ok ? "secondary" : "destructive") : i === now ? "default" : "outline"}>
              {i + 1}
              {icon}
            </Badge>
          </li>
        );
      })}
    </ol>
  );
}
