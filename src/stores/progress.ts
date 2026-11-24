// Your progress: how you did on each question and drill, for each slot, kept in this browser, and
// the round you are on in each tab, kept until you reload the page.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Slot } from "../types";

/** How often you answered one question or drill (`seen`), and how often you were correct. */
export interface Score {
  seen: number;
  correct: number;
}

/** The round on one tab: the answers so far and how many were correct, for one slot, and the card
    you were on (`current`), so the tab opens there again. `finished` is true after the last card. */
export interface Round {
  slot: Slot | null;
  done: number;
  correct: number;
  current: string | null;
  finished: boolean;
}

/** The tabs that count a round: Learn, Timeline and Practice. */
export type RoundTab = "learn" | "timeline" | "practice";

/** The scores of one slot, by question or drill id. */
export type SlotScores = Record<string, Score>;
/** The scores of every slot. The correct answers differ by slot, so each slot keeps its own.
    TS note: Partial<Record<Slot, X>> is an object that may have a key for each slot, like a C#
    Dictionary<Slot, X> that starts empty. */
export type Scores = Partial<Record<Slot, SlotScores>>;

/** The scores and the rounds of every fight, by fight id. */
export type FightScores = Partial<Record<string, Scores>>;
type FightRounds = Partial<Record<string, Record<RoundTab, Round>>>;

/** The scores of a slot with no answers yet. One shared object, so a selector that reads it
    gives the same value each time. */
const NO_SCORES: SlotScores = {};

/** The scores with one more answer to question or drill id, for slot. */
function withAnswer(scores: Scores, slot: Slot, id: string, ok: boolean): Scores {
  const mine = scores[slot] ?? NO_SCORES;
  const was = mine[id] ?? { seen: 0, correct: 0 };
  return { ...scores, [slot]: { ...mine, [id]: { seen: was.seen + 1, correct: was.correct + (ok ? 1 : 0) } } };
}

/** Every fight's scores, with one more answer in one fight. */
const withFightAnswer = (all: FightScores, fight: string, slot: Slot, id: string, ok: boolean): FightScores => ({
  ...all,
  [fight]: withAnswer(all[fight] ?? {}, slot, id, ok),
});

const NEW_ROUND: Round = { slot: null, done: 0, correct: 0, current: null, finished: false };
const NO_ROUNDS: Record<RoundTab, Round> = { learn: NEW_ROUND, timeline: NEW_ROUND, practice: NEW_ROUND };

/** Every fight's rounds, with one tab's round in one fight changed by `change`. */
function withRound(all: FightRounds, fight: string, tab: RoundTab, change: (r: Round) => Round): FightRounds {
  const rounds = all[fight] ?? NO_ROUNDS;
  return { ...all, [fight]: { ...rounds, [tab]: change(rounds[tab]) } };
}

interface ProgressState {
  scores: FightScores;
  rounds: FightRounds;
  /** Count an answer to a question or drill of a fight, in its score and in the round of its
      tab. A round belongs to one slot: an answer for another slot starts a new round. */
  record: (fight: string, id: string, ok: boolean, tab: RoundTab, slot: Slot) => void;
  /** Count an answer in its score only, for the quick round and the run on Pressure, which keep
      their own count. */
  score: (fight: string, id: string, ok: boolean, slot: Slot) => void;
  /** Remember the card you are on in a tab. */
  visit: (fight: string, tab: RoundTab, current: string) => void;
  /** End the round of a tab, after its last card. */
  finish: (fight: string, tab: RoundTab) => void;
  /** Start the round of a tab again, from its first card. */
  newRound: (fight: string, tab: RoundTab) => void;
  /** Erase every score and round of a fight, of every slot. */
  reset: (fight: string) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      scores: {},
      rounds: {},
      record: (fight, id, ok, tab, slot) =>
        set((st) => ({
          scores: withFightAnswer(st.scores, fight, slot, id, ok),
          rounds: withRound(st.rounds, fight, tab, (r) => {
            const round = r.slot === slot ? r : { ...r, slot, done: 0, correct: 0 };
            return { ...round, done: round.done + 1, correct: round.correct + (ok ? 1 : 0) };
          }),
        })),
      score: (fight, id, ok, slot) => set((st) => ({ scores: withFightAnswer(st.scores, fight, slot, id, ok) })),
      visit: (fight, tab, current) =>
        set((st) => {
          const r = roundOf(st, fight, tab);
          return r.current === current && !r.finished
            ? st
            : { rounds: withRound(st.rounds, fight, tab, (was) => ({ ...was, current, finished: false })) };
        }),
      finish: (fight, tab) => set((st) => ({ rounds: withRound(st.rounds, fight, tab, (r) => ({ ...r, finished: true })) })),
      newRound: (fight, tab) => set((st) => ({ rounds: withRound(st.rounds, fight, tab, () => NEW_ROUND) })),
      reset: (fight) => set((st) => ({ scores: { ...st.scores, [fight]: {} }, rounds: { ...st.rounds, [fight]: NO_ROUNDS } })),
    }),
    {
      name: "raid-drills-progress",
      storage: createJSONStorage(() => localStorage),
      // Keep the scores; a round starts again with each visit.
      partialize: (st) => ({ scores: st.scores }),
      // The shape of the saved data. Saved data of another version is dropped: version 2 keeps
      // the scores of each fight.
      version: 2,
      migrate: () => ({ scores: {} }),
    },
  ),
);

/** The scores of one slot in one fight, for a selector:
    useProgressStore((st) => scoresOf(st, fight, slot)). */
export function scoresOf(st: Pick<ProgressState, "scores">, fight: string, slot: Slot): SlotScores {
  return st.scores[fight]?.[slot] ?? NO_SCORES;
}

/** The round of one tab in one fight, for a selector. */
export function roundOf(st: Pick<ProgressState, "rounds">, fight: string, tab: RoundTab): Round {
  return st.rounds[fight]?.[tab] ?? NEW_ROUND;
}
