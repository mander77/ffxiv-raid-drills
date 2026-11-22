import { useSyncExternalStore } from "react";

/** The id of the last of these elements whose top has scrolled up to `offset` pixels from the top
    of the screen, or null while the page is above the first one. The component draws again when
    that changes as the page scrolls. */
export function useSectionInView(ids: readonly string[], offset: number): string | null {
  // useSyncExternalStore reads a value that lives outside React (the scroll position) and
  // subscribes to its changes, as React's docs advise for browser APIs.
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("scroll", onChange, { passive: true });
      window.addEventListener("resize", onChange);
      return () => {
        window.removeEventListener("scroll", onChange);
        window.removeEventListener("resize", onChange);
      };
    },
    () => {
      let inView: string | null = null;
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= offset) inView = id;
      }
      return inView;
    },
  );
}
