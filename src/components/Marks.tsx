import { cn } from "@/lib/utils";
import { CATS, type Cat } from "../data/abilities";

/** The Tailwind colour of each category's mark. A row with no category gets grey. */
const DOT: Record<Cat | "none", string> = {
  raid: "bg-cat-raid",
  tank: "bg-cat-tank",
  spot: "bg-cat-spot",
  dodge: "bg-cat-dodge",
  target: "bg-cat-target",
  mech: "bg-cat-mech",
  enrage: "bg-cat-enrage",
  none: "bg-cat-none",
};

// TS note: a component's props get a named interface, `<Name>Props`, like a parameter class in C#.
// A call that leaves out a prop, or gives the wrong type, is a compile error.
export interface MarksProps {
  cats: readonly Cat[];
  /** "sm" is 8 px, for the colour key. "md" is 10 px, next to a row's category names. */
  size?: "sm" | "md";
}

// TS note: a React component is a function that takes one object, its props, and returns JSX.
// `{ cats, size = "sm" }: MarksProps` takes the props apart and gives size a default.
/** The coloured marks of a timeline row, one per ability category. */
export function Marks({ cats, size = "sm" }: MarksProps) {
  const shown: Array<Cat | "none"> = cats.length ? [...cats] : ["none"];
  return (
    <span className="inline-flex flex-none gap-0.5" aria-hidden="true">
      {/* TS note: `{...}` inside JSX runs TypeScript. Each item of a list gets a `key`, so React can
          match it up when the list changes. */}
      {shown.map((c) => (
        <i key={c} className={cn("block rounded-full", size === "md" ? "size-2.5" : "size-2", DOT[c])} />
      ))}
    </span>
  );
}

/** The category names of a row, joined: "Raid damage, Mechanic". */
export const catNames = (cats: readonly Cat[]): string => cats.map((c) => CATS[c]).join(", ") || "No category";
