import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { CASTS_AHEAD, CASTS_SOON, type CastMark, castPositions, castsAhead } from "../../lib/fight";
import { CATEGORY_BG } from "../CategoryDots";

/** Where the now mark sits from the top, the room under the line at the bottom, and how far apart
    two casts stay at least, in pixels. The app's choice. */
const NOW_Y = 40;
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
    between casts, and in their last seconds a square grows and its name turns bold.
    shadcn/ui has no timeline, so this list is its own: it moves through refs on every frame
    (useFightFrame), and draws through React only when a cast comes into view or leaves it. */
export function CastList({ className }: CastListProps) {
  const box = useRef<HTMLDivElement>(null);
  /** The rows by cast, for the frame loop to move. */
  const rows = useRef(new Map<number, HTMLLIElement>());
  const [marks, setMarks] = useState<CastMark[]>([]);

  useFightFrame((s) => {
    const now = castsAhead(s);
    // Draw again only when the casts in view change.
    setMarks((was) => (was.length === now.length && was.every((m, k) => m.i === now[k].i) ? was : now));
    const height = (box.current?.clientHeight ?? 0) - BOTTOM;
    const ys = castPositions(now, height, NOW_Y, ROW_H);
    now.forEach((m, k) => {
      const row = rows.current.get(m.i);
      if (!row) return;
      row.style.transform = `translateY(${ys[k].toFixed(1)}px) translateY(-50%)`;
      row.dataset.when = m.left < 0 ? "past" : m.left <= CASTS_SOON ? "soon" : "later";
      const secs = row.querySelector<HTMLElement>("[data-secs]");
      const text = m.left > 0 ? String(Math.ceil(m.left)) : "";
      if (secs && secs.textContent !== text) secs.textContent = text;
    });
  });

  return (
    // The play bar above it shows the fight time and the speed.
    <section aria-label="Casts coming up" className={cn("flex min-h-0 flex-col", className)}>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        {/* The line, the now mark at its top, and the ticks. They sit by the box's height, in CSS. */}
        <div className="absolute left-7 w-0.5 bg-border" style={{ top: NOW_Y, bottom: BOTTOM }} aria-hidden="true" />
        <div className="absolute left-3.5 z-10 h-1 w-8 rounded-full bg-destructive" style={{ top: NOW_Y - 2 }} aria-hidden="true" />
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
            <li
              key={m.i}
              ref={(el) => {
                if (el) rows.current.set(m.i, el);
                else rows.current.delete(m.i);
              }}
              className="group absolute top-0 right-2 left-3.5 flex items-center gap-2.5 text-sm data-[when=past]:opacity-40"
            >
              {/* The square on the line, in the category's colour, with the seconds inside. */}
              <span
                data-secs
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md font-display text-sm text-white tabular-nums shadow-sm ring-2 ring-card",
                  "group-data-[when=soon]:size-8 group-data-[when=soon]:text-base",
                  CATEGORY_BG[m.cats[0] ?? "none"],
                )}
              />
              <span className={cn("min-w-0 truncate rounded px-1 group-data-[when=soon]:font-semibold", m.raidwide && "bg-danger-soft")}>
                {m.name}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
