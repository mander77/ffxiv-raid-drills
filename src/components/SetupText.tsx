import type { Lines } from "../types";
import { LineList } from "./LineList";

export interface SetupTextProps {
  lines: Lines;
  /** True when the lines happen in order: they show numbered. */
  ordered?: boolean;
}

/** The setup of a mechanic: what happens, one step per line. It always shows in full, so the
    player sees every step at a glance, with no click to open it. */
export function SetupText({ lines, ordered }: SetupTextProps) {
  return <LineList lines={lines} ordered={ordered} className="text-sm" />;
}
