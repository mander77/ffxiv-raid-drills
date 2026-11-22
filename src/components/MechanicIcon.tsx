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
  PuddleDropIcon,
  SavedForLaterIcon,
  SharedTankBusterIcon,
  SpreadIcon,
  StackIcon,
  StretchTetherIcon,
  TankBusterIcon,
  TowerIcon,
  WildChargeIcon,
} from "./icons";

/** The name and the icon of each kind of mechanic. A stack also has the number of its players, in
    the middle of its icon: 2 for pairs, 4 for light parties, R when the roles decide; a stack of
    the whole party has none. A shared tank buster has the number of tanks who share it, smaller,
    since the middle of its shield is narrower than the stack's. */
export const KINDS: Record<DrillKind, { name: string; icon: LucideIcon; count?: string; smallCount?: boolean }> = {
  spread: { name: "Spread", icon: SpreadIcon },
  stack: { name: "Party stack", icon: StackIcon },
  pairStack: { name: "Pair stack", icon: StackIcon, count: "2" },
  lightPartyStack: { name: "Light party stack", icon: StackIcon, count: "4" },
  roleStack: { name: "Role stack", icon: StackIcon, count: "R" },
  lineStack: { name: "Line stack", icon: LineStackIcon },
  // You are the target: you bring the hit to where it should go.
  bait: { name: "Bait", icon: BaitIcon },
  // You drop several puddles in order, walking on as each one lands.
  puddles: { name: "Puddle drop sequence", icon: PuddleDropIcon },
  dodge: { name: "Dodge", icon: DodgeIcon },
  sequence: { name: "Dodge sequence", icon: DodgeSequenceIcon },
  tower: { name: "Tower", icon: TowerIcon },
  towerKnockback: { name: "Knockback tower", icon: KnockbackTowerIcon },
  wildCharge: { name: "Wild charge", icon: WildChargeIcon },
  later: { name: "Saved for later", icon: SavedForLaterIcon },
  knockback: { name: "Knockback", icon: KnockbackIcon },
  // Two tethered players move apart until the tether is long enough.
  stretchTether: { name: "Stretch tether", icon: StretchTetherIcon },
  tankBuster: { name: "Tank buster", icon: TankBusterIcon },
  sharedTankBuster: { name: "Shared tank buster", icon: SharedTankBusterIcon, count: "2", smallCount: true },
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
  const { icon: Icon, count, smallCount } = KINDS[kind];
  if (!count) return <Icon aria-hidden="true" className={cn("size-4", className)} />;
  // A container, so the number takes its size from the icon's: 70 percent of its width (50 for a
  // small one), at any size.
  return (
    <span aria-hidden="true" className={cn("@container relative inline-grid size-4 place-items-center", className)}>
      <Icon className="size-full" />
      <span
        className={cn(
          "absolute font-sans font-bold",
          // The size goes before leading-none: cn drops a line height that comes before a size.
          smallCount ? "text-[50cqw]" : "text-[70cqw]",
          "leading-none",
          countClassName,
        )}
      >
        {count}
      </span>
    </span>
  );
}
