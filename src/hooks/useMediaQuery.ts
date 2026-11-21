import { useSyncExternalStore } from "react";

/** True while the screen matches a CSS media query, such as "(min-width: 768px)". The component
    draws again when that changes. */
export function useMediaQuery(query: string): boolean {
  // TS note: useSyncExternalStore reads a value that lives outside React (here, the browser's
  // media query) and subscribes to its changes, the way React's docs advise for browser APIs.
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
