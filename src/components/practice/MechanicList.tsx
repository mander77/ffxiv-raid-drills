import { type MouseEvent, type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { DRILLS } from "../../data/drills";
import { useLineDrag } from "../../hooks/useLineDrag";
import type { Drill } from "../../types";
import { CastSquare } from "../CastSquare";

/** The mechanics in fight order, under their phases. */
// TS note: reduce builds the list of phases, each with its mechanics, in fight order.
const PHASES = [...DRILLS]
  .sort((a, b) => a.order - b.order)
  .reduce<{ name: Drill["phase"]; drills: Drill[] }[]>((acc, d) => {
    const last = acc[acc.length - 1];
    if (last && last.name === d.phase) last.drills.push(d);
    else acc.push({ name: d.phase, drills: [d] });
    return acc;
  }, []);

/** No square has a category: a mechanic's square shows its kind. */
const NO_CATS = [] as const;

/** The classes of each part, down the box ("y") and across it ("x"). Complete class names, so
    Tailwind finds them. The line runs through the middle of the squares. */
const LOOK = {
  y: {
    box: "min-h-0 overflow-y-auto",
    track: "",
    heading: "sticky top-0 z-10 border-b bg-card px-3 py-1.5",
    list: "py-1",
    line: "inset-y-0 left-5.25 w-0.5",
    row: "flex items-center gap-2.5 px-2 py-1 text-sm",
    name: "min-w-0",
  },
  x: {
    box: "overflow-x-auto",
    track: "flex w-max",
    heading: "sticky left-0 w-max px-2 pt-1.5",
    list: "flex px-1 pb-1",
    line: "inset-x-0 top-4.25 h-0.5",
    row: "flex w-20 flex-col items-center gap-1 px-0.5 pt-1 pb-1 text-center text-xs leading-tight",
    name: "line-clamp-2",
  },
} as const;

export interface MechanicListProps {
  /** Which way the list runs: "y" down the box, beside the arena; "x" across it, under the arena
      on a narrow screen. */
  axis: "x" | "y";
  /** The mechanic on screen: marked, and kept in view. */
  current: string;
  /** Open a mechanic. */
  onPick: (drill: string) => void;
  className?: string;
}

/** The Practice mechanics in fight order, under their phases, each with a square that shows what
    you do in it, on a line like the casts coming up in Pressure. A click opens a mechanic; the one
    on screen is marked and kept in view. You scroll the list, or drag it with the mouse. */
export function MechanicList({ axis, current, onPick, className }: MechanicListProps) {
  const look = LOOK[axis];
  const box = useRef<HTMLElement>(null);
  const on = useRef<HTMLAnchorElement>(null);
  /** The box's scroll when a drag started. */
  const dragFrom = useRef(0);

  // The mechanic on screen stays in view. When it is in view already, the list does not move, so
  // a click never shifts it under your pointer; when only a part of it shows, the list moves just
  // enough to show the rest. Out of view (a new page, Next mechanic), it comes to the middle
  // (across) or just under its phase heading (down). Only the box scrolls, never the page.
  const showCurrent = useEffectEvent(() => {
    const b = box.current;
    const el = on.current;
    if (!b || !el) return;
    const br = b.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (axis === "x") {
      if (er.right <= br.left || er.left >= br.right) b.scrollLeft += er.left + er.width / 2 - (br.left + br.width / 2);
      else if (er.left < br.left) b.scrollLeft -= br.left - er.left;
      else if (er.right > br.right) b.scrollLeft += er.right - br.right;
      return;
    }
    const top = br.top + (el.closest("section")?.querySelector("h3")?.offsetHeight ?? 0);
    if (er.bottom <= top || er.top >= br.bottom) b.scrollTop += er.top - top;
    else if (er.top < top) b.scrollTop -= top - er.top;
    else if (er.bottom > br.bottom) b.scrollTop += er.bottom - br.bottom;
  });
  // For each new mechanic, and when the box changes size: the arena sizes itself to the screen
  // after the first draw, and the list beside it with it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect runs for each new mechanic on purpose.
  useEffect(() => showCurrent(), [current, axis]);
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const sized = new ResizeObserver(() => showCurrent());
    sized.observe(b);
    return () => sized.disconnect();
  }, []);

  // With a mouse, drag the list to scroll it, as you drag the casts coming up in Pressure's
  // player. A finger scrolls it the browser's own way.
  const scroll = (): number => (axis === "y" ? (box.current?.scrollTop ?? 0) : (box.current?.scrollLeft ?? 0));
  const drag = useLineDrag(
    axis,
    {
      start: () => {
        dragFrom.current = scroll();
      },
      move: (moved) => {
        box.current?.scrollTo(axis === "y" ? { top: dragFrom.current - moved } : { left: dragFrom.current - moved });
      },
      end: () => {},
    },
    true,
  );

  function handleClick(e: MouseEvent, drill: string): void {
    e.preventDefault();
    onPick(drill);
  }

  return (
    // isolate: the sticky phase headings stack inside the list, never over the page header.
    <nav
      ref={box}
      aria-label="Mechanics"
      className={cn("isolate cursor-grab rounded-lg border bg-card select-none active:cursor-grabbing", look.box, className)}
      {...drag}
    >
      <div className={look.track}>
        {PHASES.map((ph) => {
          const [num, name = ""] = ph.name.split(": ");
          return (
            <section key={ph.name}>
              <h3 className={look.heading}>
                <span className="block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{num}</span>
                {axis === "y" && <span className="text-sm font-semibold">{name}</span>}
              </h3>
              {/* isolate and -z-10: the line paints under the squares. */}
              <div className="relative isolate">
                <div className={cn("absolute -z-10 bg-border", look.line)} aria-hidden="true" />
                <ol className={look.list}>
                  {ph.drills.map((d) => (
                    <li key={d.id}>
                      <Row drill={d} axis={axis} current={d.id === current} onRef={on} onClick={handleClick} />
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>
    </nav>
  );
}

interface RowProps {
  drill: Drill;
  axis: "x" | "y";
  current: boolean;
  onRef: RefObject<HTMLAnchorElement | null>;
  onClick: (e: MouseEvent, drill: string) => void;
}

/** One mechanic: its square, when it happens and its name, as a link to it. */
function Row({ drill: d, axis, current, onRef, onClick }: RowProps) {
  const look = LOOK[axis];
  return (
    <Link
      ref={current ? onRef : undefined}
      to={`/practice/${d.id}`}
      aria-current={current ? "step" : undefined}
      draggable={false}
      onClick={(e) => onClick(e, d.id)}
      className={cn(
        "rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        "aria-[current=step]:bg-highlight aria-[current=step]:font-semibold aria-[current=step]:text-highlight-foreground",
        look.row,
      )}
    >
      <CastSquare mark={{ cats: NO_CATS, kind: d.kind, soak: d.soak }} />
      <span className={look.name}>
        {axis === "y" && <span className="block font-mono text-[11px] text-muted-foreground">{d.time}</span>}
        {d.title}
      </span>
    </Link>
  );
}
