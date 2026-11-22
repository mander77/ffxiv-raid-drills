import { CircleArrowOutUpRight, createLucideIcon, Expand, History, type IconNode, type LucideIcon, Shrink } from "lucide-react";
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

/** The chevrons of both knockbacks: pushing out to the northwest and southeast corners. */
const PUSHED_OUT: IconNode = [
  ["path", { d: "M2 8V2h6", key: "northwest" }],
  ["path", { d: "M22 16v6h-6", key: "southeast" }],
];

/** A knockback: a player (a filled dot), pushed out by the boss's chevrons. Drawn the same way. */
const Knockback = createLucideIcon("knockback", [
  ["circle", { cx: "12", cy: "12", r: "3", fill: "currentColor", key: "boss" }],
  ...PUSHED_OUT,
]);

/** A knockback tower: the tower's ring with the knockback's chevrons, since you soak it and it
    knocks you back. Drawn the same way. */
const TowerKnockback = createLucideIcon("tower-knockback", [["circle", { cx: "12", cy: "12", r: "6", key: "tower" }], ...PUSHED_OUT]);

/** Pairs: two players (filled dots) on one spot (a ring). Drawn the same way. */
const Pairs = createLucideIcon("pairs", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "spot" }],
  ["circle", { cx: "8.5", cy: "12", r: "2.5", fill: "currentColor", key: "first" }],
  ["circle", { cx: "15.5", cy: "12", r: "2.5", fill: "currentColor", key: "second" }],
]);

/** A tower: a player (a filled dot) standing in the spot (a ring). Drawn the same way. */
const Tower = createLucideIcon("tower", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "spot" }],
  ["circle", { cx: "12", cy: "12", r: "3", fill: "currentColor", key: "player" }],
]);

/** A dodge: a player (a filled dot) stepping aside, an arrow of their own. Drawn the same way. */
const Dodge = createLucideIcon("dodge", [
  ["circle", { cx: "5", cy: "12", r: "3", fill: "currentColor", key: "player" }],
  ["path", { d: "M10 12h11", key: "step" }],
  ["path", { d: "m17 8 4 4-4 4", key: "step-head" }],
]);

/** A dodge sequence: a player (a filled dot) and the path they take, turning, to an arrow: several
    moves in order. Drawn the same way. */
const DodgeSequence = createLucideIcon("dodge-sequence", [
  ["circle", { cx: "4", cy: "5", r: "2.5", fill: "currentColor", key: "player" }],
  ["path", { d: "M7 5h10a3 3 0 0 1 0 6H7a3 3 0 0 0 0 6h14", key: "path" }],
  ["path", { d: "m18 14 3 3-3 3", key: "path-head" }],
]);

/** The name and the icon of each kind of mechanic. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon }> = {
  spread: { name: "Spread", icon: Expand },
  stack: { name: "Stack", icon: Shrink },
  lineStack: { name: "Line stack", icon: LineStack },
  pairs: { name: "Pairs", icon: Pairs },
  // You bring the hit to your spot, then step out of it before it goes off.
  bait: { name: "Bait", icon: CircleArrowOutUpRight },
  dodge: { name: "Dodge", icon: Dodge },
  sequence: { name: "Dodge sequence", icon: DodgeSequence },
  tower: { name: "Tower", icon: Tower },
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
