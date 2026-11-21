// Your party slot (H1 or H2), kept in this browser.
// TS note: Zustand keeps app state outside the components. `create` makes a hook, useSlotStore,
// that a component calls to read the state; the component draws again when what it read changes.
// Code outside React reads it with useSlotStore.getState() and listens with subscribe().
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Slot } from "../types";

interface SlotState {
  slot: Slot;
  setSlot: (slot: Slot) => void;
}

// TS note: create<SlotState>()(...) has two calls on purpose: the first fixes the type, the second
// takes the store. It is how Zustand types a store with middleware such as persist.
export const useSlotStore = create<SlotState>()(
  // persist saves the state in localStorage under "raid-drills-slot" and reads it back on load.
  persist(
    (set) => ({
      slot: "H1",
      setSlot: (slot) => set({ slot }),
    }),
    {
      name: "raid-drills-slot",
      storage: createJSONStorage(() => localStorage),
      // Save only the slot, not the function.
      partialize: (s) => ({ slot: s.slot }),
      // A saved value that is not a slot (an old or edited one) falls back to H1.
      merge: (saved, current) => ({ ...current, slot: (saved as Partial<SlotState> | undefined)?.slot === "H2" ? "H2" : "H1" }),
    },
  ),
);
