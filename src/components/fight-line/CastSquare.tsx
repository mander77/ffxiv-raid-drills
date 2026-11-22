import { cn } from "@/lib/utils";
import type { Category } from "../../data/abilities";
import { CATEGORY_BG, CATEGORY_BORDER } from "../CategoryDots";

export interface CastSquareProps {
  /** The row's categories (the first one colours the square), whether it is the boss's own cast,
      and whether it is a Practice mechanic. */
  mark: { cats: readonly Category[]; cast?: boolean; drill?: string };
  className?: string;
}

/** A row's square on the fight line, in its category's colour. On the line that moves, it has
    its seconds to go inside (written by useCastTimeline into [data-secs]). A hit, when damage
    goes off, is filled; the boss's own cast, which starts a mechanic, is only outlined. A
    Practice mechanic is filled in the theme's ink. */
export function CastSquare({ mark, className }: CastSquareProps) {
  const cat = mark.cats[0] ?? "none";
  return (
    <span
      data-secs
      className={cn(
        // A size change (the last seconds of a cast) eases in rather than snapping.
        "flex size-7 shrink-0 items-center justify-center rounded-md font-display text-sm tabular-nums ring-2 ring-card",
        "transition-[width,height,font-size] duration-300 ease-out motion-reduce:transition-none",
        mark.drill
          ? "bg-primary shadow-sm"
          : mark.cast
            ? cn("border-2 border-dashed bg-card text-foreground", CATEGORY_BORDER[cat])
            : cn("text-white shadow-sm", CATEGORY_BG[cat]),
        className,
      )}
    />
  );
}
