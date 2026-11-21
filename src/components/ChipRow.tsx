import type { ComponentChildren } from "preact";
import { useRef, useState, useLayoutEffect } from "preact/hooks";

export interface ChipRowProps {
  /** What the row is for, for screen readers: "Go to a mechanic". */
  label: string;
  /** The chips. Mark the current one with aria-current="true". */
  children: ComponentChildren;
}

/** A row of chips. On a phone it is one row that scrolls sideways: the current chip scrolls to the
    middle, and each edge with more chips past it fades. */
export function ChipRow({label, children}: ChipRowProps) {
  // TS note: useRef keeps a value between draws without drawing again. Here it holds the <div>
  // once Preact has made it. `<HTMLDivElement>` says what it will hold.
  const row = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  /** Fade each edge that has more chips past it. */
  const updateFades = (): void => {
    const el = row.current;
    if(!el) return;
    setFadeLeft(el.scrollLeft > 2);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  // TS note: useLayoutEffect runs after Preact puts the elements on the page, before the browser
  // paints them, so code that measures or scrolls goes here. With no list of dependencies it runs
  // after every draw, because any draw can change the current chip.
  useLayoutEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if(el && on && el.scrollWidth > el.clientWidth) el.scrollLeft = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
    updateFades();
  });

  // The CSS fades the left edge for "fl" and the right edge for "fr".
  const cls = "qchips" + (fadeLeft ? " fl" : "") + (fadeRight ? " fr" : "");
  return <div ref={row} class={cls} role="group" aria-label={label} onScroll={updateFades}>{children}</div>;
}
