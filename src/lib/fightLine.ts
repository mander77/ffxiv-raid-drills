// The rows of the fight line (FightLine), as plain data and functions: which rows a line shows,
// and the rows of the line that stands still, the whole fight with its Practice mechanics.
import { ABILITIES, type Category } from "../data/abilities";
import { DRILLS } from "../data/drills";
import { clock, sec } from "../time";

// TS note: a union of a type and a string literal. A LineType is one of the ability categories
// ("raid", "tank"...) or the word "practice", like an enum with one extra member.
/** What a fight line can be told to show: the rows of an ability category, or "practice", the
    Practice mechanics. */
export type LineType = Category | "practice";

/** One row of the fight line that stands still: an ability, or a Practice mechanic. */
export interface LineRow {
  /** Unique in the line, for React. */
  key: string;
  /** When it happens, in seconds into the fight; the line is in this order. */
  t: number;
  /** When it happens, as the screen shows it ("0:48", or "0:18 or 2:36" for a mechanic). */
  when: string;
  name: string;
  phase: string;
  cats: Category[];
  /** A Practice mechanic: its id, for its address. */
  drill?: string;
}

/** True when a line told to show `types` shows a row with these categories, or a Practice mechanic.
    With no types, it shows every row. */
export function shows(row: { cats: readonly Category[]; drill?: string }, types?: readonly LineType[]): boolean {
  if (!types) return true;
  return (row.drill !== undefined && types.includes("practice")) || row.cats.some((c) => types.includes(c));
}

/** "0:18 or 2:36" to 18: the first time a mechanic happens. */
const firstTime = (when: string): number => sec(when.split(" ")[0]);

/** The whole fight for a line that stands still: every ability, and every Practice mechanic at
    its first time. Mechanics at the same time keep their Practice order. */
export const FIGHT_ROWS: readonly LineRow[] = [
  ...ABILITIES.map(
    (a, i): LineRow => ({
      key: `a${i}`,
      t: a.t,
      when: clock(a.t),
      name: a.name,
      phase: a.phase,
      cats: a.cats,
    }),
  ),
  ...[...DRILLS]
    .sort((a, b) => a.order - b.order)
    .map((d): LineRow => ({ key: d.id, t: firstTime(d.time), when: d.time, name: d.title, phase: d.phase, cats: [], drill: d.id })),
].sort((a, b) => a.t - b.t);

/** Where each row sits along a line that stands still, in pixels from the first: a second of the
    fight is `perSecond` pixels, but two rows stay at least `gap` apart, so their names never
    overlap, and at most `most`, so a long wait between mechanics does not leave a long empty line.
    `times` are in fight order. */
export function linePlaces(times: readonly number[], perSecond: number, gap: number, most: number): number[] {
  let at = 0;
  return times.map((t, k) => {
    if (k > 0) at += Math.min(most, Math.max(gap, (t - times[k - 1]) * perSecond));
    return at;
  });
}
