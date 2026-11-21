import { HITBOX, TOWER_R } from "../../data/attacks";
import { addVec, round2, unit } from "../../geometry";
import type { Overlay, Point } from "../../types";

/** "x,y" for an SVG points or path list, to 2 decimals. */
const pt = (p: Point): string => `${round2(p[0])},${round2(p[1])}`;

/** A circle as a path, so two of them make a donut with fill-rule evenodd. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${round2(cx - r)},${round2(cy)} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
}

/** How far inside its true edge a safe ring is drawn, in arena units. The scythe's safe edge is
    5 yalms, the same as the boss's hitbox ring, so without this the green ring would hide under
    it. Inside, not outside, so the ring never makes the safe ground look bigger than it is. */
const SAFE_INSET = 1.6;

/** The boss's hitbox ring, from BossMod (see src/data/attacks.ts). */
export const RING = HITBOX;

export interface ShapeProps {
  overlay: Overlay;
}

/** One piece on the arena: an attack, a weapon, a tower, a label, a player mark and so on. */
export function Shape({ overlay: o }: ShapeProps) {
  // TS note: `switch (o.t)` narrows the union: in each case TypeScript knows which overlay `o` is,
  // so `o.r` is allowed for "aoe" and an error for "tag".
  switch (o.t) {
    case "aoe":
      return <circle className="aoe" cx={round2(o.x)} cy={round2(o.y)} r={o.r} />;
    case "donut":
      return <path className="aoe" fillRule="evenodd" d={`${circlePath(o.x, o.y, o.r2)} ${circlePath(o.x, o.y, o.r1)}`} />;
    case "lineaoe":
      return <line className="lineaoe" x1={round2(o.x)} y1={round2(o.y)} x2={round2(o.x2)} y2={round2(o.y2)} strokeWidth={o.w || 1.3} />;
    case "tornado":
      return (
        <g className="tornado" transform={`translate(${round2(o.x)} ${round2(o.y)})`}>
          <circle r="5.5" />
          <path d="M-3.4,-2.6 h6.8 M-2.7,-0.9 h5.4 M-2,0.8 h4 M-1.3,2.5 h2.6" />
        </g>
      );
    case "rock":
      return (
        <path className="rock" transform={`translate(${round2(o.x)} ${round2(o.y)})`} d="M-3,1 L-2.2,-2 L0.8,-3 L3,-1.2 L2.6,2 L-0.6,3 Z" />
      );
    case "tower":
      return (
        <g className="tower" transform={`translate(${round2(o.x)} ${round2(o.y)})`}>
          <circle className="out" r={o.r ?? TOWER_R} />
          <circle className="in" r="1.1" />
        </g>
      );
    case "target":
      return <circle className="target" cx={round2(o.x)} cy={round2(o.y)} r="4.2" />;
    case "puddle":
      return <circle className="puddle" cx={round2(o.x)} cy={round2(o.y)} r={o.r} />;
    case "tag": {
      const w = o.s.length * 1.75 + 2.4;
      return (
        <g className="tag">
          <rect x={round2(o.x - w / 2)} y={round2(o.y - 1.9)} width={round2(w)} height="3.8" rx=".8" />
          <text x={round2(o.x)} y={round2(o.y)}>
            {o.s}
          </text>
        </g>
      );
    }
    case "mark":
      return (
        <g className={`mk ${o.r}`}>
          <rect x={round2(o.x - 2.4)} y={round2(o.y - 2.4)} width="4.8" height="4.8" rx=".9" />
          <text x={round2(o.x)} y={round2(o.y)}>
            {o.l}
          </text>
        </g>
      );
    case "scythe": {
      const P: Point = [o.x, o.y];
      const u: Point = [o.ux, o.uy];
      const d: Point = [o.dx, o.dy];
      const B = addVec(P, u, -10);
      const K = addVec(P, u, 8);
      const C = addVec(addVec(K, d, 6), u, 1.5);
      const T = addVec(addVec(K, d, 10), u, -3);
      const path = `M${pt(B)} L${pt(K)} Q${pt(C)} ${pt(T)}`;
      return (
        <g className="scy">
          <path className="halo" d={path} />
          <path className="ink" d={path} />
          <circle className="butt" cx={round2(B[0])} cy={round2(B[1])} r="1.5" />
        </g>
      );
    }
    case "axe":
    case "sword": {
      // u is the long side (handle end to tip), d is across it. Unless the drill turns the icon,
      // the sword stands upright, point down, and the axe lies across the line to the arena center.
      const P: Point = [o.x, o.y];
      const r = unit([o.x - 50, o.y - 50]);
      const u: Point = o.ux != null && o.uy != null ? [o.ux, o.uy] : o.t === "sword" ? [0, 1] : [-r[1], r[0]];
      const d: Point = [u[1], -u[0]];
      const at = (a: number, b: number): string => pt(addVec(addVec(P, u, a), d, b));
      const path =
        o.t === "axe"
          ? // Handle across, then a curved head near one end with its edge toward the center.
            `M${at(-8, 0)} L${at(7.5, 0)} M${at(5, 0)} L${at(3.2, -5.6)} Q${at(6.6, -8.4)} ${at(10, -5.6)} L${at(8.2, 0)} Z`
          : // Pointed blade, crossguard, grip and pommel.
            `M${at(-2.5, 0.9)} L${at(7.6, 0.9)} L${at(9.8, 0)} L${at(7.6, -0.9)} L${at(-2.5, -0.9)} Z` +
            ` M${at(-2.5, 3.4)} L${at(-2.5, -3.4)} M${at(-2.5, 0)} L${at(-6.6, 0)}`;
      const knob = addVec(P, u, o.t === "axe" ? -8 : -7.4);
      return (
        <g className="wpn">
          <path className="halo" d={path} />
          <path className="ink" d={path} />
          <circle className="knob" cx={round2(knob[0])} cy={round2(knob[1])} r="1.1" />
        </g>
      );
    }
    case "band":
      return <line className="aoeband" x1={round2(o.x)} y1={round2(o.y)} x2={round2(o.x2)} y2={round2(o.y2)} strokeWidth={o.w} />;
    case "lane":
      return (
        <rect
          className={o.soft ? "lanesoft" : "aoe"}
          x={o.rect[0]}
          y={o.rect[1]}
          width={o.rect[2] - o.rect[0]}
          height={o.rect[3] - o.rect[1]}
        />
      );
    case "poly":
      return <polygon className="aoe" points={o.pts.map(pt).join(" ")} />;
    case "safe":
      // Drawn SAFE_INSET inside its true edge, so it never sits under the boss's ring.
      return <circle className="safe" cx={round2(o.x)} cy={round2(o.y)} r={round2(o.r - SAFE_INSET)} />;
    case "guide":
      return <line className="guide" x1={round2(o.x)} y1={round2(o.y)} x2={round2(o.x2)} y2={round2(o.y2)} />;
    case "portal":
      return (
        <g className="portal" transform={`translate(${round2(o.x)} ${round2(o.y)})`}>
          <ellipse rx={o.vert ? 6 : 2.2} ry={o.vert ? 2.2 : 6} />
          <text>{o.n}</text>
        </g>
      );
  }
}

/** True for the filled area of an attack. */
export const isHit = (o: Overlay): boolean =>
  o.t === "aoe" || o.t === "donut" || o.t === "band" || o.t === "poly" || (o.t === "lane" && !o.soft);

/** Overlays with the attacks first, then the rest (safe rings, weapons, towers) on top, so an
    attack never covers a weapon icon. */
export const hitsFirst = (os: readonly Overlay[]): Overlay[] => [...os.filter(isHit), ...os.filter((o) => !isHit(o))];
