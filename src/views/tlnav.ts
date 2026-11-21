// The colour marks for the fight's ability categories, as text, for the screens that still build
// HTML as text. The screens built with Preact use the Marks and CatKey components.
// The cheat sheet timeline and the full fight (its timeline and hit names) use the same colours.
import { CATS, type Cat } from "../data/abilities";

/** The categories to mark for a row. A row with no category gets a grey "none" mark. */
export const shownCats = (cats: readonly Cat[]): Array<Cat | "none"> => cats.length ? [...cats] : ["none"];

/** The coloured marks of a row. */
export function marks(cats: readonly Cat[]): string {
  return '<span class="cms" aria-hidden="true">' + shownCats(cats).map(c => '<i class="cm ' + c + '"></i>').join("") + "</span>";
}
export const catNames = (cats: readonly Cat[]): string => cats.map(c => CATS[c]).join(", ") || "No category";
