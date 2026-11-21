import "./arena.css";
import { type MouseEvent, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import type { Overlay, Point } from "../../types";
import { hitsFirst, Shape } from "./Shape";

/** The layers of an arena picture, from the bottom up. Every picture draws in this order, so a
    piece looks the same everywhere.
    ground: the attacks, then the weapons and other pieces on the floor (clipped to the arena).
    drops: puddles and other pieces that stay on the floor after a step.
    zones: where to stand, as the right answer, a preview or a target (clipped to the arena).
    waymarks, then boss: the boss and his ring.
    labels: name tags for weapons and zones, over the boss so they stay readable.
    effects: what the full fight adds over the arena (the flash, the countdown ring, a tank buster).
    marks: the other players. me: your own click and your moving marker, on top of everything. */
export const LAYERS = ["ground", "drops", "zones", "waymarks", "boss", "labels", "effects", "marks", "me"] as const;
// TS note: `typeof LAYERS[number]` is the union of the array's values: "ground" | "drops" | ...
export type Layer = (typeof LAYERS)[number];
const CLIPPED: ReadonlySet<Layer> = new Set<Layer>(["ground", "zones"]);

export interface Waymark {
  id: string;
  x: number;
  y: number;
  c: "red" | "yellow" | "blue" | "purple";
  /** Square (1 to 4) or round (A to D). */
  sq: boolean;
}

/** The waymarks of the fight, in arena units. */
export const WAYMARKS: readonly Waymark[] = [
  { id: "A", x: 50, y: 25, c: "red", sq: false },
  { id: "B", x: 75, y: 50, c: "yellow", sq: false },
  { id: "C", x: 50, y: 75, c: "blue", sq: false },
  { id: "D", x: 25, y: 50, c: "purple", sq: false },
  { id: "1", x: 9, y: 19, c: "red", sq: true },
  { id: "2", x: 91, y: 19, c: "yellow", sq: true },
  { id: "3", x: 91, y: 81, c: "blue", sq: true },
  { id: "4", x: 9, y: 81, c: "purple", sq: true },
];

function Waymarks() {
  return WAYMARKS.map((w) => (
    <g key={w.id} className={`wm wm-${w.c}`}>
      {w.sq ? <rect x={w.x - 3} y={w.y - 3} width="6" height="6" rx=".6" /> : <circle cx={w.x} cy={w.y} r="3.2" />}
      <text x={w.x} y={w.y + 0.2}>
        {w.id}
      </text>
    </g>
  ));
}

/** The picture's width over its height: its viewBox is 108 by 110 arena units. */
export const ARENA_ASPECT = 108 / 110;

export interface ArenaProps {
  /** What the picture shows, for screen readers. */
  label: string;
  /** What to draw in each layer. */
  layers: Partial<Record<Layer, ReactNode>>;
  /** The arena split down the middle, with the void between the halves. */
  split?: boolean;
  className?: string;
  /** Called with the spot you click, in arena units (0 to 100 on each side). */
  onPointClick?: (p: Point) => void;
}

/** An arena picture: the floor, the compass, the waymarks, then one group per layer in LAYERS order.
    The arena is 100 by 100 units, with a little room around it for the compass. */
export function Arena({ label, layers, split = false, className, onPointClick }: ArenaProps) {
  // Each picture gets its own ids, so two pictures on one page never share a clip or a pattern.
  const id = useId();
  const clip = `${id}-clip`;
  const tiles = `${id}-tiles`;
  const all: Partial<Record<Layer, ReactNode>> = { ...layers, waymarks: <Waymarks /> };
  return (
    // Choosing a spot on the arena is a pointing task with no keyboard form; the page's buttons
    // (Show me, Next step, Again) all work from the keyboard.
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click picks a spot on a map, which keys cannot.
    <svg
      className={cn("arena", className)}
      aria-label={label}
      viewBox="-4 -6 108 110"
      role="img"
      onClick={onPointClick && ((e) => onPointClick(toArena(e)))}
    >
      <defs>
        <clipPath id={clip}>
          <rect x="0" y="0" width="100" height="100" />
        </clipPath>
        <pattern id={tiles} width="12.5" height="12.5" patternUnits="userSpaceOnUse">
          <path className="tileline" d="M12.5 0H0V12.5" />
        </pattern>
      </defs>
      <rect className="floor" x="0" y="0" width="100" height="100" />
      <rect x="0" y="0" width="100" height="100" fill={`url(#${tiles})`} />
      {split && <rect className="voidr" x="25.5" y="0" width="49" height="100" />}
      <rect className="edge" x="0" y="0" width="100" height="100" />
      <text className="compass" x="50" y="-2.2">
        N
      </text>
      {LAYERS.map((l) => (
        <g key={l} data-layer={l} clipPath={CLIPPED.has(l) ? `url(#${clip})` : undefined}>
          {all[l]}
        </g>
      ))}
    </svg>
  );
}

/** The spot of a click on the picture, in arena units. The screen matrix of the svg turns page
    pixels into its viewBox units, whatever size the picture has on screen. */
function toArena(e: MouseEvent<SVGSVGElement>): Point {
  const ctm = e.currentTarget.getScreenCTM();
  if (!ctm) return [Number.NaN, Number.NaN];
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return [q.x, q.y];
}

/** Overlays sorted into their layers: name tags are labels, role marks are marks, and the rest is
    ground, with the attacks under the other pieces. */
export function pieceLayers(os: readonly Overlay[]): Pick<Record<Layer, ReactNode>, "ground" | "labels" | "marks"> {
  const draw = (list: readonly Overlay[]): ReactNode =>
    // biome-ignore lint/suspicious/noArrayIndexKey: a picture's pieces never change order.
    list.map((o, i) => <Shape key={i} overlay={o} />);
  return {
    ground: draw(hitsFirst(os.filter((o) => o.t !== "tag" && o.t !== "mark"))),
    labels: draw(os.filter((o) => o.t === "tag")),
    marks: draw(os.filter((o) => o.t === "mark")),
  };
}
