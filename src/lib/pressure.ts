// The rules of Pressure, as plain functions: which cards the quick round asks, its timer (time to
// read, then time to decide), and the address of the player.
import type { ChoiceRow, FightData } from "../data/fights/types";
import type { Score } from "../stores/progress";
import type { Choices, QuizItem } from "../types";
import { readingMs } from "../util";

/** How many cards a quick round asks. */
export const QUICK_SIZE = 12;

/** How often a card should come up: a card you never saw, or often answered incorrectly, comes up more. A
    card you answered correctly a few times comes up less, but never stops. */
export function weight(score: Score | undefined): number {
  if (!score) return 3;
  const incorrect = score.seen - score.correct;
  return Math.max(0.3, 1 + 3 * incorrect - 0.25 * Math.min(score.correct, 3));
}

/** The list in a random order where a card with more weight tends to come first. */
export function weighted<T extends { id: string }>(
  list: readonly T[],
  scores: Record<string, Score>,
  random: () => number = Math.random,
): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (pool.length) {
    const ws = pool.map((x) => weight(scores[x.id]));
    let left = ws.reduce((a, b) => a + b, 0) * random();
    let i = 0;
    for (; i < ws.length - 1; i++) {
      left -= ws[i];
      if (left <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** The cards of a new quick round: QUICK_SIZE cards from Learn and Timeline. */
export const quickRound = (fight: FightData, scores: Record<string, Score>, random: () => number = Math.random): QuizItem[] =>
  weighted([...fight.learnCards, ...fight.timelineCards], scores, random).slice(0, QUICK_SIZE);

/** The timer of one card: the time to read it (from the length of the question and its answers),
    then the seconds you chose to decide. */
export interface Timer {
  readMs: number;
  decideMs: number;
}
export const timerOf = (texts: string[], decideSecs: number): Timer => ({ readMs: readingMs(texts), decideMs: decideSecs * 1000 });

/** The timer bar at `ms` into a card: reading (the bar fills) or deciding (it drains), how full it
    is from 0 to 1, and whether it is low (the last third). */
export function timerAt(t: Timer, ms: number): { reading: boolean; fill: number; low: boolean } {
  if (ms < t.readMs) return { reading: true, fill: ms / t.readMs, low: false };
  const fill = Math.max(0, 1 - (ms - t.readMs) / t.decideMs);
  return { reading: false, fill, low: fill < 0.34 };
}

/** For a link: "raw=axe,ult=cw", in the order of the rows. Choices left on "random" are left out. */
export const choicesText = (rows: readonly ChoiceRow[], c: Choices): string =>
  rows
    .filter((r) => c[r.key] !== undefined && c[r.key] !== "random")
    .map((r) => `${r.key}=${c[r.key]}`)
    .join(",");

/** The choices in a link's text, checked by the fight's `clean`. */
export const parseChoices = (fight: FightData, text: string): Choices =>
  fight.clock.clean(Object.fromEntries(text.split(",").map((p) => p.split("="))));

/** The address of the player for a fight, after the fight's base: its code, its picks (when any
    is set) and the moment. */
export function playerLink(fight: FightData, code: string, choices: Choices, t?: number): string {
  const picks = choicesText(fight.clock.rows, choices);
  return `/pressure/${code}${picks ? `/${picks}` : ""}${t ? `?t=${Math.round(t * 10) / 10}` : ""}`;
}
