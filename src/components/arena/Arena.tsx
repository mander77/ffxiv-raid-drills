import "./arena.css";
import { Fragment, type MouseEvent, type ReactNode, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ArenaSizes } from "../../data/fights/types";
import { round2 } from "../../geometry";
import { useArenaSizes } from "../../hooks/useFight";
import type { Overlay, Point } from "../../types";
import { hitsFirst, isWeapon, Shape } from "./Shape";

/** The layers of an arena picture, from the bottom up. Every picture draws in this order, so a
    piece looks the same everywhere.
    ground: the attacks, then the other pieces on the floor (clipped to the arena).
    drops: puddles and other pieces that stay on the floor after a step (clipped to the arena).
    zones: where to stand, as the correct answer, a preview or a target (clipped to the arena).
    waymarks, then boss: the boss and his ring.
    weapons: the boss's weapons, over the waymarks they often land next to, and over the boss
    when he stands on one (his dot shows through the clear badge).
    labels: name tags for weapons and zones, over the boss so they stay readable.
    effects: what the full fight adds over the arena (the flash, the countdown ring, a tank buster).
    marks: the other players. me: your own click and your moving marker, on top of everything. */
export const LAYERS = ["ground", "drops", "zones", "waymarks", "boss", "weapons", "labels", "effects", "marks", "me"] as const;
// TS note: `typeof LAYERS[number]` is the union of the array's values: "ground" | "drops" | ...
export type Layer = (typeof LAYERS)[number];
const CLIPPED: ReadonlySet<Layer> = new Set<Layer>(["ground", "drops", "zones"]);

export interface Waymark {
  id: string;
  x: number;
  y: number;
  c: "red" | "yellow" | "blue" | "purple";
  /** Square (1 to 4) or round (A to D). */
  sq: boolean;
}

/** The waymarks of the fight, in arena units: the "Kindred Outside" preset (A to D 10 yalms from
    the middle; 1 to 4 at x 84 and 116, z 89 and 111 in the game), the set Hector's video uses so a
    Fire Breath marker can stand on the outer corner. */
export const WAYMARKS: readonly Waymark[] = [
  { id: "A", x: 50, y: 25, c: "red", sq: false },
  { id: "B", x: 75, y: 50, c: "yellow", sq: false },
  { id: "C", x: 50, y: 75, c: "blue", sq: false },
  { id: "D", x: 25, y: 50, c: "purple", sq: false },
  { id: "1", x: 10, y: 22.5, c: "red", sq: true },
  { id: "2", x: 90, y: 22.5, c: "yellow", sq: true },
  { id: "3", x: 90, y: 77.5, c: "blue", sq: true },
  { id: "4", x: 10, y: 77.5, c: "purple", sq: true },
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

// TS note: NonNullable drops undefined from a type: the split sizes, when the arena has them.
type SplitSizes = NonNullable<ArenaSizes["split"]>;

interface FloorProps {
  /** The two platforms of a split arena, or undefined for one square. */
  split: SplitSizes | undefined;
  /** The id of the tile pattern. */
  tiles: string;
}

/** The floor: one square, or the two platforms of the Arena Split with the void between them. */
function Floor({ split, tiles }: FloorProps) {
  const rects: (readonly [number, number])[] = split ? Object.values(split.platformX) : [[0, 100]];
  return (
    <>
      {split && (
        <rect className="voidr" x={split.platformX.west[1]} y="0" width={split.platformX.east[0] - split.platformX.west[1]} height="100" />
      )}
      {rects.map(([x0, x1]) => (
        <Fragment key={x0}>
          <rect className="floor" x={x0} y="0" width={x1 - x0} height="100" />
          <rect x={x0} y="0" width={x1 - x0} height="100" fill={`url(#${tiles})`} />
          <rect className="edge" x={x0} y="0" width={x1 - x0} height="100" />
        </Fragment>
      ))}
    </>
  );
}

/** The picture's viewBox, in arena units: the 100 by 100 floor, with room around it for the
    compass (6 above, 4 on the other sides). */
export const ARENA_VIEW = { x: -4, y: -6, width: 108, height: 110 } as const;
/** How far past the tether portals a split arena's picture reaches: their width (a portal is 2.2
    units across each way), with a little room. The app's choice. */
const PORTAL_ROOM = 3;
/** A split arena is wider than the square one (its platforms reach past 0 and 100, and its
    portals further), so it is drawn smaller about the arena's center, to fit the square floor's
    0 to 100: what sits beside the floor (Practice's list, Pressure's casts) lines up with that
    square. Every piece on it shrinks with it, so each size stays true to the others. */
function splitTransform({ halfWidth, portalOut }: SplitSizes): string {
  const reach = halfWidth + portalOut + PORTAL_ROOM;
  return `translate(50 50) scale(${round2(50 / reach)}) translate(-50 -50)`;
}
/** The picture's width over its height. */
export const ARENA_ASPECT = ARENA_VIEW.width / ARENA_VIEW.height;

export interface ArenaProps {
  /** What the picture shows, for screen readers. */
  label: string;
  /** What to draw in each layer. */
  layers: Partial<Record<Layer, ReactNode>>;
  /** The Arena Split: two platforms with the void between them, drawn smaller to fit. */
  split?: boolean;
  className?: string;
  /** Called with the spot you click, in arena units (0 to 100 on each side; on a split arena,
      past 0 and 100 on the platforms). */
  onPointClick?: (p: Point) => void;
}

/** An arena picture: the floor, the compass, the waymarks, then one group per layer in LAYERS order.
    The arena is 100 by 100 units, with a little room around it for the compass. */
export function Arena({ label, layers, split = false, className, onPointClick }: ArenaProps) {
  // Each picture gets its own ids, so two pictures on one page never share a clip or a pattern.
  const id = useId();
  const clip = `${id}-clip`;
  const tiles = `${id}-tiles`;
  // The group that holds the floor and the pieces: a click is read in its units.
  const world = useRef<SVGGElement>(null);
  /** The split's sizes, when the picture is split and the fight's arena can split. */
  const sizes = useArenaSizes();
  const platforms = split ? sizes.split : undefined;
  const all: Partial<Record<Layer, ReactNode>> = { ...layers, waymarks: <Waymarks /> };
  return (
    // Choosing a spot on the arena is a pointing task with no keyboard form; the page's buttons
    // (Show me, Next step, Again) all work from the keyboard.
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click picks a spot on a map, which keys cannot.
    <svg
      className={cn("arena", className)}
      aria-label={label}
      viewBox={`${ARENA_VIEW.x} ${ARENA_VIEW.y} ${ARENA_VIEW.width} ${ARENA_VIEW.height}`}
      role="img"
      onClick={onPointClick && ((e) => onPointClick(toArena(e, world.current)))}
    >
      <defs>
        <clipPath id={clip}>
          {platforms ? (
            // The floor of a split arena: from the west platform's outer edge to the east one's.
            <rect x={50 - platforms.halfWidth} y="0" width={platforms.halfWidth * 2} height="100" />
          ) : (
            <rect x="0" y="0" width="100" height="100" />
          )}
        </clipPath>
        <pattern id={tiles} width="12.5" height="12.5" patternUnits="userSpaceOnUse">
          <path className="tileline" d="M12.5 0H0V12.5" />
        </pattern>
      </defs>
      <text className="compass" x="50" y="-2.2">
        N
      </text>
      <g ref={world} transform={platforms ? splitTransform(platforms) : undefined}>
        <Floor split={platforms} tiles={tiles} />
        {LAYERS.map((l) => (
          <g key={l} data-layer={l} clipPath={CLIPPED.has(l) ? `url(#${clip})` : undefined}>
            {all[l]}
          </g>
        ))}
      </g>
    </svg>
  );
}

/** The spot of a click on the picture, in arena units. The screen matrix of the group that holds
    the floor turns page pixels into its units, whatever size the picture has on screen and
    however the split arena is scaled. */
function toArena(e: MouseEvent<SVGSVGElement>, world: SVGGElement | null): Point {
  const ctm = (world ?? e.currentTarget).getScreenCTM();
  if (!ctm) return [Number.NaN, Number.NaN];
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return [q.x, q.y];
}

/** Overlays sorted into their layers: name tags and portals are labels, tethers are drops, role
    marks are marks, the boss's weapons are weapons, and the rest is ground, with the attacks under
    the other pieces. Portals and tethers stay out of the ground, which is clipped to the floor: a
    tether portal stands outside the wall. */
export function pieceLayers(os: readonly Overlay[]): Pick<Record<Layer, ReactNode>, "ground" | "drops" | "weapons" | "labels" | "marks"> {
  const draw = (list: readonly Overlay[]): ReactNode =>
    // biome-ignore lint/suspicious/noArrayIndexKey: a picture's pieces never change order.
    list.map((o, i) => <Shape key={i} overlay={o} />);
  return {
    ground: draw(hitsFirst(os.filter((o) => o.t !== "tag" && o.t !== "mark" && o.t !== "portal" && o.t !== "tether" && !isWeapon(o)))),
    drops: draw(os.filter((o) => o.t === "tether")),
    weapons: draw(os.filter(isWeapon)),
    labels: draw(os.filter((o) => o.t === "tag" || o.t === "portal")),
    marks: draw(os.filter((o) => o.t === "mark")),
  };
}
