import {
  ArrowUpFromDot,
  CircleArrowOutUpRight,
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

/** A line stack: the dashed line the stack runs along, with the hit running down each side.
    Lucide has no such icon, so it is drawn in its style (a 24 by 24 grid, the same stroke) with its
    createLucideIcon, and takes the same size and colour as the others. */
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

/** The name and the icon of each kind of mechanic. `flip` turns the icon upside down. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon; flip?: boolean }> = {
  spread: { name: "Spread", icon: Expand },
  stack: { name: "Stack", icon: Shrink },
  lineStack: { name: "Line stack", icon: LineStack },
  pairs: { name: "Pairs", icon: UsersRound },
  // You bring the hit to your spot, then step out of it before it goes off.
  bait: { name: "Bait", icon: CircleArrowOutUpRight },
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
