import { cn } from "@/lib/utils";
import { CATEGORIES, type Category } from "../data/fights/m11s/abilities";
import {
  AvoidableAoeIcon,
  EnrageIcon,
  type LucideIcon,
  MechanicCategoryIcon,
  PositioningIcon,
  RaidDamageIcon,
  TankDamageIcon,
  TargetedAoeIcon,
} from "./icons";

// TS note: `Record<Category, LucideIcon>` is like a `Dictionary<Category, LucideIcon>` that the
// compiler checks is full: leave out a category and it is a compile error.
/** The icon of each ability category: its shape tells the categories apart (rule 14 in icons.tsx). */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  raid: RaidDamageIcon,
  tank: TankDamageIcon,
  spot: PositioningIcon,
  dodge: AvoidableAoeIcon,
  target: TargetedAoeIcon,
  mech: MechanicCategoryIcon,
  enrage: EnrageIcon,
};

/** The text colour of each category, for its icon. Complete class names, so Tailwind finds them. */
export const CATEGORY_TEXT: Record<Category, string> = {
  raid: "text-cat-raid",
  tank: "text-cat-tank",
  spot: "text-cat-spot",
  dodge: "text-cat-dodge",
  target: "text-cat-target",
  mech: "text-cat-mech",
  enrage: "text-cat-enrage",
};

/** The background colour of each category, for a cast's square. A row with no category gets grey. */
export const CATEGORY_BG: Record<Category | "none", string> = {
  raid: "bg-cat-raid",
  tank: "bg-cat-tank",
  spot: "bg-cat-spot",
  dodge: "bg-cat-dodge",
  target: "bg-cat-target",
  mech: "bg-cat-mech",
  enrage: "bg-cat-enrage",
  none: "bg-cat-none",
};

/** The border colour of each category, for an outlined square. Complete class names, so Tailwind finds them. */
export const CATEGORY_BORDER: Record<Category | "none", string> = {
  raid: "border-cat-raid",
  tank: "border-cat-tank",
  spot: "border-cat-spot",
  dodge: "border-cat-dodge",
  target: "border-cat-target",
  mech: "border-cat-mech",
  enrage: "border-cat-enrage",
  none: "border-cat-none",
};

// TS note: a component's props get a named interface, `<Name>Props`, like a parameter class in C#.
// A call that leaves out a prop, or gives the wrong type, is a compile error.
export interface CategoryIconsProps {
  cats: readonly Category[];
  /** Classes for the group of icons, such as its margin. Each icon is 16 px. */
  className?: string;
  /** Draw the icons in the text colour, not their categories' colours: for a label on a dark or
      light fill, where some category colours would not show. */
  plain?: boolean;
}

// TS note: a React component is a function that takes one object, its props, and returns JSX.
// `{ cats, className, plain = false }: CategoryIconsProps` takes the props apart and gives plain a
// default.
/** The icons of a timeline row, one per ability category, each in its category's colour. A row with
    no category shows none. The names beside them are the text a screen reader reads. */
export function CategoryIcons({ cats, className, plain = false }: CategoryIconsProps) {
  if (!cats.length) return null;
  return (
    <span className={cn("inline-flex flex-none items-center gap-0.5 align-middle", className)} aria-hidden="true">
      {/* TS note: `{...}` inside JSX runs TypeScript. Each item of a list gets a `key`, so React can
          match it up when the list changes. */}
      {cats.map((c) => {
        const Icon = CATEGORY_ICON[c];
        return <Icon key={c} className={cn("size-4", !plain && CATEGORY_TEXT[c])} />;
      })}
    </span>
  );
}

/** The category names of a row, joined: "Raid Damage, Mechanic". */
export const categoryNames = (cats: readonly Category[]): string => cats.map((c) => CATEGORIES[c]).join(", ") || "No category";
