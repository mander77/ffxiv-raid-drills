import { cn } from "@/lib/utils";
import { useCastTimeline } from "../../hooks/useCastTimeline";
import { CASTS_AHEAD } from "../../lib/fight";
import { CastKey } from "./CastKey";
import { CastSquare } from "./CastSquare";

/** Where the now mark sits from the left, how far the line goes on before it, the room after the
    line at the right, and how far apart two casts stay at least, in pixels. The app's choice. */
const NOW_X = 56;
const BEFORE_NOW = 40;
const END = 12;
const ITEM_W = 76;
/** The seconds marked on the line. The app's choice. */
const TICKS = [5, 10, 20] as const;

export interface CastStripProps {
  className?: string;
}

/** The casts coming up, sideways, for a screen with no room beside the arena: the same line as
    CastList, lying down. Each cast is a square in its category's colour with its seconds inside
    and its name wrapped under it; in its last seconds the square grows. The casts slide left
    toward the now mark as the fight clock runs, and a cast that went off fades out past it.
    useCastTimeline moves it. */
export function CastStrip({ className }: CastStripProps) {
  const { box, nowMark, marks, itemRef } = useCastTimeline({ axis: "x", nowAt: NOW_X, end: END, gap: ITEM_W });

  return (
    <section aria-label="Casts coming up" className={className}>
      <div ref={box} className="relative h-24 overflow-hidden rounded-lg border bg-card">
        {/* The line through the squares, the now mark across it, and the ticks under it. */}
        <div className="absolute top-5.5 h-0.5 bg-border" style={{ left: NOW_X - BEFORE_NOW, right: END }} aria-hidden="true" />
        <div
          ref={nowMark}
          className="absolute top-2 z-10 h-8 w-1 -translate-x-1/2 rounded-full bg-destructive"
          style={{ left: NOW_X }}
          aria-hidden="true"
        />
        {TICKS.map((sec) => (
          <div
            key={sec}
            className="absolute bottom-0.5 -translate-x-1/2 text-[10px] text-muted-foreground"
            style={{ left: `calc(${NOW_X}px + (100% - ${NOW_X + END}px) * ${sec / CASTS_AHEAD})` }}
            aria-hidden="true"
          >
            {sec}
          </div>
        ))}
        <ol className="absolute inset-y-0 left-0">
          {marks.map((m) => (
            <li key={m.i} ref={itemRef(m.i)} className="group absolute top-1.5 left-0 flex w-18 flex-col items-center gap-1 text-xs">
              {/* The square on the line, with the seconds inside: filled for a hit, outlined for a cast.
                  It grows in its last seconds, as in CastList, inside a slot of its largest size, so
                  it stays on the line and the name under it does not move. */}
              <span className="flex size-8 items-center justify-center">
                <CastSquare
                  mark={m}
                  className="group-data-[when=past]:size-8 group-data-[when=past]:text-base group-data-[when=soon]:size-8 group-data-[when=soon]:text-base"
                />
              </span>
              <span
                className={cn(
                  "line-clamp-2 rounded px-0.5 text-center leading-tight",
                  m.cast ? "text-muted-foreground" : "font-semibold",
                  m.raidwide && "bg-danger-soft",
                )}
              >
                {m.name}
              </span>
            </li>
          ))}
        </ol>
        <CastKey className="absolute right-2 bottom-0.5 rounded bg-card/90 px-1" />
      </div>
    </section>
  );
}
