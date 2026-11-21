import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFitToScreen } from "../../hooks/useFitToScreen";
import { ARENA_ASPECT } from "./Arena";

/** The widest an arena gets, in pixels. The app's choice: wider only adds scrolling. */
const ARENA_MAX = 720;
/** The smallest an arena gets, in pixels, however little room the screen has. On a phone this is
    more than the column, so the arena fills the width there. The app's choice. */
const ARENA_MIN = 360;
/** The room left at the bottom of the screen under an arena, in pixels. The app's choice. */
const SCREEN_MARGIN = 16;

export interface ArenaFrameProps {
  children: ReactNode;
  /** Room to keep under the arena, in pixels, for what comes below it (the run's bar). */
  below?: number;
  className?: string;
}

/** The size of every arena you play on, on Learn, Practice and Pressure: as large as its column,
    but never taller than the room from its top down to the bottom of the screen, so the whole
    arena is in view, and never wider than ARENA_MAX. On a short screen it keeps at least
    ARENA_MIN, so on a phone it fills the width. Things drawn over the arena (the 3-2-1,
    a result) can sit in it with absolute positions. */
export function ArenaFrame({ children, below = 0, className }: ArenaFrameProps) {
  const [ref, height] = useFitToScreen<HTMLDivElement>(below + SCREEN_MARGIN);
  return (
    <div
      ref={ref}
      className={cn("relative mx-auto w-full", className)}
      style={{ maxWidth: height === undefined ? ARENA_MAX : Math.max(ARENA_MIN, Math.min(ARENA_MAX, height * ARENA_ASPECT)) }}
    >
      {children}
    </div>
  );
}
