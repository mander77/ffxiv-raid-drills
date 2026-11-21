import type { Cat } from "../data/abilities";
import { shownCats } from "../views/tlnav";

// TS note: a component's props get a named interface, `<Name>Props`, like a parameter class in C#.
// A call that leaves out a prop, or gives the wrong type, is a compile error.
export interface MarksProps {
  cats: readonly Cat[];
}

// TS note: a Preact component is a function that takes one object, its props, and returns JSX.
// `{cats}: MarksProps` takes the props object apart, like deconstructing a C# record.
/** The coloured marks of a timeline row, one per ability category. A row with no category gets a
    grey mark. */
export function Marks({cats}: MarksProps) {
  // TS note: `{...}` inside JSX runs TypeScript. An array of elements shows one after the other.
  // Each one in a list gets a `key`, so Preact can match it up when the list changes.
  return <span class="cms" aria-hidden="true">{shownCats(cats).map(c => <i key={c} class={"cm " + c} />)}</span>;
}
