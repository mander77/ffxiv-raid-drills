import { type RefCallback, type RefObject, useRef, useState } from "react";
import { CASTS_PAST, CASTS_SOON, type CastMark, castPositions, castsAhead } from "../lib/fight";
import { useFightFrame } from "./useFightFrame";

/** Where a timeline of the casts coming up puts things, in pixels. */
export interface CastTimelineLayout {
  /** Which way the line runs: "y" down the box (the casts rise), "x" across it (they slide left). */
  axis: "x" | "y";
  /** Where the now mark sits from the start of the box. */
  nowAt: number;
  /** The room after the line at the end of the box. */
  end: number;
  /** How far apart two casts stay at least, so their names never overlap. */
  gap: number;
}

export interface CastTimeline {
  /** Give it to the box the casts move in; its size sets the time scale. */
  box: RefObject<HTMLDivElement | null>;
  /** The casts in view, for React to draw. */
  marks: CastMark[];
  /** The ref for a cast's element, by its place in the fight's casts. */
  itemRef: (i: number) => RefCallback<HTMLLIElement>;
}

/** The casts coming up, moving on every frame of the fight clock. Each frame moves every cast's
    element through its ref, marks it past, soon or later (data-when), fades it out once it went
    off, and writes its seconds to go into its [data-secs] element. React draws again only when a
    cast comes into view or leaves it. CastList and CastStrip share it. */
export function useCastTimeline({ axis, nowAt, end, gap }: CastTimelineLayout): CastTimeline {
  const box = useRef<HTMLDivElement>(null);
  /** The elements by cast, for the frame loop to move. */
  const items = useRef(new Map<number, HTMLLIElement>());
  const [marks, setMarks] = useState<CastMark[]>([]);

  useFightFrame((s) => {
    const now = castsAhead(s);
    // Draw again only when the casts in view change.
    setMarks((was) => (was.length === now.length && was.every((m, k) => m.i === now[k].i) ? was : now));
    const size = axis === "y" ? box.current?.clientHeight : box.current?.clientWidth;
    const places = castPositions(now, (size ?? 0) - end, nowAt, gap);
    const move = axis === "y" ? "translateY" : "translateX";
    now.forEach((m, k) => {
      const item = items.current.get(m.i);
      if (!item) return;
      item.style.transform = `${move}(${places[k].toFixed(1)}px) ${move}(-50%)`;
      item.dataset.when = m.left < 0 ? "past" : m.left <= CASTS_SOON ? "soon" : "later";
      // A cast that went off fades out as it moves past the now mark.
      item.style.opacity = m.left < 0 ? String(Math.max(0, 1 + m.left / CASTS_PAST) * 0.6) : "";
      const secs = item.querySelector<HTMLElement>("[data-secs]");
      const text = m.left > 0 ? String(Math.ceil(m.left)) : "";
      if (secs && secs.textContent !== text) secs.textContent = text;
    });
  });

  // The ref callback returns its cleanup, which React calls when the element goes, as react.dev
  // shows for a list of refs.
  function itemRef(i: number): RefCallback<HTMLLIElement> {
    return (el) => {
      // TS note: React's ref callback type still allows null, from before cleanup functions.
      if (!el) return;
      items.current.set(i, el);
      return () => {
        items.current.delete(i);
      };
    };
  }

  return { box, marks, itemRef };
}
