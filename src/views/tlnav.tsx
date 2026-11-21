// The colour marks for the fight's ability categories, and the key that explains them. The cheat
// sheet timeline and the full fight (its timeline and hit names) use the same colours.
// The string version (marks) is for the screens that still build HTML as text. The components
// (Marks, CatKey) are for the screens built with Preact.
import { CATS, type Cat } from "../data/abilities";

const shown = (cats: Cat[]): Array<Cat | "none"> => cats.length ? cats : ["none"];

/** The coloured marks of a row. A row with no category gets a grey one. */
export function marks(cats: Cat[]): string {
  return '<span class="cms" aria-hidden="true">' + shown(cats).map(c => '<i class="cm ' + c + '"></i>').join("") + "</span>";
}
export const catNames = (cats: Cat[]): string => cats.map(c => CATS[c]).join(", ") || "No category";

// TS note: a Preact component is a function that takes one object, its props, and returns JSX.
// `{cats}: {cats: Cat[]}` takes the props object apart and types it in one go, like a C# record
// parameter. JSX such as <span class="cms"> compiles to a function call, so the compiler checks
// every tag and attribute. Preact uses `class`, the same as HTML.
/** The coloured marks of a row, as a component. */
export function Marks({cats}: {cats: Cat[]}) {
  // TS note: `{...}` inside JSX runs TypeScript. An array of elements shows one after the other.
  // Each one in a list gets a `key`, so Preact can match it up when the list changes.
  return <span class="cms" aria-hidden="true">{shown(cats).map(c => <i key={c} class={"cm " + c}></i>)}</span>;
}

/** The colour key: every category with its mark. */
export function CatKey() {
  return <div class="cmkey">{(Object.keys(CATS) as Cat[]).map(c => <span key={c}><Marks cats={[c]} />{CATS[c]}</span>)}</div>;
}
