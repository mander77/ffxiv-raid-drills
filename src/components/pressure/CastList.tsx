import { cn } from "@/lib/utils";
import { useCastTimeline } from "../../hooks/useCastTimeline";
import { CASTS_AHEAD } from "../../lib/fight";
import { CastKey } from "./CastKey";
import { CastSquare } from "./CastSquare";

/** Where the now mark sits from the top, how far the line goes on above it, the room under the
    line at the bottom, and how far apart two casts stay at least, in pixels. The app's choice. */
const NOW_Y = 56;
const ABOVE_NOW = 40;
const BOTTOM = 12;
const ROW_H = 36;
/** The seconds marked on the line. The app's choice. */
const TICKS = [5, 10, 20] as const;

export interface CastListProps {
  className?: string;
}

/** The casts coming up, in the style of WoW's boss ability timeline: a line with each cast as a
    square in its category's colour, its seconds inside, and its name beside it. The squares rise
    toward the now mark at the top as the fight clock runs; the gaps between them show the time
    between casts, and in their last seconds a square grows. A hit (damage going off) is a filled
    square with its name in bold; the boss's own cast, which starts a mechanic, is outlined (CastSquare).
    shadcn/ui has no timeline, so this list is its own; useCastTimeline moves it. */
export function CastList({ className }: CastListProps) {
  const { box, nowMark, marks, itemRef } = useCastTimeline({ axis: "y", nowAt: NOW_Y, end: BOTTOM, gap: ROW_H });

  return (
    // The play bar above it shows the fight time and the speed.
    <section aria-label="Casts coming up" className={cn("flex min-h-0 flex-col", className)}>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        {/* The line, the now mark at its top, and the ticks. They sit by the box's height, in CSS. */}
        <div className="absolute left-7 w-0.5 bg-border" style={{ top: NOW_Y - ABOVE_NOW, bottom: BOTTOM }} aria-hidden="true" />
        <div
          ref={nowMark}
          className="absolute left-3.5 z-10 h-1 w-8 rounded-full bg-destructive"
          style={{ top: NOW_Y - 2 }}
          aria-hidden="true"
        />
        {TICKS.map((sec) => (
          <div
            key={sec}
            className="absolute left-0 flex w-9 -translate-y-1/2 items-center justify-end gap-0.5 text-[10px] text-muted-foreground"
            style={{ top: `calc(${NOW_Y}px + (100% - ${NOW_Y + BOTTOM}px) * ${sec / CASTS_AHEAD})` }}
            aria-hidden="true"
          >
            {sec}
            <span className="h-0.5 w-2 bg-border" />
          </div>
        ))}
        <ol className="absolute inset-x-0 top-0">
          {marks.map((m) => (
            <li key={m.i} ref={itemRef(m.i)} className="group absolute top-0 right-2 left-3.5 flex items-center gap-2.5 text-sm">
              {/* The square on the line, with the seconds inside: filled for a hit, outlined for a cast. */}
              <CastSquare mark={m} className="group-data-[when=soon]:size-8 group-data-[when=soon]:text-base" />
              <span
                className={cn(
                  "min-w-0 truncate rounded px-1",
                  m.cast ? "text-muted-foreground" : "font-semibold",
                  m.raidwide && "bg-danger-soft",
                )}
              >
                {m.name}
              </span>
            </li>
          ))}
        </ol>
        <CastKey className="absolute right-2 bottom-1.5 rounded bg-card/90 px-1" />
      </div>
    </section>
  );
}
