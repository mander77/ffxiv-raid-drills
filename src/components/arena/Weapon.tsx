import { SCYTHE_SAFE } from "../../data/attacks";
import { round2, unit } from "../../geometry";
import type { Overlay, Point } from "../../types";
import { SAFE_INSET } from "./Shape";

// TS note: this Extract keeps the three weapon members of the Overlay union.
type WeaponOverlay = Extract<Overlay, { t: "axe" | "sword" | "scythe" }>;

export interface WeaponProps {
  overlay: WeaponOverlay;
}

/* A weapon stands upright, seen as if from a raised camera south of the arena. As it turns away
   from facing you it gets narrower, and its far end sits a little higher. Its height never
   changes, so it never looks stretched. */

/** How big the sword and the axe are drawn, as a share of their drawing. No source gives the
    weapons' size in the game, so this is the app's choice, set by eye next to the waymarks. */
const SIZE = 0.8;
/** Half the scythe's length in its drawing, from the middle to the butt or the point. */
const SCYTHE_HALF = 9.2;

/** The scale of a weapon's drawing on the floor, across and up. The scythe reaches from butt to
    point across the green safe ring drawn when he lands on it (owner's rule), at the usual height. */
function scaleOf(t: WeaponOverlay["t"]): Point {
  return t === "scythe" ? [(SCYTHE_SAFE - SAFE_INSET) / SCYTHE_HALF, SIZE] : [SIZE, SIZE];
}

/** How wide a weapon is drawn at the least, as a share of its full width, so one turned edge-on
    still shows its shape. The app's choice. */
const MIN_WIDTH = 0.4;
/** How much higher on the screen the far end of a turned weapon sits, per unit of its line that
    runs north or south. The app's choice: enough to show which way it turns, not enough to stretch. */
const TILT = 0.35;

/** The weapon's base on the screen, for a weapon whose line on the floor is u. */
function screenBase(u: Point): Point {
  const side = u[0] < 0 ? -1 : 1;
  return [side * Math.max(Math.abs(u[0]), MIN_WIDTH), u[1] * TILT];
}

/** The weapon's long side on the floor: from the handle end to the tip. Without a turn, the sword
    and the axe lie across the line to the arena center, so their flat side faces the center. */
function floorLine(o: WeaponOverlay): Point {
  if (o.ux != null && o.uy != null) return [o.ux, o.uy];
  const r = unit([o.x - 50, o.y - 50]);
  return [-r[1], r[0]];
}

/** A boss weapon, standing upright in the floor or held. It is drawn in its own frame: x runs
    along its line on the floor, from the handle end to the tip, and -y is up. */
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
    // On the floor: it stands on the point, turned along its line.
    const s = screenBase(floorLine(o));
    const [kx, ky] = scaleOf(o.t);
    m = [s[0] * kx, s[1] * kx, 0, ky, o.x, o.y];
  }
  return (
    <g className={`wpn ${o.t}`} transform={`matrix(${m.map(round2).join(" ")})`}>
      {o.t === "scythe" && <ScytheDrawing />}
      {o.t === "sword" && <SwordDrawing />}
      {o.t === "axe" && <AxeDrawing />}
    </g>
  );
}

/** A held weapon's width and height, as shares of its full size, so it fits between his ring and
    waymark B. The app's choice. */
const HELD_SIZE: Point = [0.5, 0.7];
/** How far below the point a held weapon's foot is. The app's choice. */
const HELD_FOOT = 5;
/** How far each drawing reaches back from its origin, toward the handle end. */
const REACH_BACK: Record<WeaponOverlay["t"], number> = { scythe: 10.2, sword: 5.8, axe: 9.3 };

// The drawings are plain dark silhouettes: the shape alone, with no small parts, so they stay
// sharp at phone size and over the attacks.

/** The scythe: the handle stands at the butt end, and the curved blade dips into the floor toward
    the point, where its tip curls up. */
function ScytheDrawing() {
  return (
    <>
      <path className="body" d="M-8.4 -1.8 Q0.2 3.4 9.2 -5.4 Q0.2 -0.4 -8.4 -5 Z" />
      <line className="haft" x1="-8.4" y1="-2" x2="-9.2" y2="-19" />
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
      <line className="haft" x1="0" y1="0" x2="0" y2="-24" />
      <path
        className="body"
        d="M-1 -10.5 Q-4 -11 -6 -15.4 Q-12.4 -8 -6.2 0.6 Q-3.6 -3.4 -1 -3.5 Z M1 -10.5 Q4 -11 6 -15.4 Q12.4 -8 6.2 0.6 Q3.6 -3.4 1 -3.5 Z"
      />
    </>
  );
}
