import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { CASTS_AHEAD, CASTS_PAST, CASTS_SOON, type CastMark, castPositions, castsAhead } from "../../lib/fight";
import { CATEGORY_BG } from "../CategoryDots";

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
    and its name wrapped under it; the casts slide left toward the now mark as the fight clock
    runs, and a cast that went off fades out past it. It moves through refs on every frame
    (useFightFrame), and draws through React only when a cast comes into view or leaves it. */
export function CastStrip({ className }: CastStripProps) {
  const box = useRef<HTMLDivElement>(null);
  /** The items by cast, for the frame loop to move. */
  const items = useRef(new Map<number, HTMLLIElement>());
  const [marks, setMarks] = useState<CastMark[]>([]);

  useFightFrame((s) => {
    const now = castsAhead(s);
    // Draw again only when the casts in view change.
    setMarks((was) => (was.length === now.length && was.every((m, k) => m.i === now[k].i) ? was : now));
    const width = (box.current?.clientWidth ?? 0) - END;
    const xs = castPositions(now, width, NOW_X, ITEM_W);
    now.forEach((m, k) => {
      const item = items.current.get(m.i);
      if (!item) return;
      item.style.transform = `translateX(${xs[k].toFixed(1)}px) translateX(-50%)`;
      item.dataset.when = m.left < 0 ? "past" : m.left <= CASTS_SOON ? "soon" : "later";
      // A cast that went off fades out as it slides past the now mark.
      item.style.opacity = m.left < 0 ? String(Math.max(0, 1 + m.left / CASTS_PAST) * 0.6) : "";
      const secs = item.querySelector<HTMLElement>("[data-secs]");
      const text = m.left > 0 ? String(Math.ceil(m.left)) : "";
      if (secs && secs.textContent !== text) secs.textContent = text;
    });
  });

  return (
    <section aria-label="Casts coming up" className={className}>
      <div ref={box} className="relative h-24 overflow-hidden rounded-lg border bg-card">
        {/* The line through the squares, the now mark across it, and the ticks under it. */}
        <div className="absolute top-5.5 h-0.5 bg-border" style={{ left: NOW_X - BEFORE_NOW, right: END }} aria-hidden="true" />
        <div
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
            <li
              key={m.i}
              ref={(el) => {
                if (el) items.current.set(m.i, el);
                else items.current.delete(m.i);
              }}
              className="group absolute top-2 left-0 flex w-18 flex-col items-center gap-1 text-xs"
            >
              {/* The square on the line, in the category's colour, with the seconds inside. */}
              <span
                data-secs
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md font-display text-sm text-white tabular-nums shadow-sm ring-2 ring-card",
                  CATEGORY_BG[m.cats[0] ?? "none"],
                )}
              />
              <span
                className={cn(
                  "line-clamp-2 rounded px-0.5 text-center leading-tight group-data-[when=soon]:font-semibold",
                  m.raidwide && "bg-danger-soft",
                )}
              >
                {m.name}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
