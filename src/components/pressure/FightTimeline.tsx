import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { type TimelineRow, timelineOf } from "../../lib/fight";
import { CategoryDots } from "../CategoryDots";

/** The look of a row: the line that just happened, a line in its last seconds, and the rest. */
const ROW_LOOK: Record<TimelineRow["look"], string> = {
  now: "border-primary font-semibold",
  soon: "border-warning",
  later: "",
};

/** The fight timeline, like cactbot's: the next lines, each with a bar that fills as it comes
    closer. The seconds change ten times a second, so the list draws again each frame that its
    text changes; the bars are part of that text. */
export function FightTimeline() {
  const [tl, setTl] = useState<{ rows: TimelineRow[]; idle: string; key: string }>({ rows: [], idle: "", key: "" });
  useFightFrame((s) => {
    const next = timelineOf(s);
    // The rows change only when a line's seconds (to a tenth) or look change.
    const key = next.rows.map((r) => `${r.name}:${r.left}:${r.look}`).join("|") || next.idle;
    setTl((was) => (was.key === key ? was : { ...next, key }));
  });
  return (
    <ol aria-label="Fight timeline" className="space-y-1 text-sm">
      {tl.rows.length ? (
        tl.rows.map((r, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a line's name can come twice, so its place in the list is its key.
            key={i}
            className={cn("relative overflow-hidden rounded-md border bg-card", ROW_LOOK[r.look], r.raidwide && "bg-danger-soft")}
          >
            <div className="absolute inset-y-0 left-0 bg-muted" style={{ width: `${(r.fill * 100).toFixed(1)}%` }} aria-hidden="true" />
            <div className="relative flex items-center gap-2 px-2 py-1">
              <CategoryDots cats={r.cats} />
              <span className="flex-1 truncate">{r.name}</span>
              <span className="tabular-nums">{r.left}</span>
            </div>
          </li>
        ))
      ) : (
        <li className="px-2 py-1 text-muted-foreground">{tl.idle}</li>
      )}
    </ol>
  );
}
