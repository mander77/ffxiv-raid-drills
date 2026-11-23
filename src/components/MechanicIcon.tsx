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
  TankTowerIcon,
  TowerIcon,
  WildChargeIcon,
} from "./icons";

/** A kind of mechanic: its name, what you do in it, and its icon. */
export interface KindInfo {
  name: string;
  /** What you do in it, in one short sentence. */
  meaning: string;
  icon: LucideIcon;
  /** The number in the middle of the icon, if it has one. */
  count?: string;
  /** The size and place of the number, as complete Tailwind classes, for an icon whose middle is
      not square. Without it, the number is 70 percent of the icon wide, in its middle. */
  countLook?: string;
  /** A tower: each mechanic gives its own number, how many players soak it (Drill.soak). */
  soaked?: boolean;
}

/** Each kind of mechanic. A stack also has the number of its players, in the middle of its icon: 2
    for pairs, 4 for light parties, R when the roles decide; a stack of the whole party has none. A
    shared tank buster has the number of tanks who share it, smaller, since the middle of its
    shield is narrower than the stack's. */
export const KINDS: Record<DrillKind, KindInfo> = {
  spread: { name: "Spread", meaning: "Spread out, away from the others.", icon: SpreadIcon },
  stack: { name: "Party stack", meaning: "The whole party stacks on one spot.", icon: StackIcon },
  pairStack: { name: "Pair stack", meaning: "Stack in twos.", icon: StackIcon, count: "2" },
  lightPartyStack: {
    name: "Light party stack",
    meaning: "Stack with your light party of four.",
    icon: StackIcon,
    count: "4",
  },
  roleStack: { name: "Role stack", meaning: "Stack by role: the roles decide who stacks.", icon: StackIcon, count: "R" },
  lineStack: { name: "Line stack", meaning: "Stand in the line from the boss to the marked player.", icon: LineStackIcon },
  bait: { name: "Bait", meaning: "You are the target: bring the hit to where it should go.", icon: BaitIcon },
  puddles: {
    name: "Puddle drop sequence",
    meaning: "Drop several puddles in order, walking on as each one lands.",
    icon: PuddleDropIcon,
  },
  dodge: { name: "Dodge", meaning: "Step out of the attack.", icon: DodgeIcon },
  sequence: { name: "Dodge sequence", meaning: "Dodge a set order of attacks.", icon: DodgeSequenceIcon },
  tower: {
    name: "Tower",
    meaning: "Stand in a tower to soak it. The number says how many players soak it.",
    icon: TowerIcon,
    // Up a little, in the column, clear of the ring.
    countLook: "-translate-y-[6cqw] text-[50cqw]",
    soaked: true,
  },
  towerKnockback: {
    name: "Knockback tower",
    meaning: "Soak a tower that knocks you back. The number says how many players soak it.",
    icon: KnockbackTowerIcon,
    // Smaller, in the middle of the arrow, clear of the ring.
    countLook: "-translate-y-[2cqw] text-[42cqw]",
    soaked: true,
  },
  tankTower: {
    name: "Tank tower",
    meaning: "A tower only a tank soaks. The number says how many players soak it.",
    icon: TankTowerIcon,
    // In the shield's wide upper half, clear of its tip.
    countLook: "-translate-y-[8cqw] text-[42cqw]",
    soaked: true,
  },
  wildCharge: {
    name: "Wild charge",
    meaning: "A line stack with a tank or a rock in front, to take the biggest hit.",
    icon: WildChargeIcon,
  },
  later: { name: "Saved for later", meaning: "Act on what the boss showed earlier.", icon: SavedForLaterIcon },
  knockback: { name: "Knockback", meaning: "Stand where the knockback throws you to your spot.", icon: KnockbackIcon },
  stretchTether: {
    name: "Stretch tether",
    meaning: "Move away from the other end of your tether until it is long enough.",
    icon: StretchTetherIcon,
  },
  tankBuster: { name: "Tank buster", meaning: "A heavy hit on one tank.", icon: TankBusterIcon },
  sharedTankBuster: {
    name: "Shared tank buster",
    meaning: "A heavy hit that two tanks share.",
    icon: SharedTankBusterIcon,
    count: "2",
    countLook: "text-[50cqw]",
  },
};

export interface MechanicIconProps {
  kind: DrillKind;
  /** A tower's number: how many players soak it (Drill.soak). Other kinds take theirs from KINDS. */
  soak?: number;
  /** The size and colour of the icon. */
  className?: string;
}

/** The icon of what you do in a mechanic (spread, stack...), with a stack's number in its middle.
    It is only a picture: the text next to it, or a label, says the same in words. */
export function MechanicIcon({ kind, soak, className }: MechanicIconProps) {
  const { icon: Icon, countLook, soaked } = KINDS[kind];
  const count = soaked ? soak?.toString() : KINDS[kind].count;
  if (!count) return <Icon aria-hidden="true" className={cn("size-4", className)} />;
  // A container, so the number takes its size from the icon's (cqw is a percent of its width), at
  // any size.
  return (
    <span aria-hidden="true" className={cn("@container relative inline-grid size-4 place-items-center", className)}>
      <Icon className="size-full" />
      <span
        className={cn(
          // The number of players, in the highlight colour, like a player's dot (icons.tsx, rule 2).
          "absolute font-sans font-bold text-count",
          // The size goes before leading-none: cn drops a line height that comes before a size.
          countLook ?? "text-[70cqw]",
          "leading-none",
        )}
      >
        {count}
      </span>
    </span>
  );
}
