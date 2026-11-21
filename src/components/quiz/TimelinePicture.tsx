import { ENRAGE, PHASES, timelineCategories } from "../../data/abilities";
import { TIMELINE } from "../../data/timeline";
import { cn } from "../../lib/utils";
import { clock, sec } from "../../time";
import type { QuizItem } from "../../types";
import { CategoryDots } from "../CategoryDots";

/** At least this many rows show after the one that just happened, and at most MAX_ROWS. */
const MIN_ROWS = 5;
const MAX_ROWS = 8;
/** A row's bar fills as its time comes closer: empty a minute out, full at its time. The app's
    choice, not a fight time. */
const FILL_AT = 60;

/** The phases with their start and end in seconds, for the strip. */
const STRIP = PHASES.map((p, k) => {
  const start = k === 0 ? 0 : Math.min(...p.rows.map((a) => a.t));
  const next = PHASES[k + 1];
  const end = next ? Math.min(...next.rows.map((a) => a.t)) : ENRAGE;
  return { name: p.name.split(": ")[1] ?? p.name, start, end };
});

/** The timeline row a Timeline card asks about (ids "n-<row>" and "r-<row>": row <row> just
    happened), or null for any other card. */
export function timelineRowOf(item: QuizItem): number | null {
  const m = /^[nr]-(\d+)$/.exec(item.id);
  return m ? Number(m[1]) : null;
}

export interface TimelinePictureProps {
  /** The timeline row that just happened. */
  row: number;
  answered: boolean;
  /** The name of the right answer, outlined after the answer. */
  rightName: string;
}

/** The picture on a Timeline card: the fight timeline at that moment, the way the cactbot overlay
    shows it, and a strip of the four phases with where you are in the fight. Before the answer
    the coming rows show their bars and countdowns but not their names. */
export function TimelinePicture({ row, answered, rightName }: TimelinePictureProps) {
  const now = sec(TIMELINE[row].t);
  const right = TIMELINE.findIndex((e, x) => x > row && e.n === rightName);
  const last = Math.min(TIMELINE.length - 1, row + MAX_ROWS, Math.max(row + MIN_ROWS, right));
  const phase = Math.max(
    0,
    STRIP.findIndex((p) => now >= p.start && now < p.end),
  );
  const rows = Array.from({ length: last - row }, (_x, k) => row + 1 + k);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      {/* The phase strip: each phase as wide as it lasts, and a mark where you are now. */}
      <div aria-hidden="true" className="relative flex h-6 overflow-hidden rounded-md text-xs font-medium">
        {STRIP.map((p, x) => (
          <span
            key={p.name}
            title={p.name}
            className={cn(
              "flex items-center justify-center border-r border-background",
              x === phase ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
            style={{ width: `${((p.end - p.start) / ENRAGE) * 100}%` }}
          >
            P{x + 1}
          </span>
        ))}
        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-destructive" style={{ left: `${(now / ENRAGE) * 100}%` }} />
      </div>
      <p className="text-sm">
        <span className="font-semibold">
          P{phase + 1} · {STRIP[phase].name}
        </span>{" "}
        <span className="text-muted-foreground">
          {clock(now)} of {clock(ENRAGE)}
        </span>
      </p>
      {!answered && <p className="text-xs text-muted-foreground">Coming up: the names show after you answer.</p>}
      <ol aria-label="Fight timeline" className="space-y-1 text-sm">
        <TimelineRow fill={1} name={TIMELINE[row].n} cats={timelineCategories(row)} when={TIMELINE[row].t} now />
        {rows.map((x) => {
          const left = sec(TIMELINE[x].t) - now;
          return (
            <TimelineRow
              key={x}
              fill={Math.max(0, Math.min(1, 1 - left / FILL_AT))}
              name={answered ? TIMELINE[x].n : null}
              cats={timelineCategories(x)}
              when={`in ${left < 60 ? `${left} s` : clock(left)}`}
              right={answered && x === right}
            />
          );
        })}
      </ol>
    </div>
  );
}

interface TimelineRowProps {
  /** How full the bar is, from 0 to 1. */
  fill: number;
  /** The ability's name, or null to hide it until the answer. */
  name: string | null;
  cats: ReturnType<typeof timelineCategories>;
  when: string;
  /** The row that just happened. */
  now?: boolean;
  /** The right answer, outlined. */
  right?: boolean;
}

/** One row of the timeline: a bar that fills as its time comes, its name and when it comes. */
function TimelineRow({ fill, name, cats, when, now = false, right = false }: TimelineRowProps) {
  return (
    <li
      className={cn(
        "relative flex items-center justify-between gap-3 overflow-hidden rounded-md border px-2 py-1",
        now && "font-semibold",
        right && "ring-2 ring-green-600",
      )}
    >
      <i
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0", now ? "bg-muted" : "bg-sky-100")}
        style={{ width: `${fill * 100}%` }}
      />
      <span className="relative flex items-center gap-2">
        {name === null ? (
          <span className="tracking-widest text-muted-foreground">? ? ?</span>
        ) : (
          <>
            <CategoryDots cats={cats} />
            {name}
          </>
        )}
      </span>
      <span className="relative font-mono text-xs tabular-nums">{when}</span>
    </li>
  );
}
