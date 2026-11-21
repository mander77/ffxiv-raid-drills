import { useEffect } from "react";
import { useLocation } from "react-router";
import { tabOf } from "../router";

/** A new tab starts at the top of the page, also when you open it from a link low on another tab.
    A move to another card of the same tab keeps the scroll. */
export function useScrollToTopOnNewTab(): void {
  const tab = tabOf(useLocation().pathname);
  // TS note: the effect runs again only when a value in its list ([tab]) changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect runs on each new tab on purpose.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
}
