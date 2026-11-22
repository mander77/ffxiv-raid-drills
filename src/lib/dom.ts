/** Checks on the browser that more than one screen needs. */

/** True when a key belongs to the page: no Alt, Ctrl or Meta, and not pressed on a button, an
    input (a slider) or inside a dialog, whose keys are their own. */
export function isPageKey(e: KeyboardEvent): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey) return false;
  // TS note: `instanceof` narrows the target from EventTarget to Element, like C#'s `is Element el`.
  const target = e.target;
  if (!(target instanceof Element)) return true;
  return target.tagName !== "BUTTON" && target.tagName !== "INPUT" && !target.closest('[role="dialog"]');
}

/** True when the player's system asks for less motion. */
export function prefersLessMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
