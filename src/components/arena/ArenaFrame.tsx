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
  /** Room to keep under the arena, in pixels, for what comes below it (the run's bar). */
  below?: number;
  /** A column drawn right against the floor's right edge and as tall as the floor, so it reads as
      part of the arena. It gives itself a width; keep that much room to the right of the frame. */
  beside?: ReactNode;
  className?: string;
}

/** The size of every arena you play on, on Learn, Practice and Pressure: as large as its column,
    but never taller than the room from its top down to the bottom of the screen, so the whole
    arena is in view, and never wider than ARENA_MAX. On a short screen it keeps at least
    ARENA_MIN, so on a phone it fills the width. Things drawn over the arena (the 3-2-1,
    a result) can sit in it with absolute positions. */
export function ArenaFrame({ children, below = 0, beside, className }: ArenaFrameProps) {
  const [ref, height] = useFitToScreen<HTMLDivElement>(below + SCREEN_MARGIN);
  return (
    <div
      ref={ref}
      className={cn("relative mx-auto w-full", className)}
      style={{ maxWidth: height === undefined ? ARENA_MAX : Math.max(ARENA_MIN, Math.min(ARENA_MAX, height * ARENA_ASPECT)) }}
    >
      {children}
      {beside && (
        // Placed by the floor's edges in the picture, as shares of the frame, so it fits at any size.
        <div
          className="absolute flex"
          style={{
            left: `calc(${pct(-ARENA_VIEW.x + 100, ARENA_VIEW.width)} + 0.5rem)`,
            top: pct(-ARENA_VIEW.y, ARENA_VIEW.height),
            bottom: pct(ARENA_VIEW.height + ARENA_VIEW.y - 100, ARENA_VIEW.height),
          }}
        >
          {beside}
        </div>
      )}
    </div>
  );
}
