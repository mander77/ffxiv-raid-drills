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
  /** What sits directly under the floor, as wide as the floor. Count its height in `below`. */
  under?: ReactNode;
  /** What sits directly over the picture, as wide as the floor. */
  over?: ReactNode;
  /** The arena fills its column, up to ARENA_MAX, however tall the screen is: the page scrolls to
      it, as on a phone. */
  fill?: boolean;
  /** A column drawn directly against the floor's right edge and as tall as the floor, so it reads as
      part of the arena. It gives itself a width; keep that much room to the right of the frame. */
  beside?: ReactNode;
  /** The same on the left: a column directly against the floor's left edge. Keep room for it on the
      left of the frame. */
  before?: ReactNode;
  /** The `before` and `beside` columns run on below the floor, down to the bottom of the screen,
      when the screen is taller than the arena. They are never shorter than the floor. */
  tallSides?: boolean;
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

/** The CSS height of a side column. It starts at the floor's top and ends at the floor's bottom, or,
    given the room from the frame's top to the bottom of the screen, there when that is lower.
    Percentages are shares of the picture's height, as the column's `top` is. */
export function sideColumnHeight(room: number | undefined): string {
  const floor = `calc(100% - ${FLOOR_TOP} - ${FLOOR_BOTTOM})`;
  return room === undefined ? floor : `max(${floor}, calc(${room}px - ${FLOOR_TOP}))`;
}

/** The size of every arena you play on, on Learn, Practice and Pressure: as large as its column,
    but never taller than the room from its top down to the bottom of the screen, so the whole
    arena is in view, and never wider than ARENA_MAX. On a short screen it keeps at least
    ARENA_MIN, so on a phone it fills the width; with `fill` it fills its column, and the page
    scrolls. Things drawn over the arena (the 3-2-1, a result) can sit in it with absolute
    positions. What sits against the floor (`over`, `under`, `before`, `beside`) lines up with
    the floor's edges in the picture, not with the picture's room for the compass. */
export function ArenaFrame({
  children,
  below = 0,
  over,
  under,
  beside,
  before,
  fill = false,
  tallSides = false,
  className,
}: ArenaFrameProps) {
  const [ref, height] = useFitToScreen<HTMLDivElement>(below + SCREEN_MARGIN);
  const sideHeight = sideColumnHeight(tallSides ? height : undefined);
  return (
    <div
      ref={ref}
      className={cn("relative mx-auto w-full", className)}
      style={{
        maxWidth: fill || height === undefined ? ARENA_MAX : Math.max(ARENA_MIN, Math.min(ARENA_MAX, height * ARENA_ASPECT)),
        // Tall side columns hang below the picture; the frame keeps their room, so what comes
        // after it on the page (the footer) starts below them.
        minHeight: tallSides ? height : undefined,
      }}
    >
      {over && <div style={{ marginInline: FLOOR_SIDE }}>{over}</div>}
      <div className="relative">
        {children}
        {/* The side columns are placed by the floor's edges in the picture, as shares of the frame,
          so they fit at any size. */}
        {before && (
          <div
            className="absolute flex justify-end"
            style={{ right: `calc(${FLOOR_LEFT_FROM_RIGHT} + 0.5rem)`, top: FLOOR_TOP, height: sideHeight }}
          >
            {before}
          </div>
        )}
        {beside && (
          <div className="absolute flex" style={{ left: `calc(${FLOOR_RIGHT} + 0.5rem)`, top: FLOOR_TOP, height: sideHeight }}>
            {beside}
          </div>
        )}
      </div>
      {under && <div style={{ marginInline: FLOOR_SIDE, marginTop: `calc(0.5rem - ${FLOOR_SIDE})` }}>{under}</div>}
    </div>
  );
}
