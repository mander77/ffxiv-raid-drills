// Your Pressure settings, kept in this browser: the seconds to decide in the quick round, whether
// the run stops at each new mechanic, the pattern picks of the full fight, and the speed of
// Watch the correct moves.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type Choices, cleanChoices, RANDOM } from "../data/fights/m11s/fight";

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
  choices: Choices;
  speed: Speed;
  setSecs: (secs: DecideSeconds) => void;
  setStops: (stops: boolean) => void;
  setChoices: (choices: Choices) => void;
  setSpeed: (speed: Speed) => void;
}

const pick = <T>(list: readonly T[], v: unknown, d: T): T => (list.includes(v as T) ? (v as T) : d);

export const usePressureStore = create<PressureState>()(
  persist(
    (set) => ({
      secs: 6,
      stops: false,
      choices: RANDOM,
      speed: 1,
      setSecs: (secs) => set({ secs }),
      setStops: (stops) => set({ stops }),
      setChoices: (choices) => set({ choices }),
      setSpeed: (speed) => set({ speed }),
    }),
    {
      name: "raid-drills-pressure",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ secs: s.secs, stops: s.stops, choices: s.choices, speed: s.speed }),
      // The shape of the saved data. merge checks each value, so saved data of another version
      // goes to merge as it is.
      version: 1,
      migrate: (saved) => saved,
      // A saved value the app does not know (an old or edited one) falls back to the default.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<PressureState>;
        return {
          ...current,
          secs: pick(DECIDE_SECONDS, s.secs, current.secs),
          stops: s.stops === true,
          choices: cleanChoices(s.choices),
          speed: pick(SPEEDS, s.speed, current.speed),
        };
      },
    },
  ),
);
