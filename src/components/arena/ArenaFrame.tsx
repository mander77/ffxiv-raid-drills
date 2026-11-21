import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFitToScreen } from "../../hooks/useFitToScreen";
import { ARENA_ASPECT, ARENA_VIEW } from "./Arena";

/** The widest an arena gets, in pixels. The app's choice: wider only adds scrolling. */
const ARENA_MAX = 720;
/** The smallest an arena gets, in pixels, however little room the screen has. On a phone this is
    more than the column, so the arena fills the width there. The app's choice. */
const ARENA_MIN = 360;
/** The room left at the bottom of the screen under an arena, in pixels: the page's bottom padding
    (py-6 on every page), so an arena at the end of the page does not make it scroll. */
const SCREEN_MARGIN = 24;

/** A share of a whole, as a CSS percentage. */
function pct(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}

export interface ArenaFrameProps {
  children: ReactNode;
  /** Room to keep under the arena, in pixels, for what comes below it: the run's bar, or what
      `under` holds. */
  below?: number;
  /** What sits right under the floor, as wide as the floor. Count its height in `below`. */
  under?: ReactNode;
  /** A column drawn right against the floor's right edge and as tall as the floor, so it reads as
      part of the arena. It gives itself a width; keep that much room to the right of the frame. */
  beside?: ReactNode;
  /** The same on the left: a column right against the floor's left edge. Keep room for it on the
      left of the frame. */
  before?: ReactNode;
  className?: string;
}

/** The floor's top and bottom in the picture, as shares of the frame, for the side columns. */
const FLOOR_TOP = pct(-ARENA_VIEW.y, ARENA_VIEW.height);
const FLOOR_BOTTOM = pct(ARENA_VIEW.height + ARENA_VIEW.y - 100, ARENA_VIEW.height);
/** How far the floor's right edge is from the frame's left, and its left edge from the frame's right. */
const FLOOR_RIGHT = pct(-ARENA_VIEW.x + 100, ARENA_VIEW.width);
const FLOOR_LEFT_FROM_RIGHT = pct(ARENA_VIEW.width + ARENA_VIEW.x, ARENA_VIEW.width);
/** The room beside the floor and under it in the picture, as shares of the frame's width (a margin
    in percent is a share of the width). The picture's room under the floor is as tall as the room
    beside it is wide. */
const FLOOR_SIDE = pct(-ARENA_VIEW.x, ARENA_VIEW.width);

/** The size of every arena you play on, on Learn, Practice and Pressure: as large as its column,
    but never taller than the room from its top down to the bottom of the screen, so the whole
    arena is in view, and never wider than ARENA_MAX. On a short screen it keeps at least
    ARENA_MIN, so on a phone it fills the width. Things drawn over the arena (the 3-2-1,
    a result) can sit in it with absolute positions. */
export function ArenaFrame({ children, below = 0, under, beside, before, className }: ArenaFrameProps) {
  const [ref, height] = useFitToScreen<HTMLDivElement>(below + SCREEN_MARGIN);
  return (
    <div
      ref={ref}
      className={cn("relative mx-auto w-full", className)}
      style={{ maxWidth: height === undefined ? ARENA_MAX : Math.max(ARENA_MIN, Math.min(ARENA_MAX, height * ARENA_ASPECT)) }}
    >
      <div className="relative">
        {children}
        {/* The side columns are placed by the floor's edges in the picture, as shares of the frame,
          so they fit at any size. */}
        {before && (
          <div
            className="absolute flex justify-end"
            style={{ right: `calc(${FLOOR_LEFT_FROM_RIGHT} + 0.5rem)`, top: FLOOR_TOP, bottom: FLOOR_BOTTOM }}
          >
            {before}
          </div>
        )}
        {beside && (
          <div className="absolute flex" style={{ left: `calc(${FLOOR_RIGHT} + 0.5rem)`, top: FLOOR_TOP, bottom: FLOOR_BOTTOM }}>
            {beside}
          </div>
        )}
      </div>
      {under && <div style={{ marginInline: FLOOR_SIDE, marginTop: `calc(0.5rem - ${FLOOR_SIDE})` }}>{under}</div>}
    </div>
  );
}
