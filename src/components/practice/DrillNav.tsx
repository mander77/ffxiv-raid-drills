import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Drill } from "../../types";
import { ChipRow } from "../ChipRow";

export interface DrillNavProps {
  items: readonly Drill[];
  /** The place of the mechanic on screen in the list. */
  i: number;
  className?: string;
}

/** In place of the list on a narrow screen: the mechanic, Back and Next, and one chip for each
    phase that opens the first mechanic of that phase. */
export function DrillNav({ items, i, className }: DrillNavProps) {
  const m = items[i];
  // TS note: flatMap with [] or [x] keeps only the mechanics where a new phase starts.
  const starts = items.flatMap((x, k) => (k === 0 || x.phase !== items[k - 1].phase ? [x] : []));
  return (
    <nav aria-label="Mechanics" className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {m.phase} · {i + 1} of {items.length}
          </p>
          <p className="font-semibold">{m.title}</p>
        </div>
        <div className="flex gap-2">
          {/* TS note: asChild hands the button's look to the link inside it (a shadcn/ui pattern). A link
              cannot be disabled, so the first and last are marked aria-disabled and take no clicks. */}
          <Button variant="outline" size="sm" asChild className="aria-disabled:pointer-events-none aria-disabled:opacity-50">
            <Link to={`/practice/${items[Math.max(0, i - 1)].id}`} aria-label="Back in the list" aria-disabled={i <= 0}>
              <ChevronLeft aria-hidden="true" />
              Back
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="aria-disabled:pointer-events-none aria-disabled:opacity-50">
            <Link
              to={`/practice/${items[Math.min(items.length - 1, i + 1)].id}`}
              aria-label="Next in the list"
              aria-disabled={i >= items.length - 1}
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <ChipRow label="Go to a phase">
        {starts.map((x) => {
          const on = x.phase === m.phase;
          return (
            <Button key={x.id} variant={on ? "default" : "outline"} size="sm" className="shrink-0 rounded-full" asChild>
              <Link to={`/practice/${x.id}`} title={x.phase} aria-current={on ? "true" : undefined}>
                Phase {x.phase.match(/\d+/)?.[0] ?? ""}
              </Link>
            </Button>
          );
        })}
      </ChipRow>
    </nav>
  );
}
