// Your progress: how you did on each question and drill, kept in this browser, and the round you
// are on in each tab, kept until you reload the page.
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

/** The scores with one more answer to question or drill id. */
function withAnswer(scores: Record<string, Score>, id: string, ok: boolean): Record<string, Score> {
  const was = scores[id] ?? { seen: 0, correct: 0 };
  return { ...scores, [id]: { seen: was.seen + 1, correct: was.correct + (ok ? 1 : 0) } };
}

const NEW_ROUND: Round = { slot: null, done: 0, correct: 0, current: null, finished: false };
const NO_ROUNDS: Record<RoundTab, Round> = { learn: NEW_ROUND, timeline: NEW_ROUND, practice: NEW_ROUND };

interface ProgressState {
  scores: Record<string, Score>;
  rounds: Record<RoundTab, Round>;
  /** Count an answer to a question or drill, in its score and in the round of its tab. A round
      belongs to one slot: an answer for another slot starts a new round. */
  record: (id: string, ok: boolean, tab: RoundTab, slot: Slot) => void;
  /** Count an answer in its score only, for the quick round on Pressure, which keeps its own count. */
  score: (id: string, ok: boolean) => void;
  /** Remember the card you are on in a tab. */
  visit: (tab: RoundTab, current: string) => void;
  /** End the round of a tab, after its last card. */
  finish: (tab: RoundTab) => void;
  /** Start the round of a tab again, from its first card. */
  newRound: (tab: RoundTab) => void;
  /** Erase every score and round. */
  reset: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      scores: {},
      rounds: NO_ROUNDS,
      record: (id, ok, tab, slot) =>
        set((st) => {
          const round = st.rounds[tab].slot === slot ? st.rounds[tab] : { ...st.rounds[tab], slot, done: 0, correct: 0 };
          return {
            scores: withAnswer(st.scores, id, ok),
            rounds: { ...st.rounds, [tab]: { ...round, done: round.done + 1, correct: round.correct + (ok ? 1 : 0) } },
          };
        }),
      score: (id, ok) => set((st) => ({ scores: withAnswer(st.scores, id, ok) })),
      visit: (tab, current) =>
        set((st) =>
          st.rounds[tab].current === current && !st.rounds[tab].finished
            ? st
            : { rounds: { ...st.rounds, [tab]: { ...st.rounds[tab], current, finished: false } } },
        ),
      finish: (tab) => set((st) => ({ rounds: { ...st.rounds, [tab]: { ...st.rounds[tab], finished: true } } })),
      newRound: (tab) => set((st) => ({ rounds: { ...st.rounds, [tab]: NEW_ROUND } })),
      reset: () => set({ scores: {}, rounds: NO_ROUNDS }),
    }),
    {
      name: "raid-drills-progress",
      storage: createJSONStorage(() => localStorage),
      // Keep the scores; a round starts again with each visit.
      partialize: (st) => ({ scores: st.scores }),
      // Version 1 calls a correct answer `correct`; version 0 called it `right`. Scores saved before
      // keep their counts.
      // TS note: `as` tells the compiler the shape of the saved data, which it cannot check itself.
      version: 1,
      migrate: (saved, version) => {
        const old = saved as { scores?: Record<string, { seen: number; right?: number; correct?: number }> };
        if (version > 0 || !old.scores) return saved as Pick<ProgressState, "scores">;
        const scores: Record<string, Score> = {};
        for (const [id, s] of Object.entries(old.scores)) scores[id] = { seen: s.seen, correct: s.correct ?? s.right ?? 0 };
        return { scores };
      },
    },
  ),
);
