import {
  CircleArrowOutUpRight,
  CircleDot,
  createLucideIcon,
  Expand,
  Footprints,
  History,
  type LucideIcon,
  Route,
  Shrink,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrillKind } from "../types";

/** A line stack: three chevrons, the hit running down the line. Lucide's ChevronsDown has two, so
    this one is drawn in its style (a 24 by 24 grid, the same stroke) with its createLucideIcon,
    and takes the same size and colour as the others. */
const LineStack = createLucideIcon("line-stack", [
  ["path", { d: "m7 3 5 5 5-5", key: "top" }],
  ["path", { d: "m7 9 5 5 5-5", key: "middle" }],
  ["path", { d: "m7 15 5 5 5-5", key: "bottom" }],
]);

/** A wild charge: the line stack's chevrons with a bar in front, the tank or rock that takes the
    first, biggest hit. Drawn the same way. */
const WildCharge = createLucideIcon("wild-charge", [
  ["path", { d: "M5 3h14", key: "front" }],
  ["path", { d: "m7 8 5 5 5-5", key: "top" }],
  ["path", { d: "m7 14 5 5 5-5", key: "bottom" }],
]);

/** A knockback: the boss as a dot, with arrows pushing away from it: straight down, and down to
    each side at 45 degrees. Drawn the same way. */
const Knockback = createLucideIcon("knockback", [
  ["circle", { cx: "12", cy: "3", r: "1", key: "boss" }],
  ["path", { d: "M12 7v14", key: "down" }],
  ["path", { d: "m8 17 4 4 4-4", key: "down-head" }],
  ["path", { d: "M10 6 4 12", key: "left" }],
  ["path", { d: "M4 7v5h5", key: "left-head" }],
  ["path", { d: "m14 6 6 6", key: "right" }],
  ["path", { d: "M20 7v5h-5", key: "right-head" }],
]);

/** The name and the icon of each kind of mechanic. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon }> = {
  spread: { name: "Spread", icon: Expand },
  stack: { name: "Stack", icon: Shrink },
  lineStack: { name: "Line stack", icon: LineStack },
  pairs: { name: "Pairs", icon: UsersRound },
  // You bring the hit to your spot, then step out of it before it goes off.
  bait: { name: "Bait", icon: CircleArrowOutUpRight },
  dodge: { name: "Dodge", icon: Footprints },
  sequence: { name: "Dodge sequence", icon: Route },
  tower: { name: "Tower", icon: CircleDot },
  wildCharge: { name: "Wild charge", icon: WildCharge },
  later: { name: "Saved for later", icon: History },
  knockback: { name: "Knockback", icon: Knockback },
};

export interface KindIconProps {
  kind: DrillKind;
  className?: string;
}

/** The icon of what you do in a mechanic (spread, stack...). It is only a picture: the text next
    to it, or a label, says the same in words. */
export function KindIcon({ kind, className }: KindIconProps) {
  const Icon = KINDS[kind].icon;
  return <Icon aria-hidden="true" className={cn("size-4", className)} />;
}
