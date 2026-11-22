import { useEffect, useEffectEvent } from "react";

/** How far one arrow key moves the player's clock, in seconds. The app's choice. */
const ARROW_SECONDS = 5;

export interface FightKeyHandlers {
  /** Space: play or pause. */
  onPlayPause: () => void;
  /** The arrows: move the clock this many seconds (less than 0 is back). Left out, the arrows do nothing. */
  onSkip?: (seconds: number) => void;
  /** Enter: returns whether it did something. Left out, or false, Enter stays the browser's. */
  onEnter?: () => boolean;
}

/** The fight's keys: Space, the arrows and Enter. Keys with Alt, Ctrl or Cmd, and keys on a
    button, the slider or in Settings (a dialog), stay theirs. */
export function useFightKeys({ onPlayPause, onSkip, onEnter }: FightKeyHandlers): void {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "BUTTON" || target?.tagName === "INPUT" || target?.closest('[role="dialog"]')) return;
    if (e.key === " ") {
      e.preventDefault();
      onPlayPause();
    } else if (onSkip && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      onSkip(e.key === "ArrowLeft" ? -ARROW_SECONDS : ARROW_SECONDS);
    } else if (onEnter && e.key === "Enter") {
      if (onEnter()) e.preventDefault();
    }
  });

  // The keys listen on the window, outside React, so an effect adds and removes the listener.
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
