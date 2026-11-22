import { SCYTHE_SAFE } from "../../data/attacks";
import { round2, unit } from "../../geometry";
import type { Overlay, Point } from "../../types";
import { SAFE_INSET } from "./Shape";

// TS note: this Extract keeps the three weapon members of the Overlay union.
type WeaponOverlay = Extract<Overlay, { t: "axe" | "sword" | "scythe" }>;
type WeaponType = WeaponOverlay["t"];

export interface WeaponProps {
  overlay: WeaponOverlay;
}

/** Half the length of the line a sword or an axe rests along. The app's choice. */
const LINE_HALF = 9;
/** The radius of the round badge each weapon's icon sits on. The app's choice. */
const BADGE_R = 5.6;
/** A held weapon's icon: how far east of the point its middle is, and how big it is. It fits
    between his hitbox ring and waymark B. The app's choice. */
const HELD_EAST = 4.5;
const HELD_SCALE = 0.8;

/** The weapon's long side on the floor: from the handle end to the tip. Without a turn, the sword
    and the axe lie across the line to the arena center, so their flat side faces the center. */
function floorLine(o: WeaponOverlay): Point {
  if (o.ux != null && o.uy != null) return [o.ux, o.uy];
  const r = unit([o.x - 50, o.y - 50]);
  return [-r[1], r[0]];
}

/** A boss weapon: a small upright icon that says which weapon, on a line drawn at the true angle
    the weapon rests at. The sword and the axe sit in the middle of a straight line. The scythe's
    line tapers from the butt, where its icon sits (H1's end), to the point (H2's end), and is as
    long as the green safe ring drawn when he lands on it is wide. A held weapon is its icon alone. */
export function Weapon({ overlay: o }: WeaponProps) {
  if (o.held) {
    return (
      <g className={`wpn ${o.t}`}>
        <WeaponIcon t={o.t} at={[o.x + HELD_EAST, o.y]} scale={HELD_SCALE} />
      </g>
    );
  }
  const u = floorLine(o);
  if (o.t === "scythe") {
    const half = SCYTHE_SAFE - SAFE_INSET;
    // The blade in its own frame: x from the butt (-half) to the point (+half), turned to u.
    const turn = [u[0], u[1], -u[1], u[0], o.x, o.y].map(round2).join(" ");
    return (
      <g className="wpn scythe">
        <path className="blade" transform={`matrix(${turn})`} d={`M${-half} -1.6 Q0 -1 ${half} 0 Q0 1 ${-half} 1.6 Z`} />
        <WeaponIcon t="scythe" at={[o.x - u[0] * half, o.y - u[1] * half]} />
      </g>
    );
  }
  return (
    <g className={`wpn ${o.t}`}>
      <line
        className="rest"
        x1={round2(o.x - u[0] * LINE_HALF)}
        y1={round2(o.y - u[1] * LINE_HALF)}
        x2={round2(o.x + u[0] * LINE_HALF)}
        y2={round2(o.y + u[1] * LINE_HALF)}
      />
      <WeaponIcon t={o.t} at={[o.x, o.y]} />
    </g>
  );
}

interface WeaponIconProps {
  t: WeaponType;
  at: Point;
  scale?: number;
}

/** A weapon's icon on its round badge, always upright and the same size. */
function WeaponIcon({ t, at, scale = 1 }: WeaponIconProps) {
  return (
    <g className="icon" transform={`translate(${round2(at[0])} ${round2(at[1])}) scale(${scale})`}>
      <circle className="badge" r={BADGE_R} />
      {t === "sword" && (
        <>
          <path className="glyph" d="M0 4.4 L0.9 3 L0.9 -1.2 L-0.9 -1.2 L-0.9 3 Z" />
          <rect className="glyph" x="-3" y="-2.2" width="6" height="1.2" rx="0.3" />
          <line className="glyph-line" x1="0" y1="-2.2" x2="0" y2="-3.9" />
          <circle className="glyph" cy="-4.4" r="0.8" />
        </>
      )}
      {t === "axe" && (
        <>
          <line className="glyph-line" x1="0" y1="4.6" x2="0" y2="-4.6" />
          {/* Two half-moon heads, their horns pointing up and down. */}
          <path
            className="glyph"
            d="M-0.42 -1.3 Q-1.68 -1.51 -2.52 -3.36 Q-5.21 -0.25 -2.6 3.36 Q-1.51 1.68 -0.42 1.64 Z M0.42 -1.3 Q1.68 -1.51 2.52 -3.36 Q5.21 -0.25 2.6 3.36 Q1.51 1.68 0.42 1.64 Z"
          />
        </>
      )}
      {t === "scythe" && (
        <>
          {/* The blade at the bottom, as it rests in the floor. */}
          <line className="glyph-line" x1="-2" y1="-4.2" x2="-2" y2="4" />
          <path className="glyph" d="M-2 4.2 Q2.8 4.8 4.4 0.8 Q1.6 2.8 -2 2.7 Z" />
        </>
      )}
    </g>
  );
}
