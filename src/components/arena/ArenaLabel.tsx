import { cn } from "@/lib/utils";
import { f1 } from "../../geometry";
import type { Point } from "../../types";

/** The colour of a label: green for your spot ("ok"), grey for another slot's spot ("other"), blue
    for "Go here" ("pick"), purple for a spot saved for later ("later"). */
export type LabelLook = "ok" | "other" | "pick" | "later";

export interface ArenaLabelProps {
  /** The middle of the label, in arena units. */
  at: Point;
  text: string;
  /** The size of the box, in arena units. */
  w: number;
  h: number;
  look: LabelLook;
}

/** A name tag on the arena: a rounded box with white text, centred on a spot. */
export function ArenaLabel({ at, text, w, h, look }: ArenaLabelProps) {
  return (
    <g className={cn("zlabel", look !== "ok" && look)}>
      <rect x={f1(at[0] - w / 2)} y={f1(at[1] - h / 2)} width={w} height={h} rx=".9" />
      <text x={f1(at[0])} y={f1(at[1])}>
        {text}
      </text>
    </g>
  );
}
