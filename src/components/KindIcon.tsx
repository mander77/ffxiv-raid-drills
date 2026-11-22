import {
  ArrowUpFromDot,
  CircleDot,
  Crosshair,
  EllipsisVertical,
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

/** The name and the icon of each kind of mechanic. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon }> = {
  spread: { name: "Spread", icon: Expand },
  stack: { name: "Stack", icon: Shrink },
  lineStack: { name: "Line stack", icon: EllipsisVertical },
  pairs: { name: "Pairs", icon: UsersRound },
  bait: { name: "Bait", icon: Crosshair },
  dodge: { name: "Dodge", icon: Footprints },
  sequence: { name: "Dodge sequence", icon: Route },
  tower: { name: "Tower", icon: CircleDot },
  hide: { name: "Hide", icon: EyeOff },
  later: { name: "Saved for later", icon: History },
  knockback: { name: "Knockback", icon: ArrowUpFromDot },
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
