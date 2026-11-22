import {
  ArrowUpFromDot,
  CircleDot,
  createLucideIcon,
  Expand,
  EyeOff,
  Footprints,
  History,
  type LucideIcon,
  Route,
  Shrink,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrillKind } from "../types";

// Two icons lucide does not have, drawn in its style (a 24 by 24 grid, the same stroke) with its
// createLucideIcon, so they take the same size and colour as the others.

/** A line stack: the dashed line the stack runs along, with the hit running down each side. */
const LineStack = createLucideIcon("line-stack", [
  ["path", { d: "M12 2v2", key: "dash1" }],
  ["path", { d: "M12 8v2", key: "dash2" }],
  ["path", { d: "M12 14v2", key: "dash3" }],
  ["path", { d: "M12 20v2", key: "dash4" }],
  ["path", { d: "M5 3v17", key: "left" }],
  ["path", { d: "m2 17 3 3 3-3", key: "left-head" }],
  ["path", { d: "M19 3v17", key: "right" }],
  ["path", { d: "m16 17 3 3 3-3", key: "right-head" }],
]);

/** A bait: a player standing in a target, from lucide's PersonStanding. */
const PersonInTarget = createLucideIcon("person-in-target", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "target" }],
  ["circle", { cx: "12", cy: "7", r: "1", key: "head" }],
  ["path", { d: "m10 18 2-4 2 4", key: "legs" }],
  ["path", { d: "m8 9.5 4 1.5 4-1.5", key: "arms" }],
  ["path", { d: "M12 11v3", key: "body" }],
]);

/** The name and the icon of each kind of mechanic. `flip` turns the icon upside down. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon; flip?: boolean }> = {
  spread: { name: "Spread", icon: Expand },
  stack: { name: "Stack", icon: Shrink },
  lineStack: { name: "Line stack", icon: LineStack },
  pairs: { name: "Pairs", icon: UsersRound },
  bait: { name: "Bait", icon: PersonInTarget },
  dodge: { name: "Dodge", icon: Footprints },
  sequence: { name: "Dodge sequence", icon: Route },
  tower: { name: "Tower", icon: CircleDot },
  hide: { name: "Hide", icon: EyeOff },
  later: { name: "Saved for later", icon: History },
  // Upside down: the dot is the boss, and the arrow pushes you away from it.
  knockback: { name: "Knockback", icon: ArrowUpFromDot, flip: true },
};

export interface KindIconProps {
  kind: DrillKind;
  className?: string;
}

/** The icon of what you do in a mechanic (spread, stack...). It is only a picture: the text next
    to it, or a label, says the same in words. */
export function KindIcon({ kind, className }: KindIconProps) {
  const { icon: Icon, flip } = KINDS[kind];
  return <Icon aria-hidden="true" className={cn("size-4", flip && "rotate-180", className)} />;
}
