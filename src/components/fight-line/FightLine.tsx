import type { CastControls } from "../../hooks/useCastTimeline";
import type { LineType } from "../../lib/fightLine";
import { MovingLine } from "./MovingLine";
import { StillLine } from "./StillLine";

export interface FightLineProps {
  /** Which way the line runs: "y" down the box, beside the arena; "x" across it, under the arena
      or above it on a narrow screen. */
  axis: "x" | "y";
  /** Move with the fight clock, inside a fight screen (Pressure): the casts coming up. Without
      it, the clock does not move it: the whole fight, which you drag (Practice). */
  follow?: boolean;
  /** Only the rows of these types: ability categories, or "practice" for the Practice mechanics.
      With none, every row shows. The moving line has no Practice mechanics. */
  types?: readonly LineType[];
  /** The moving line in the player: click a cast to go to it, drag the line to move the clock. */
  controls?: CastControls;
  /** The line that stands still: the Practice mechanic on screen, which rests at the now mark. */
  current?: string;
  /** The line that stands still: open a Practice mechanic, from a click or a drag. */
  onPick?: (drill: string) => void;
  /** The line that stands still: its name for screen readers. */
  label?: string;
  className?: string;
}

/** The fight on a line, with a square per row in its category's colour. One component, set up for
    each page: on Pressure it follows the fight clock (MovingLine); on Practice the clock does not
    move it, and you drag it or click a mechanic to open it (StillLine). */
export function FightLine({ axis, follow = false, types, controls, current, onPick, label = "The fight", className }: FightLineProps) {
  return follow ? (
    <MovingLine axis={axis} types={types} controls={controls} className={className} />
  ) : (
    <StillLine axis={axis} types={types} current={current} onPick={onPick} label={label} className={className} />
  );
}
