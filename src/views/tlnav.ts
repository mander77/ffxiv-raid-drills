// The colour marks for the fight's ability categories, as HTML text, for the full fight (its
// timeline and hit names) and the Timeline card picture. The React screens use the Marks component.
import { CATS, type Cat } from "../data/abilities";

/** The coloured marks of a row. A row with no category gets a grey one. */
export function marks(cats: readonly Cat[]): string {
  const shown: Array<Cat | "none"> = cats.length ? [...cats] : ["none"];
  return '<span class="cms" aria-hidden="true">' + shown.map(c => '<i class="cm ' + c + '"></i>').join("") + "</span>";
}
export const catNames = (cats: readonly Cat[]): string => cats.map(c => CATS[c]).join(", ") || "No category";
