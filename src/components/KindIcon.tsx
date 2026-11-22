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

/** A knockback: the boss as a filled dot, with two arrows pushing away from it, down to each side
    at 45 degrees. Drawn the same way. */
const Knockback = createLucideIcon("knockback", [
  ["circle", { cx: "12", cy: "5", r: "2", fill: "currentColor", key: "boss" }],
  ["path", { d: "M10 8 3 15", key: "left" }],
  ["path", { d: "M3 10v5h5", key: "left-head" }],
  ["path", { d: "m14 8 7 7", key: "right" }],
  ["path", { d: "M21 10v5h-5", key: "right-head" }],
]);

/** A knockback tower: the tower's ring and dot, with a chevron on each side pushing out, since you
    soak it and it knocks you back. Drawn the same way. */
const TowerKnockback = createLucideIcon("tower-knockback", [
  ["circle", { cx: "12", cy: "12", r: "4.5", key: "tower" }],
  ["circle", { cx: "12", cy: "12", r: "1", key: "centre" }],
  ["path", { d: "m9.5 4 2.5-2.5L14.5 4", key: "up" }],
  ["path", { d: "m9.5 20 2.5 2.5 2.5-2.5", key: "down" }],
  ["path", { d: "M4 9.5 1.5 12 4 14.5", key: "left" }],
  ["path", { d: "m20 9.5 2.5 2.5-2.5 2.5", key: "right" }],
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
  towerKnockback: { name: "Knockback tower", icon: TowerKnockback },
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
