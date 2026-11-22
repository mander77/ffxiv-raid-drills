import { Badge } from "@/components/ui/badge";
import { CorrectIcon, IncorrectIcon } from "./icons";

export interface StepChipsProps {
  /** How many steps the mechanic has. */
  count: number;
  /** The steps answered so far, in order. The step after them is the one you are on. */
  results: readonly { ok: boolean }[];
}

/** One chip per step of a mechanic: a tick or a cross for an answered step, and the step you are
    on filled in. */
export function StepChips({ count, results }: StepChipsProps) {
  const now = results.length;
  return (
    <ol aria-label="Steps" className="flex flex-wrap gap-1.5">
      {/* TS note: Array.from({length: n}, fn) makes an array of n items from fn(_, index), like
          Enumerable.Range(0, n).Select(...) in C#. */}
      {Array.from({ length: count }, (_x, i) => {
        const r = results[i];
        const label = `Step ${i + 1}${r ? (r.ok ? ", correct" : ", incorrect") : i === now ? ", now" : ""}`;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are numbered by their place.
          <li key={i} aria-label={label}>
            <Badge variant={r ? (r.ok ? "secondary" : "destructive") : i === now ? "default" : "outline"}>
              {i + 1}
              {r && (r.ok ? <CorrectIcon aria-hidden="true" /> : <IncorrectIcon aria-hidden="true" />)}
            </Badge>
          </li>
        );
      })}
    </ol>
  );
}
