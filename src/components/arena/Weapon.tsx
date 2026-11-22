import { round2, unit } from "../../geometry";
import type { Overlay, Point } from "../../types";

// TS note: this Extract keeps the three weapon members of the Overlay union.
type WeaponOverlay = Extract<Overlay, { t: "axe" | "sword" | "scythe" }>;

export interface WeaponProps {
  overlay: WeaponOverlay;
}

/** How wide a weapon is drawn at the least, as a share of its full width. A weapon stands straight
    up the screen, as if you look north over the arena, so one whose line runs north to south
    would be drawn edge-on as a thin line. It is widened to this share instead. The app's choice,
    so every weapon shows its shape; its cut then turns slightly toward east-west. */
const MIN_WIDTH = 0.6;

/** The weapon's line on the screen: its floor line, widened east-west to at least MIN_WIDTH. */
function screenLine(u: Point): Point {
  const side = u[0] < 0 ? -1 : 1;
  return [side * Math.max(Math.abs(u[0]), MIN_WIDTH), u[1]];
}

/** The weapon's long side on the floor: from the handle end to the tip. Without a turn, the sword
    and the axe lie across the line to the arena center, so their flat side faces the center. */
function floorLine(o: WeaponOverlay): Point {
  if (o.ux != null && o.uy != null) return [o.ux, o.uy];
  const r = unit([o.x - 50, o.y - 50]);
  return [-r[1], r[0]];
}

/** A boss weapon, stuck upright in the floor (or held, with no cut). It is drawn in its own frame:
    x runs along its line on the floor, from the handle end to the tip, and -y is up. */
export function Weapon({ overlay: o }: WeaponProps) {
  // SVG matrix(a b c d e f): x goes along (a, b), y along (c, d), and (e, f) is the origin.
  // y is always straight down the screen, so the weapon always stands upright.
  let m: number[];
  if (o.held) {
    // Held at his side, seen partly from the side: smaller and narrower, its west edge at the point
    // and its foot a little below it, so it fits between his hitbox ring, the tanks and waymark B.
    const [w, h] = HELD_SIZE;
    m = [w, 0, 0, h, o.x + REACH_BACK[o.t] * w, o.y + HELD_FOOT];
  } else {
    // On the floor: it stands on the point, along its line.
    const s = screenLine(floorLine(o));
    m = [s[0], s[1], 0, 1, o.x, o.y];
  }
  return (
    <g className={`wpn ${o.t}`} transform={`matrix(${m.map(round2).join(" ")})`}>
      {!o.held && <line className="cut" x1={CUT[o.t][0]} y1="0" x2={CUT[o.t][1]} y2="0" />}
      {o.t === "scythe" && <ScytheDrawing />}
      {o.t === "sword" && <SwordDrawing />}
      {o.t === "axe" && <AxeDrawing />}
    </g>
  );
}

/** Where each weapon's cut in the floor starts and ends, along its line. */
const CUT: Record<WeaponOverlay["t"], [number, number]> = {
  scythe: [-8.5, 9],
  sword: [-3.4, 3.4],
  axe: [-8, 8],
};

/** A held weapon's width and height, as shares of its full size, so it fits between his ring and
    waymark B. The app's choice. */
const HELD_SIZE: Point = [0.5, 0.7];
/** How far below the point a held weapon's foot is. The app's choice. */
const HELD_FOOT = 5;
/** How far each drawing reaches back from its origin, toward the handle end. */
const REACH_BACK: Record<WeaponOverlay["t"], number> = { scythe: 9.4, sword: 5.8, axe: 9.3 };

// The drawings are plain dark silhouettes: the shape alone, with no small parts, so they stay
// sharp at phone size and over the attacks.

/** The scythe: the handle stands at the butt end, and the curved blade dips into the floor toward
    the point, where its tip curls up. */
function ScytheDrawing() {
  return (
    <>
      <path className="body" d="M-7.6 -1.8 Q1 3.4 10 -5.4 Q1 -0.4 -7.6 -5 Z" />
      <line className="haft" x1="-7.6" y1="-2" x2="-8.4" y2="-19" />
    </>
  );
}

/** The sword: a broad greatsword, point down in the floor, with a wide crossguard and a grip. */
function SwordDrawing() {
  return (
    <>
      <path className="body" d="M-2.6 0 L2.6 0 L2.6 -11 L-2.6 -11 Z M-5.8 -11 L5.8 -11 L5.8 -13.2 L-5.8 -13.2 Z" />
      <line className="haft" x1="0" y1="-13" x2="0" y2="-18" />
    </>
  );
}

/** The axe: two half-moon heads, one each side of the handle, with their lower horns in the floor. */
function AxeDrawing() {
  return (
    <>
      <line className="haft" x1="0" y1="0" x2="0" y2="-19" />
      <path
        className="body"
        d="M-1 -10.5 Q-4 -11 -6 -15.4 Q-12.4 -8 -6.2 0.6 Q-3.6 -3.4 -1 -3.5 Z M1 -10.5 Q4 -11 6 -15.4 Q12.4 -8 6.2 0.6 Q3.6 -3.4 1 -3.5 Z"
      />
    </>
  );
}
