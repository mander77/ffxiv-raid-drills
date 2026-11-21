import { cn } from "@/lib/utils";
import type { CastMark } from "../../lib/fight";
import { CATEGORY_BG, CATEGORY_BORDER } from "../CategoryDots";

export interface CastSquareProps {
  mark: CastMark;
  className?: string;
}

/** A cast's square on the timeline of the casts coming up, in its category's colour, with its
    seconds to go inside (written by useCastTimeline into [data-secs]). A hit, when damage goes
    off, is filled; the boss's own cast, which starts a mechanic, is only outlined. */
export function CastSquare({ mark, className }: CastSquareProps) {
  const cat = mark.cats[0] ?? "none";
  return (
    <span
      data-secs
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md font-display text-sm tabular-nums ring-2 ring-card",
        mark.cast
          ? cn("border-2 border-dashed bg-card text-foreground", CATEGORY_BORDER[cat])
          : cn("text-white shadow-sm", CATEGORY_BG[cat]),
        className,
      )}
    />
  );
}
