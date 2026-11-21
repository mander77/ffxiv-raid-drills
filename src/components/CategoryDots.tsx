import { cn } from "@/lib/utils";
import { CATEGORIES, type Category } from "../data/abilities";

/** The Tailwind background colour of each category, for its marks. A row with no category gets
    grey. The cast list colours its icons with it too. */
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

/** The border colour of each category, for an outlined mark. Complete class names, so Tailwind finds them. */
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
export interface CategoryDotsProps {
  cats: readonly Category[];
  /** "sm" is 8 px, for the colour key. "md" is 10 px, next to a row's category names. */
  size?: "sm" | "md";
}

// TS note: a React component is a function that takes one object, its props, and returns JSX.
// `{ cats, size = "sm" }: CategoryDotsProps` takes the props apart and gives size a default.
/** The coloured marks of a timeline row, one per ability category. */
export function CategoryDots({ cats, size = "sm" }: CategoryDotsProps) {
  const shown: Array<Category | "none"> = cats.length ? [...cats] : ["none"];
  return (
    <span className="inline-flex flex-none gap-0.5" aria-hidden="true">
      {/* TS note: `{...}` inside JSX runs TypeScript. Each item of a list gets a `key`, so React can
          match it up when the list changes. */}
      {shown.map((c) => (
        <span key={c} className={cn("block rounded-full", size === "md" ? "size-2.5" : "size-2", CATEGORY_BG[c])} />
      ))}
    </span>
  );
}

/** The category names of a row, joined: "Raid damage, Mechanic". */
export const categoryNames = (cats: readonly Category[]): string => cats.map((c) => CATEGORIES[c]).join(", ") || "No category";
