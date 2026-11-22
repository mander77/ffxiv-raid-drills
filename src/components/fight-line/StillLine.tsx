import { type FocusEvent, type MouseEvent, useMemo, useRef } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useLineDrag } from "../../hooks/useLineDrag";
import { FIGHT_ROWS, type LineRow, type LineType, linePlaces, shows } from "../../lib/fightLine";
import { CastSquare } from "./CastSquare";
import { LOOK, SIZES } from "./lineLook";

export interface StillLineProps {
  axis: "x" | "y";
  types?: readonly LineType[];
  /** The Practice mechanic on screen: it rests at the now mark. */
  current?: string;
  /** Open a Practice mechanic. Without it, a mechanic is a plain link to its address. */
  onPick?: (drill: string) => void;
  label: string;
  className?: string;
}

/** The fight line that the fight clock does not move: the whole fight in order, a square per row on
    a line, in the look of the line that moves. The mechanic on screen rests at the now mark. Drag
    the line, as in Pressure's player, and the mechanic nearest the now mark opens when you let go;
    or click a mechanic. A new mechanic slides to the now mark. FightLine draws it. */
export function StillLine({ axis, types, current, onPick, label, className }: StillLineProps) {
  const size = SIZES[axis];
  const look = LOOK[axis];
  const rows = useMemo(() => FIGHT_ROWS.filter((r) => shows(r, types)), [types]);
  const places = useMemo(
    () =>
      linePlaces(
        rows.map((r) => r.t),
        size.perSecond,
        size.gap,
        size.most,
      ),
    [rows, size],
  );
  const at = Math.max(
    0,
    rows.findIndex((r) => r.drill !== undefined && r.drill === current),
  );
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  /** Where the now mark is on the line while you drag, in pixels from the first row. */
  const dragAt = useRef(0);
  const move = axis === "y" ? "translateY" : "translateX";
  /** The track's place that puts the point `o` pixels along the line at the now mark. */
  const shift = (o: number): string => `${move}(${(size.now - o).toFixed(1)}px)`;

  /** Move the track by hand, outside React: at once while you drag, or sliding (`slide`). */
  function place(o: number, slide: boolean): void {
    const el = track.current;
    if (!el) return;
    el.style.transition = slide ? "" : "none";
    el.style.transform = shift(o);
  }
  /** The Practice mechanic nearest `o` pixels along the line, or -1 when the line has none. */
  function nearest(o: number): number {
    let best = -1;
    rows.forEach((r, k) => {
      if (r.drill !== undefined && (best < 0 || Math.abs(places[k] - o) < Math.abs(places[best] - o))) best = k;
    });
    return best;
  }
  /** Slide row k to the now mark, and open it when it is another mechanic. */
  function pick(k: number): void {
    place(places[k], true);
    const id = rows[k].drill;
    if (id !== undefined && id !== current) onPick?.(id);
  }

  // Dragging down (or right) brings the earlier rows to the now mark, as in the player.
  const drag = useLineDrag(
    axis,
    onPick && {
      start: () => {
        dragAt.current = places[at];
      },
      move: (moved) => {
        dragAt.current = Math.min(places[places.length - 1], Math.max(places[0], places[at] - moved));
        place(dragAt.current, false);
      },
      end: () => {
        const k = nearest(dragAt.current);
        if (k < 0) place(places[at], true);
        else pick(k);
      },
    },
  );

  function handleClick(e: MouseEvent, k: number): void {
    if (!onPick) return;
    e.preventDefault();
    pick(k);
  }
  // The box hides what is outside it, but the browser still scrolls it to a row that takes the
  // keyboard focus. The row slides to the now mark instead, and back when the focus leaves the line.
  function handleFocus(k: number): void {
    box.current?.scrollTo(0, 0);
    place(places[k], true);
  }
  function handleBlur(e: FocusEvent): void {
    if (!box.current?.contains(e.relatedTarget as Node | null)) place(places[at], true);
  }

  const first = places[0] ?? 0;
  const length = (places[places.length - 1] ?? 0) - first + size.before + size.end;
  const span = axis === "y" ? { top: first - size.before, height: length } : { left: first - size.before, width: length };

  return (
    <nav aria-label={label} className={cn(look.section, className)} onBlur={handleBlur}>
      <div
        ref={box}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-card",
          look.box,
          onPick && cn("cursor-grab select-none active:cursor-grabbing", look.drag),
        )}
        {...drag}
      >
        <div
          ref={track}
          className={cn("absolute transition-transform duration-300 ease-out motion-reduce:transition-none", look.list)}
          style={{ transform: shift(places[at] ?? 0) }}
        >
          <div className={cn("absolute bg-border", look.line)} style={span} aria-hidden="true" />
          <ol>
            {rows.map((r, k) => (
              <li key={r.key} className={cn("absolute", look.item)} style={{ transform: `${move}(${places[k]}px) ${move}(-50%)` }}>
                <Row
                  row={r}
                  axis={axis}
                  current={k === at && r.drill !== undefined}
                  onClick={(e) => handleClick(e, k)}
                  onFocus={() => handleFocus(k)}
                />
              </li>
            ))}
          </ol>
        </div>
        <div
          className={cn("absolute z-10 rounded-full bg-destructive", look.now)}
          style={axis === "y" ? { top: size.now - 2 } : { left: size.now }}
          aria-hidden="true"
        />
      </div>
    </nav>
  );
}

interface RowProps {
  row: LineRow;
  axis: "x" | "y";
  current: boolean;
  onClick: (e: MouseEvent) => void;
  onFocus: () => void;
}

/** One row: its square and its name. A Practice mechanic is a link to it, and the one on screen
    is marked; any other row is only shown. */
function Row({ row, axis, current, onClick, onFocus }: RowProps) {
  const look = LOOK[axis];
  const body = (
    <>
      {/* Sideways, the square sits in a slot as large as the moving line's largest square, so both lines look the same. */}
      {axis === "x" ? (
        <span className="flex size-8 items-center justify-center">
          <CastSquare mark={row} />
        </span>
      ) : (
        <CastSquare mark={row} />
      )}
      <span className={look.name}>{row.name}</span>
    </>
  );
  if (!row.drill) return <div className={cn(look.button, "text-muted-foreground")}>{body}</div>;
  return (
    <Link
      to={`/practice/${row.drill}`}
      aria-current={current ? "step" : undefined}
      draggable={false}
      onClick={onClick}
      onFocus={onFocus}
      className={cn(
        "rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        "aria-[current=step]:bg-highlight aria-[current=step]:font-semibold aria-[current=step]:text-highlight-foreground",
        look.button,
      )}
    >
      {body}
    </Link>
  );
}
