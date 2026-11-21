import { useCallback, useEffect, useRef } from "react";

/** A timer that belongs to a component. `later(fn, ms)` runs fn after ms, and cancels the one before,
    so a second click starts the wait again. The timer stops when the component leaves the page.
    Call it from an event handler: what a click starts belongs in the click handler, not in an effect. */
export function useTimeout(): (fn: () => void, ms: number) => void {
  // TS note: useRef holds a value between draws without drawing again: here, the timer's id.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Stop the timer when the component leaves the page.
  useEffect(() => () => clearTimeout(timer.current), []);
  // TS note: useCallback keeps the same function between draws, so a component can pass it on safely.
  return useCallback((fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);
}
