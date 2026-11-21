import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ChipRowProps {
  /** What the row is for, for screen readers: "Go to a mechanic". */
  label: string;
  /** The chips. Mark the current one with aria-current="true". */
  children: ReactNode;
}

/** A row of chips that scrolls sideways when it does not fit. The current chip scrolls into the
    middle, and each edge with more chips past it fades out. */
export function ChipRow({ label, children }: ChipRowProps) {
  const row = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  /** Fade each edge that has more chips past it. */
  function updateFades(): void {
    const el = row.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 2);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  // TS note: useLayoutEffect runs after React puts the elements on the page, before the browser
  // paints them, so code that measures or scrolls goes here. With no list of dependencies it runs
  // after every draw, because any draw can change the current chip.
  useLayoutEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (el && on && el.scrollWidth > el.clientWidth) el.scrollLeft = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
    updateFades();
  });

  // The mask fades each edge with more past it, from transparent at the edge to solid 2rem in.
  const mask =
    fadeLeft && fadeRight
      ? "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
      : fadeLeft
        ? "[mask-image:linear-gradient(to_right,transparent,black_2rem)]"
        : fadeRight
          ? "[mask-image:linear-gradient(to_left,transparent,black_2rem)]"
          : "";
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add a border and a legend; a group of links needs neither.
    <div
      ref={row}
      role="group"
      aria-label={label}
      onScroll={updateFades}
      className={cn("flex gap-1.5 overflow-x-auto [scrollbar-width:none]", mask)}
    >
      {children}
    </div>
  );
}
