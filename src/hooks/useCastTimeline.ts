import { type HTMLAttributes, type PointerEvent, type RefCallback, type RefObject, useRef, useState } from "react";
import { CASTS_AHEAD, CASTS_PAST, CASTS_SOON, type CastMark, castPositions, castsAhead, hitsGoneOff } from "../lib/fight";
import { type LineType, shows } from "../lib/fightLine";
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

/** What the player lets you do with the casts coming up: click a cast to go to it, or hold the
    timer and drag it to move the fight clock, like scrubbing a video. The run has none. */
export interface CastControls {
  /** A click on a cast: go to it. `t` is when it goes off. */
  goTo: (t: number) => void;
  /** You took hold of the timer (true) or let go (false). The clock waits while you hold it. */
  hold: (holding: boolean) => void;
  /** Your drag moved the timer to this fight time. */
  scrub: (t: number) => void;
}

/** The pointer handlers that let you drag the timer, for its box. */
export type DragHandlers = Pick<HTMLAttributes<HTMLDivElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;

export interface CastTimeline {
  /** Give it to the box the casts move in; its size sets the time scale. */
  box: RefObject<HTMLDivElement | null>;
  /** Give it to the now mark; it flashes when a hit goes off. */
  nowMark: RefObject<HTMLDivElement | null>;
  /** The casts in view, for React to draw. */
  marks: CastMark[];
  /** The ref for a cast's element, by its place in the fight's casts. */
  itemRef: (i: number) => RefCallback<HTMLLIElement>;
  /** With controls: spread them on the box, so a drag moves the fight clock. */
  drag: DragHandlers;
}

/** How far a pointer moves, in pixels, before a press on the timer counts as a drag and not a
    click. The app's choice. */
const DRAG_FROM = 4;

/** A press on the timer: where it started, the fight time then, and whether it is a drag yet. */
interface Press {
  id: number;
  from: number;
  t: number;
  dragging: boolean;
}

/** The casts coming up, moving on every frame of the fight clock. Each frame moves every cast's
    element through its ref, marks it past, soon or later (data-when), fades it out once it went
    off, and writes its seconds to go into its [data-secs] element. React draws again only when a
    cast comes into view or leaves it. When a hit goes off in a playing fight, the now mark flashes
    in the hit's category colour and its square pops. `types` keeps only the casts of those
    categories (see shows); with none, every cast shows. FightLine's moving line uses it. */
export function useCastTimeline(
  { axis, nowAt, end, gap }: CastTimelineLayout,
  controls?: CastControls,
  types?: readonly LineType[],
): CastTimeline {
  const box = useRef<HTMLDivElement>(null);
  /** The elements by cast, for the frame loop to move. */
  const items = useRef(new Map<number, HTMLLIElement>());
  const nowMark = useRef<HTMLDivElement>(null);
  /** The fight time at the last frame, to see which hits went off since. */
  const was = useRef<number | null>(null);
  const [marks, setMarks] = useState<CastMark[]>([]);
  /** The fight time at the last frame, and the pixels per second of the line, for a drag. */
  const clock = useRef({ t: 0, perSecond: 1 });
  const press = useRef<Press | null>(null);

  useFightFrame((s) => {
    const size = (axis === "y" ? box.current?.clientHeight : box.current?.clientWidth) ?? 0;
    const perSecond = Math.max(1, size - end - nowAt) / CASTS_AHEAD;
    clock.current = { t: s.t, perSecond };
    // While you drag, the casts that went off stay in view as far back as the line goes before the
    // now mark, so you can drag back to them.
    const dragging = press.current?.dragging ?? false;
    const past = dragging ? Math.max(CASTS_PAST, nowAt / perSecond) : CASTS_PAST;
    const now = castsAhead(s, past).filter((m) => shows(m, types));
    // Draw again only when the casts in view change.
    setMarks((was) => (was.length === now.length && was.every((m, k) => m.i === now[k].i) ? was : now));
    const places = castPositions(now, size - end, nowAt, gap);
    const move = axis === "y" ? "translateY" : "translateX";
    now.forEach((m, k) => {
      const item = items.current.get(m.i);
      if (!item) return;
      item.style.transform = `${move}(${places[k].toFixed(1)}px) ${move}(-50%)`;
      item.dataset.when = m.left < 0 ? "past" : m.left <= CASTS_SOON ? "soon" : "later";
      // A cast that went off fades out as it moves past the now mark, from full colour to nothing,
      // so it does not jump as it crosses.
      item.style.opacity = m.left < 0 ? String(Math.max(0, 1 + m.left / past)) : "";
      const secs = item.querySelector<HTMLElement>("[data-secs]");
      const text = m.left > 0 ? String(Math.ceil(m.left)) : "";
      if (secs && secs.textContent !== text) secs.textContent = text;
    });
    // Only a playing clock shows a hit go off, not a drag or a slider moved while paused.
    const gone = was.current === null || s.paused ? [] : hitsGoneOff(now, was.current, s.t);
    was.current = s.t;
    if (gone.length > 0) {
      wentOff(nowMark.current, gone[0]);
      for (const m of gone) pop(items.current.get(m.i)?.querySelector<HTMLElement>("[data-secs]"));
    }
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

  /** Where the pointer is along the line. */
  function along(e: PointerEvent<HTMLDivElement>): number {
    return axis === "y" ? e.clientY : e.clientX;
  }
  // A press becomes a drag once it moves a few pixels; then the box holds the pointer, so the drag
  // goes on outside it and the press does not click the cast it started on. The casts move up (or
  // left) as the clock runs, so dragging up (or left) moves the clock on.
  const drag: DragHandlers = controls
    ? {
        onPointerDown: (e) => {
          if (e.button !== 0) return;
          press.current = { id: e.pointerId, from: along(e), t: clock.current.t, dragging: false };
        },
        onPointerMove: (e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          const moved = along(e) - p.from;
          if (!p.dragging) {
            if (Math.abs(moved) < DRAG_FROM) return;
            p.dragging = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            controls.hold(true);
          }
          controls.scrub(p.t - moved / clock.current.perSecond);
        },
        onPointerUp: (e) => letGo(e.pointerId),
        onPointerCancel: (e) => letGo(e.pointerId),
      }
    : {};
  function letGo(id: number): void {
    const p = press.current;
    if (!p || p.id !== id) return;
    press.current = null;
    if (p.dragging) controls?.hold(false);
  }

  return { box, nowMark, marks, itemRef, drag };
}

/** How long the flash and the pop last, in milliseconds, and when in that time they are largest
    (a share of it). The app's choice. */
const FLASH_MS = 600;
const PEAK = 0.25;

/** True when the player's system asks for less motion: the flash keeps its glow but does not grow. */
function lessMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Flash the now mark in the colour of the hit that went off. The Web Animations API runs it
    outside React, like the rest of the frame loop; a browser without it shows nothing. */
function wentOff(mark: HTMLElement | null, hit: CastMark): void {
  const colour = `var(--color-cat-${hit.cats[0] ?? "none"})`;
  const grow = lessMotion() ? {} : { scale: "1.8" };
  // It grows in and settles back, from its own look to the hit's and back, so nothing snaps.
  mark?.animate?.(
    [
      { backgroundColor: "var(--destructive)", boxShadow: "0 0 0 0 transparent", scale: "1" },
      { backgroundColor: colour, boxShadow: `0 0 14px 5px ${colour}`, ...grow, offset: PEAK },
      { backgroundColor: "var(--destructive)", boxShadow: "0 0 0 0 transparent", scale: "1" },
    ],
    { duration: FLASH_MS, easing: "ease-in-out" },
  );
}

/** A hit's square swells for a moment as it goes off, and settles back. */
function pop(square: HTMLElement | null | undefined): void {
  if (lessMotion()) return;
  square?.animate?.([{ scale: "1" }, { scale: "1.3", offset: PEAK }, { scale: "1" }], { duration: FLASH_MS, easing: "ease-in-out" });
}
