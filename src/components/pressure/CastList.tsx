import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { CASTS_SOON, type CastMark, castPositions, castsAhead } from "../../lib/fight";
import { clock } from "../../time";
import { CategoryDots } from "../CategoryDots";

/** Where the now line sits, and how far apart two casts stay at least, in pixels. The app's choice. */
const NOW_Y = 28;
const ROW_H = 26;

export interface CastListProps {
  speed: number;
  className?: string;
}

/** The casts coming up, scrolling up toward a "now" line as the fight clock runs: the gaps between
    them show the time between casts, the last seconds are bold, and a cast that just happened fades
    above the line. shadcn/ui has no timeline, and its ScrollArea is for content you scroll
    yourself, so this list is its own: it moves through refs on every frame (useFightFrame), and
    draws through React only when a cast comes into view or leaves it. */
export function CastList({ speed, className }: CastListProps) {
  const box = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  /** The rows by cast, for the frame loop to move. */
  const rows = useRef(new Map<number, HTMLLIElement>());
  const [marks, setMarks] = useState<CastMark[]>([]);

  useFightFrame((s) => {
    const now = castsAhead(s);
    // Draw again only when the casts in view change.
    setMarks((was) => (was.length === now.length && was.every((m, k) => m.i === now[k].i) ? was : now));
    const clockText = clock(s.t);
    if (time.current && time.current.textContent !== clockText) time.current.textContent = clockText;
    const height = box.current?.clientHeight ?? 0;
    const ys = castPositions(now, height, NOW_Y, ROW_H);
    now.forEach((m, k) => {
      const row = rows.current.get(m.i);
      if (!row) return;
      row.style.transform = `translateY(${ys[k].toFixed(1)}px) translateY(-50%)`;
      row.dataset.when = m.left < 0 ? "past" : m.left <= CASTS_SOON ? "soon" : "later";
      const left = row.querySelector<HTMLElement>("[data-left]");
      const text = m.left > 0 ? m.left.toFixed(1) : "";
      if (left && left.textContent !== text) left.textContent = text;
    });
  });

  return (
    <section aria-label="Casts coming up" className={cn("flex min-h-0 flex-col gap-2", className)}>
      <p className="flex gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Coming up</span>
        <span ref={time} className="tabular-nums" /> · {speed}x
      </p>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="absolute inset-x-0 z-10 h-0.5 bg-foreground" style={{ top: NOW_Y }} aria-hidden="true" />
        <span className="absolute right-2 z-10 text-xs text-muted-foreground" style={{ top: NOW_Y - 16 }} aria-hidden="true">
          now
        </span>
        <ol className="absolute inset-x-0 top-0">
          {marks.map((m) => (
            <li
              key={m.i}
              ref={(el) => {
                if (el) rows.current.set(m.i, el);
                else rows.current.delete(m.i);
              }}
              className={cn(
                "absolute inset-x-2 top-0 flex items-center gap-2 rounded px-1.5 py-0.5 text-sm",
                "data-[when=past]:opacity-40 data-[when=soon]:font-semibold",
                m.raidwide && "bg-danger-soft",
              )}
            >
              <CategoryDots cats={m.cats} />
              <span className="flex-1 truncate">{m.name}</span>
              <span data-left className="text-muted-foreground tabular-nums" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
