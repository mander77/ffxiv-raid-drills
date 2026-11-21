import { createContext, useContext, useEffect, useEffectEvent } from "react";
import type { FightState } from "../lib/fight";

/** A function that runs on every frame of the fight clock. */
export type FrameFn = (s: FightState) => void;

/** The functions that run on every frame of the fight clock. The fight screen owns the set and
    its frame loop; each part of the screen that moves (the cast bar, the timeline, your marker)
    adds its function with useFightFrame. */
export const FightFrameContext = createContext<Set<FrameFn> | null>(null);

/** Run fn on every frame of the fight clock. fn moves its own elements through refs, so the
    clock moves without drawing React components again 60 times a second. A part that must change
    what it draws calls a state setter in fn, which draws again only when the value changes. */
export function useFightFrame(fn: FrameFn): void {
  const frames = useContext(FightFrameContext);
  // TS note: useEffectEvent gives a function that always calls the latest fn, so the set gets one
  // entry per component, added once.
  const onFrame = useEffectEvent(fn);
  useEffect(() => {
    if (!frames) return;
    const f: FrameFn = (s) => onFrame(s);
    frames.add(f);
    return () => {
      frames.delete(f);
    };
  }, [frames]);
}
