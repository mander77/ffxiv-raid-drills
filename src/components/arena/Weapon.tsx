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
const MIN_WIDTH = 0.45;

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
const REACH_BACK: Record<WeaponOverlay["t"], number> = { scythe: 11.8, sword: 5.6, axe: 9.5 };

/** The scythe: the handle stands at the butt end, and the curved blade dips into the floor toward
    the point, where its tip curls up. A small spike juts out behind the head. */
function ScytheDrawing() {
  return (
    <>
      <path className="steel" d="M-7.2 -2.2 Q0.8 3 9.6 -4.8 L9.1 -5.3 Q0.6 -0.6 -7 -4.6 Z" />
      <path className="steel" d="M-7.9 -4.2 L-11.8 -6.2 L-10.4 -3.6 L-7.6 -2.4 Z" />
      <line className="haft" x1="-7.4" y1="-2.6" x2="-8.4" y2="-20" />
      <rect className="dark" x="-9.4" y="-6.6" width="2.8" height="2.6" rx="0.5" />
      <path className="curl" d="M-7.4 -7 q2.2 -0.6 2.4 -2.6" />
      <circle className="dark" cx="-8.5" cy="-20.6" r="1.2" />
    </>
  );
}

/** The sword: a broad greatsword, point down in the floor, with a wide crossguard and a long grip. */
function SwordDrawing() {
  return (
    <>
      <path className="steel" d="M-2.3 0 L2.3 0 L2.5 -11 L-2.5 -11 Z" />
      <line className="fuller" x1="0" y1="-1" x2="0" y2="-10.2" />
      <path className="dark" d="M-5.6 -11 L5.6 -11 L4.4 -13 L-4.4 -13 Z" />
      <line className="haft" x1="0" y1="-13" x2="0" y2="-17.2" />
      <circle className="dark" cx="0" cy="-18" r="1.3" />
    </>
  );
}

/** The axe: two half-moon heads, one each side of the handle, with their lower horns in the floor. */
function AxeDrawing() {
  return (
    <>
      <line className="haft" x1="0" y1="0" x2="0" y2="-19" />
      <path
        className="steel"
        d="M-1.4 -10 Q-3.4 -11 -6 -15.4 Q-12.4 -8 -6.2 0.6 Q-3.4 -3.2 -1.4 -4 Z M1.4 -10 Q3.4 -11 6 -15.4 Q12.4 -8 6.2 0.6 Q3.4 -3.2 1.4 -4 Z"
      />
      <rect className="dark" x="-1.6" y="-11" width="3.2" height="8" rx="0.6" />
      <circle className="ring" cx="0" cy="-7" r="1.1" />
      <circle className="dark" cx="0" cy="-19.8" r="1.3" />
    </>
  );
}
