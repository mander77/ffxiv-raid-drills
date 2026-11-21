// Your progress: how you did on each question and drill, kept in this browser, and the round you
// are on in each tab, kept until you reload the page.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Slot } from "../types";

/** How often you answered one question or drill (`seen`), and how often you were right. */
export interface Score {
  seen: number;
  right: number;
}

/** The round on one tab: the answers so far and how many were right, for one slot, and the card
    you were on, so the tab opens there again. `finished` is true after the last card. */
export interface Round {
  slot: Slot | null;
  done: number;
  right: number;
  card: string | null;
  finished: boolean;
}

/** The tabs that count a round. */
export type RoundTab = "mech" | "next";

const NEW_ROUND: Round = { slot: null, done: 0, right: 0, card: null, finished: false };
const NO_ROUNDS: Record<RoundTab, Round> = { mech: NEW_ROUND, next: NEW_ROUND };

interface ProgressState {
  scores: Record<string, Score>;
  rounds: Record<RoundTab, Round>;
  /** Count an answer to a question or drill, in its score and in the round of its tab. A round
      belongs to one slot: an answer for another slot starts a new round. */
  record: (id: string, ok: boolean, tab: RoundTab, slot: Slot) => void;
  /** Remember the card you are on in a tab. */
  visit: (tab: RoundTab, card: string) => void;
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
          const was = st.scores[id] ?? { seen: 0, right: 0 };
          const round = st.rounds[tab].slot === slot ? st.rounds[tab] : { ...st.rounds[tab], slot, done: 0, right: 0 };
          return {
            scores: { ...st.scores, [id]: { seen: was.seen + 1, right: was.right + (ok ? 1 : 0) } },
            rounds: { ...st.rounds, [tab]: { ...round, done: round.done + 1, right: round.right + (ok ? 1 : 0) } },
          };
        }),
      visit: (tab, card) =>
        set((st) =>
          st.rounds[tab].card === card && !st.rounds[tab].finished
            ? st
            : { rounds: { ...st.rounds, [tab]: { ...st.rounds[tab], card, finished: false } } },
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
    },
  ),
);
