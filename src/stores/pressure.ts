// Your Pressure settings, kept in this browser: the seconds to decide in the quick round, whether
// the run stops at each new mechanic, the pattern picks of each fight, and the speed of
// Watch the correct moves.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { FIGHTS } from "../data/fights";
import type { FightData } from "../data/fights/types";
import type { Choices } from "../types";

/** The seconds to decide that the quick round offers. */
export const DECIDE_SECONDS = [4, 6, 8, 10] as const;
// TS note: `(typeof X)[number]` is the type of one item of a const array: here 4 | 6 | 8 | 10.
export type DecideSeconds = (typeof DECIDE_SECONDS)[number];
/** The speeds of Watch the correct moves. */
export const SPEEDS = [0.5, 1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

interface PressureState {
  secs: DecideSeconds;
  stops: boolean;
  /** The pattern picks of each fight, by fight id. */
  choices: Partial<Record<string, Choices>>;
  speed: Speed;
  setSecs: (secs: DecideSeconds) => void;
  setStops: (stops: boolean) => void;
  setChoices: (fight: string, choices: Choices) => void;
  setSpeed: (speed: Speed) => void;
}

const pick = <T>(list: readonly T[], v: unknown, d: T): T => (list.includes(v as T) ? (v as T) : d);

export const usePressureStore = create<PressureState>()(
  persist(
    (set) => ({
      secs: 6,
      stops: false,
      choices: {},
      speed: 1,
      setSecs: (secs) => set({ secs }),
      setStops: (stops) => set({ stops }),
      setChoices: (fight, choices) => set((st) => ({ choices: { ...st.choices, [fight]: choices } })),
      setSpeed: (speed) => set({ speed }),
    }),
    {
      name: "raid-drills-pressure",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ secs: s.secs, stops: s.stops, choices: s.choices, speed: s.speed }),
      // The shape of the saved data. merge checks each value, so saved data of another version
      // goes to merge as it is. Version 2 keeps the picks of each fight.
      version: 2,
      migrate: (saved) => saved,
      // A saved value the app does not know (an old or edited one) falls back to the default.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<PressureState>;
        return {
          ...current,
          secs: pick(DECIDE_SECONDS, s.secs, current.secs),
          stops: s.stops === true,
          choices: Object.fromEntries(FIGHTS.map((f) => [f.id, f.clock.clean(s.choices?.[f.id])])),
          speed: pick(SPEEDS, s.speed, current.speed),
        };
      },
    },
  ),
);

/** Your picks for a fight, for a selector: usePressureStore((s) => choicesOf(s, fight)). */
export const choicesOf = (st: Pick<PressureState, "choices">, fight: FightData): Choices => st.choices[fight.id] ?? fight.clock.random;
