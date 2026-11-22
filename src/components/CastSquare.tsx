import { cn } from "@/lib/utils";
import type { Category } from "../data/abilities";
import type { DrillKind } from "../types";
import { CATEGORY_BG, CATEGORY_BORDER } from "./CategoryDots";
import { KINDS, MechanicIcon } from "./MechanicIcon";

export interface CastSquareProps {
  /** The row's categories (the first one colours the square), whether it is the boss's own cast,
      or, for a Practice mechanic, what you do in it. */
  mark: { cats: readonly Category[]; cast?: boolean; kind?: DrillKind; soak?: number };
  className?: string;
}

/** A row's square on a line of the fight, in its category's colour. In the casts coming up, it has
    its seconds to go inside (written by useCastTimeline into [data-secs]). A hit, when damage
    goes off, is filled; the boss's own cast, which starts a mechanic, is only outlined. A
    Practice mechanic is filled in the theme's ink, with the icon of what you do in it; point at it
    for the name. */
export function CastSquare({ mark, className }: CastSquareProps) {
  const cat = mark.cats[0] ?? "none";
  return (
    <span
      data-secs
      className={cn(
        // A size change (the last seconds of a cast) eases in rather than snapping.
        "flex size-7 shrink-0 items-center justify-center rounded-md font-display text-sm tabular-nums ring-2 ring-card",
        "transition-[width,height,font-size] duration-300 ease-out motion-reduce:transition-none",
        mark.kind
          ? "bg-primary text-primary-foreground shadow-sm"
          : mark.cast
            ? cn("border-2 border-dashed bg-card text-foreground", CATEGORY_BORDER[cat])
            : cn("text-white shadow-sm", CATEGORY_BG[cat]),
        className,
      )}
      title={mark.kind && KINDS[mark.kind].name}
    >
      {mark.kind && <MechanicIcon kind={mark.kind} soak={mark.soak} className="size-6" countClassName="text-count" />}
    </span>
  );
}
