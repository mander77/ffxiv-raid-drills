import { type RefObject, useEffect, useRef } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { FIGHT_ROWS, type LineRow, type LineType, shows } from "../../lib/fightLine";
import { CastSquare } from "./CastSquare";

/** The classes of each part, down the box ("y") and across it ("x"). Complete class names, so
    Tailwind finds them. The line runs through the middle of the squares. */
const LOOK = {
  y: {
    box: "max-h-[calc(100dvh-12.5rem)] overflow-y-auto",
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

export interface StillLineProps {
  axis: "x" | "y";
  types?: readonly LineType[];
  /** The Practice mechanic on screen: marked, and kept in view. */
  current?: string;
  label: string;
  className?: string;
}

/** The fight line that stands still: the whole fight in order, under its phases, with a square
    per row on a line, as on the line that moves. You scroll it. A Practice mechanic is a link that
    opens it; the one on screen is marked and kept in view. FightLine draws it. */
export function StillLine({ axis, types, current, label, className }: StillLineProps) {
  const look = LOOK[axis];
  const box = useRef<HTMLElement>(null);
  const on = useRef<HTMLAnchorElement>(null);

  // TS note: reduce builds the list of phases, each with its rows, in fight order.
  const phases = FIGHT_ROWS.filter((r) => shows(r, types)).reduce<{ name: string; rows: LineRow[] }[]>((acc, r) => {
    const last = acc[acc.length - 1];
    if (last && last.name === r.phase) last.rows.push(r);
    else acc.push({ name: r.phase, rows: [r] });
    return acc;
  }, []);

  // Keep the mechanic on screen in view: down the box, below its phase heading; across it, in the
  // middle. Only the box scrolls, never the page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect runs for each new mechanic on purpose.
  useEffect(() => {
    const b = box.current;
    const el = on.current;
    if (!b || !el) return;
    const br = b.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (axis === "x") {
      b.scrollLeft += er.left + er.width / 2 - (br.left + br.width / 2);
      return;
    }
    const top = br.top + (el.closest("section")?.querySelector("h3")?.offsetHeight ?? 0);
    if (er.top < top) b.scrollTop -= top - er.top;
    else if (er.bottom > br.bottom) b.scrollTop += er.bottom - br.bottom;
  }, [current, axis]);

  return (
    // isolate: the sticky phase headings stack inside the line, never over the page header.
    <nav ref={box} aria-label={label} className={cn("isolate rounded-lg border bg-card", look.box, className)}>
      <div className={look.track}>
        {phases.map((ph) => {
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
                  {ph.rows.map((r) => (
                    <li key={r.key}>
                      <Row row={r} axis={axis} current={r.drill !== undefined && r.drill === current} onRef={on} />
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
  row: LineRow;
  axis: "x" | "y";
  current: boolean;
  onRef: RefObject<HTMLAnchorElement | null>;
}

/** One row: its square, its name and when it happens. A Practice mechanic is a link to it. */
function Row({ row, axis, current, onRef }: RowProps) {
  const look = LOOK[axis];
  const body = (
    <>
      <CastSquare mark={row} />
      <span className={look.name}>
        {axis === "y" && <span className="block font-mono text-[11px] text-muted-foreground">{row.when}</span>}
        {row.name}
      </span>
    </>
  );
  if (!row.drill) return <div className={cn(look.row, "text-muted-foreground")}>{body}</div>;
  return (
    <Link
      ref={current ? onRef : undefined}
      to={`/practice/${row.drill}`}
      aria-current={current ? "step" : undefined}
      className={cn(
        "rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        "aria-[current=step]:bg-highlight aria-[current=step]:font-semibold aria-[current=step]:text-highlight-foreground",
        look.row,
      )}
    >
      {body}
    </Link>
  );
}
