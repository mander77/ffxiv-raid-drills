import type { ReactNode } from "react";
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
const BADGE_R = 4.6;
/** How big the icon is inside its badge. It leaves a gap to the badge's rim, so an icon's handle
    never runs into the line beneath when that line runs the same way. The app's choice. */
const GLYPH_SCALE = 0.62;

/** The weapon's long side on the floor: from the handle end to the tip. Without a turn, the sword
    and the axe lie across the line to the arena center, so their flat side faces the center. */
function floorLine(o: WeaponOverlay): Point {
  if (o.ux != null && o.uy != null) return [o.ux, o.uy];
  const r = unit([o.x - 50, o.y - 50]);
  return [-r[1], r[0]];
}

/** A boss weapon: a small upright icon that says which weapon, in the middle of a line drawn at
    the true angle the weapon rests at. The sword's and the axe's line is straight. The scythe's
    line tapers from the thick butt (H1's end) to the sharp point (H2's end), and is as long as the
    green safe ring drawn when he lands on it is wide. A held weapon is its icon alone, the same size.
    The icon's badge is filled with sand, so the dark icon stays readable on the boss's dark dot
    and the line never runs into the icon. */
export function Weapon({ overlay: o }: WeaponProps) {
  if (o.held) {
    return (
      <g className={`wpn ${o.t}`}>
        <WeaponIcon t={o.t} at={[o.x, o.y]} />
      </g>
    );
  }
  const u = floorLine(o);
  let line: ReactNode;
  if (o.t === "scythe") {
    const half = SCYTHE_SAFE - SAFE_INSET;
    // The blade in its own frame: x from the butt (-half) to the point (+half), turned to u.
    const turn = [u[0], u[1], -u[1], u[0], o.x, o.y].map(round2).join(" ");
    line = <path className="blade" transform={`matrix(${turn})`} d={`M${-half} -1.6 Q0 -1 ${half} 0 Q0 1 ${-half} 1.6 Z`} />;
  } else {
    line = (
      <line
        className="rest"
        x1={round2(o.x - u[0] * LINE_HALF)}
        y1={round2(o.y - u[1] * LINE_HALF)}
        x2={round2(o.x + u[0] * LINE_HALF)}
        y2={round2(o.y + u[1] * LINE_HALF)}
      />
    );
  }
  // The icon's filled badge goes over the middle of the line.
  return (
    <g className={`wpn ${o.t}`}>
      {line}
      <WeaponIcon t={o.t} at={[o.x, o.y]} />
    </g>
  );
}

interface WeaponIconProps {
  t: WeaponType;
  at: Point;
}

/** A weapon's icon on its round badge, always upright and the same size. */
function WeaponIcon({ t, at }: WeaponIconProps) {
  return (
    <g className="icon" transform={`translate(${round2(at[0])} ${round2(at[1])})`}>
      <circle className="badge" r={BADGE_R} />
      <g transform={`scale(${GLYPH_SCALE})`}>
        {/* A sand outline first, so the icon stays readable over the boss or an attack. */}
        <g className="halo">
          <Glyph t={t} />
        </g>
        <Glyph t={t} />
      </g>
    </g>
  );
}

interface GlyphProps {
  t: WeaponType;
}

/** The drawing of a weapon's icon, inside its badge. */
function Glyph({ t }: GlyphProps) {
  return (
    <>
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
          {/* The handle: a short stub above the heads, the long part below. */}
          <line className="glyph-line" x1="0" y1="-4.8" x2="0" y2="4.8" />
          {/* Two wide half-moon heads near the top, their horns pointing up and down. */}
          <path
            className="glyph"
            transform="translate(0 -1.3) scale(1.12 1)"
            d="M-0.42 -1.3 Q-1.68 -1.51 -2.52 -3.36 Q-5.21 -0.25 -2.6 3.36 Q-1.51 1.68 -0.42 1.64 Z M0.42 -1.3 Q1.68 -1.51 2.52 -3.36 Q5.21 -0.25 2.6 3.36 Q1.51 1.68 0.42 1.64 Z"
          />
        </>
      )}
      {t === "scythe" && (
        <>
          {/* A long handle with a gentle bend, a little right of the middle, and a long curved
              blade that sweeps from its top and hooks down past the middle. */}
          <path className="glyph-line" d="M2.8 4.8 Q1 0.6 1.6 -4.4" />
          <path className="glyph" d="M1.9 -4.8 C-1.6 -5.6 -4.8 -3.6 -4.9 0.8 C-3.8 -2.2 -1.4 -3.4 1.6 -3.3 Z" />
        </>
      )}
    </>
  );
}
