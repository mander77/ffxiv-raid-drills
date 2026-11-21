import { DEG, f1 } from "../../geometry";
import type { Boss } from "../../types";
import { RING } from "./Shape";

/** Half of the opening at his rear, in degrees. */
const REAR = 45;
const onRing = (deg: number, r: number): string => `${f1(r * Math.sin(deg * DEG))} ${f1(-r * Math.cos(deg * DEG))}`;

export interface BossMarkProps {
  boss: Boss;
}

/** The boss and his target ring, drawn like the game's: a marker at his front, a short tick on each
    flank, and an opening at his rear, between the two rear corners (135 to 225 degrees from his
    front). The ring turns with his facing through a CSS transform, so a new facing turns it
    smoothly (the "turn" class in arena.css). With no facing, the ring is a plain circle, so it does
    not give away where he faces. */
export function BossMark({ boss: b }: BossMarkProps) {
  const at = `translate(${f1(b.x)} ${f1(b.y)})`;
  if (b.f == null)
    return (
      <g transform={at}>
        <circle className="ring" r={RING} />
        <circle className="bosscore" r="3.4" />
      </g>
    );
  return (
    <g transform={at}>
      <g className="turn" style={{ transform: `rotate(${f1(b.f)}deg)` }}>
        {/* From the left rear corner, clockwise past his front, to the right rear corner. */}
        <path className="ring" d={`M${onRing(180 + REAR, RING)} A${RING} ${RING} 0 1 1 ${onRing(180 - REAR, RING)}`} />
        <path
          className="ringmark"
          d={`M${onRing(90, RING - 2)} L${onRing(90, RING + 2)} M${onRing(270, RING - 2)} L${onRing(270, RING + 2)}`}
        />
        <circle className="bosscore" r="3.4" />
        <path className="face" d={`M0,${f1(-(RING + 3.6))} L-2.6,${f1(-(RING - 0.6))} L2.6,${f1(-(RING - 0.6))} Z`} />
      </g>
    </g>
  );
}
