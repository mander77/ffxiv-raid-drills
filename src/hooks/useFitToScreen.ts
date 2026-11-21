import { type RefObject, useLayoutEffect, useRef, useState } from "react";

/** The tallest an element can be, from where it starts on the page down to the bottom of the
    screen, less `below` pixels for what comes under it. Give the ref to the element. The height is
    measured again when the window changes size. `undefined` until the first measure. */
export function useFitToScreen<T extends HTMLElement>(below = 0): [RefObject<T | null>, number | undefined] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>();
  // TS note: useLayoutEffect runs before the browser paints, so the element never shows at the
  // wrong size first. Measuring the page is what it is for.
  useLayoutEffect(() => {
    function measure(): void {
      const el = ref.current;
      if (!el) return;
      // Where the element starts on the page, not on the screen, so a scrolled page gives the same size.
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(0, window.innerHeight - top - below));
    }
    measure();
    // The web fonts can load after the first measure and push the element down a little.
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) measure();
    });
    window.addEventListener("resize", measure);
    return () => {
      live = false;
      window.removeEventListener("resize", measure);
    };
  }, [below]);
  return [ref, height];
}
