// The icon of each kind of mechanic, with its name, and the component that draws it. The icons
// themselves, and the rules they follow, are in icons.tsx.
import { cn } from "@/lib/utils";
import type { DrillKind } from "../types";
import {
  BaitIcon,
  DodgeIcon,
  DodgeSequenceIcon,
  KnockbackIcon,
  KnockbackTowerIcon,
  LineStackIcon,
  type LucideIcon,
  SavedForLaterIcon,
  SpreadIcon,
  StackIcon,
  TowerIcon,
  WildChargeIcon,
} from "./icons";

/** The name and the icon of each kind of mechanic. A stack also has the number of its players, in
    the middle of its icon: 2 for pairs, 4 for light parties, R when the roles decide; a stack of
    the whole party has none. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon; count?: string }> = {
  spread: { name: "Spread", icon: SpreadIcon },
  stack: { name: "Party stack", icon: StackIcon },
  pairStack: { name: "Pair stack", icon: StackIcon, count: "2" },
  lightPartyStack: { name: "Light party stack", icon: StackIcon, count: "4" },
  roleStack: { name: "Role stack", icon: StackIcon, count: "R" },
  lineStack: { name: "Line stack", icon: LineStackIcon },
  // You bring the hit to your spot, then step out of it before it goes off.
  bait: { name: "Bait", icon: BaitIcon },
  dodge: { name: "Dodge", icon: DodgeIcon },
  sequence: { name: "Dodge sequence", icon: DodgeSequenceIcon },
  tower: { name: "Tower", icon: TowerIcon },
  towerKnockback: { name: "Knockback tower", icon: KnockbackTowerIcon },
  wildCharge: { name: "Wild charge", icon: WildChargeIcon },
  later: { name: "Saved for later", icon: SavedForLaterIcon },
  knockback: { name: "Knockback", icon: KnockbackIcon },
};

export interface MechanicIconProps {
  kind: DrillKind;
  /** The size and colour of the icon. */
  className?: string;
  /** The colour of a stack's number, when it should stand out from the arrows. */
  countClassName?: string;
}

/** The icon of what you do in a mechanic (spread, stack...), with a stack's number in its middle.
    It is only a picture: the text next to it, or a label, says the same in words. */
export function MechanicIcon({ kind, className, countClassName }: MechanicIconProps) {
  const { icon: Icon, count } = KINDS[kind];
  if (!count) return <Icon aria-hidden="true" className={cn("size-4", className)} />;
  // A container, so the number takes its size from the icon's: 70 percent of its width, at any size.
  return (
    <span aria-hidden="true" className={cn("@container relative inline-grid size-4 place-items-center", className)}>
      <Icon className="size-full" />
      <span className={cn("absolute font-sans text-[70cqw] leading-none font-bold", countClassName)}>{count}</span>
    </span>
  );
}
