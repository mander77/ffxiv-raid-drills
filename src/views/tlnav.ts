// The colour marks for the fight's ability categories, and the key that explains them. The cheat
// sheet timeline and the full fight (its timeline and hit names) use the same colours.
import { CATS, type Cat } from "../data/abilities";

/** The coloured marks of a row. A row with no category gets a grey one. */
export function marks(cats: Cat[]): string {
  return '<span class="cms" aria-hidden="true">' + (cats.length ? cats : ["none"]).map(c => '<i class="cm ' + c + '"></i>').join("") + "</span>";
}
export const catNames = (cats: Cat[]): string => cats.map(c => CATS[c]).join(", ") || "No category";
/** The colour key: every category with its mark. */
export const catKey = (): string =>
  '<div class="cmkey">' + (Object.keys(CATS) as Cat[]).map(c => "<span>" + marks([c]) + CATS[c] + "</span>").join("") + "</div>";
