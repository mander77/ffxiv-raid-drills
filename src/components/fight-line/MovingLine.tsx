import { cn } from "@/lib/utils";
import { type CastControls, useCastTimeline } from "../../hooks/useCastTimeline";
import { CASTS_AHEAD, type CastMark } from "../../lib/fight";
import type { LineType } from "../../lib/fightLine";
import { CastButton } from "./CastButton";
import { CastKey } from "./CastKey";
import { CastSquare } from "./CastSquare";
import { LOOK, SIZES } from "./lineLook";

/** A cast's square: it grows in its last seconds, and keeps that size as it goes past the now mark. */
const square = (m: CastMark) => (
  <CastSquare
    mark={m}
    className="group-data-[when=past]:size-8 group-data-[when=past]:text-base group-data-[when=soon]:size-8 group-data-[when=soon]:text-base"
  />
);
/** The seconds marked on the line. The app's choice. */
const TICKS = [5, 10, 20] as const;

export interface MovingLineProps {
  axis: "x" | "y";
  types?: readonly LineType[];
  controls?: CastControls;
  className?: string;
}

/** The fight line that moves with the fight clock: the casts coming up, in the style of WoW's
    boss ability timeline. Each cast is a square in its category's colour with its seconds inside
    and its name beside it ("y") or under it ("x"). The squares move toward the now mark as the
    clock runs; the gaps between them show the time between casts, and in their last seconds a
    square grows. A hit (damage going off) is a filled square with its name in bold; the boss's own
    cast is outlined. useCastTimeline moves it. In the player you can click a cast to go to it, or
    drag the line to move the clock. FightLine draws it. */
export function MovingLine({ axis, types, controls, className }: MovingLineProps) {
  const size = SIZES[axis];
  const look = LOOK[axis];
  const { box, nowMark, marks, itemRef, drag } = useCastTimeline({ axis, nowAt: size.now, end: size.end, gap: size.gap }, controls, types);
  // The line, the now mark and the ticks sit by the box's size, in CSS.
  const along = (from: number, to: number) => (axis === "y" ? { top: from, bottom: to } : { left: from, right: to });
  const at = (px: string) => (axis === "y" ? { top: px } : { left: px });

  return (
    <section aria-label="Casts coming up" className={cn(look.section, className)}>
      <div
        ref={box}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-card",
          look.box,
          controls && cn("cursor-grab select-none active:cursor-grabbing", look.drag),
        )}
        {...drag}
      >
        <div className={cn("absolute bg-border", look.line)} style={along(size.now - size.before, size.end)} aria-hidden="true" />
        <div
          ref={nowMark}
          className={cn("absolute z-10 rounded-full bg-destructive", look.now)}
          style={axis === "y" ? { top: size.now - 2 } : { left: size.now }}
          aria-hidden="true"
        />
        {TICKS.map((sec) => (
          <div
            key={sec}
            className={cn("absolute text-[10px] text-muted-foreground", look.tick)}
            style={at(`calc(${size.now}px + (100% - ${size.now + size.end}px) * ${sec / CASTS_AHEAD})`)}
            aria-hidden="true"
          >
            {sec}
            {axis === "y" && <span className="h-0.5 w-2 bg-border" />}
          </div>
        ))}
        <ol className={cn("absolute", look.list)}>
          {marks.map((m) => (
            <li key={m.i} ref={itemRef(m.i)} className={cn("group absolute", look.item)}>
              <CastButton mark={m} onGoTo={controls?.goTo} className={look.button}>
                {/* The square on the line, with the seconds inside. It keeps the size of its last
                    seconds as it goes past the now mark, so it does not jump. Sideways, it grows
                    inside a slot of its largest size, so the name under it does not move. */}
                {axis === "x" ? <span className="flex size-8 items-center justify-center">{square(m)}</span> : square(m)}
                <span className={cn("rounded", look.name, m.cast ? "text-muted-foreground" : "font-semibold", m.raidwide && "bg-danger")}>
                  {m.name}
                </span>
              </CastButton>
            </li>
          ))}
        </ol>
        <CastKey className={cn("absolute rounded bg-card/90 px-1", look.key)} />
      </div>
    </section>
  );
}
