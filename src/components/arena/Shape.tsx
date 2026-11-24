import { cn } from "@/lib/utils";
import { addVec, dist, round2, unit } from "../../geometry";
import { useArenaSizes } from "../../hooks/useFight";
import { UNKNOWN_R } from "../../lib/attacks";
import type { Overlay, Point } from "../../types";
import { TowerIcon } from "../icons";
import { Weapon } from "./Weapon";

/** "x,y" for an SVG points or path list, to 2 decimals. */
const pt = (p: Point): string => `${round2(p[0])},${round2(p[1])}`;

/** A circle as a path, so two of them make a donut with fill-rule evenodd. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${round2(cx - r)},${round2(cy)} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
}

/** How far inside its true edge a safe ring is drawn, in arena units. The scythe's safe edge is
    5 yalms, the same as the boss's hitbox ring, so without this the green ring would hide under
    it. Inside, not outside, so the ring never makes the safe ground look bigger than it is. */
export const SAFE_INSET = 1.6;

export interface ShapeProps {
  overlay: Overlay;
}

/** One piece on the arena: an attack, a weapon, a tower, a label, a player mark and so on. */
export function Shape({ overlay: o }: ShapeProps) {
  const sizes = useArenaSizes();
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
          <circle className="out" r={o.r ?? sizes.tower} />
          <circle className="in" r="1.1" />
          {o.soak != null && <SoakMark r={o.r ?? sizes.tower} soak={o.soak} />}
        </g>
      );
    case "unknown":
      return (
        <g className="unknown" transform={`translate(${round2(o.x)} ${round2(o.y)})`} aria-label="Attack, size unknown">
          <title>Attack, size unknown</title>
          <circle r={UNKNOWN_R} />
          <text>?</text>
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
    case "scythe":
    case "axe":
    case "sword":
      return <Weapon overlay={o} />;
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
    case "aim":
      return <Aim from={[o.x, o.y]} to={[o.x2, o.y2]} />;
    case "knockback":
      return <Push from={[o.x, o.y]} to={[o.x2, o.y2]} />;
    case "guide":
      return <line className="guide" x1={round2(o.x)} y1={round2(o.y)} x2={round2(o.x2)} y2={round2(o.y2)} />;
    case "tether":
      return <Tether portal={[o.x, o.y]} to={[o.x2, o.y2]} />;
    case "portal":
      return (
        <g className="portal" transform={`translate(${round2(o.x)} ${round2(o.y)})`}>
          <ellipse rx={o.vert ? 6 : 2.2} ry={o.vert ? 2.2 : 6} />
          {o.n != null && <text>{o.n}</text>}
        </g>
      );
  }
}

interface TetherProps {
  portal: Point;
  to: Point;
  /** Whether the tether is stretched. By default, from its length and the fight's stretch distance. */
  stretched?: boolean;
}

/** A tether from its portal to a player: a solid cord on a light outline, red until it is long
    enough, then blue. Its name says which, for a screen reader, and its title shows on hover. */
export function Tether({ portal, to, stretched }: TetherProps) {
  const reach = useArenaSizes().split?.tetherStretch ?? Number.POSITIVE_INFINITY;
  const isStretched = stretched ?? dist(portal, to) >= reach;
  const ends = { x1: round2(portal[0]), y1: round2(portal[1]), x2: round2(to[0]), y2: round2(to[1]) };
  const name = isStretched ? "Tether, stretched" : "Tether, not stretched";
  return (
    <g className={cn("tether", isStretched && "stretched")} aria-label={name}>
      <title>{name}</title>
      <line className="halo" {...ends} />
      <line className="cord" {...ends} />
    </g>
  );
}

interface AimProps {
  from: Point;
  to: Point;
}

/** How long the arrowhead of an aim is, and how wide each side of it is, in arena units. The
    app's choice, for the picture. */
const HEAD_LEN = 4.2;
const HEAD_HALF = 2.8;

/** An arrow from a cone's source along its middle, so a wide cone shows where it comes from. It
    is drawn twice: a light outline first, so it stands out on the cone, then the arrow. */
function Aim({ from, to }: AimProps) {
  const d = unit([to[0] - from[0], to[1] - from[1]]);
  const back: Point = [to[0] - d[0] * HEAD_LEN, to[1] - d[1] * HEAD_LEN];
  const side = (s: number): Point => [back[0] - d[1] * HEAD_HALF * s, back[1] + d[0] * HEAD_HALF * s];
  const shaft = `M${pt(from)} L${pt(back)}`;
  const head = `M${pt(to)} L${pt(side(1))} L${pt(side(-1))} Z`;
  return (
    <g className="aim">
      <path className="halo" d={`${shaft} ${head}`} />
      <path className="shaft" d={shaft} />
      <path className="head" d={head} />
    </g>
  );
}

interface SoakMarkProps {
  /** The tower's radius, in arena units. */
  r: number;
  soak: number;
}

/** The radius of a tower's soak badge, and how wide the tower icon is in it, in arena units. The
    app's choice, for the picture. */
const SOAK_BADGE_R = 4.4;
const SOAK_ICON = 7;

/** How many players soak a tower: a small round badge on the top of its ring, with the tower icon
    and the number in its column, as the mechanic icon shows it (MechanicIcon). The column is
    filled dark, so the light number on it reads at a phone's size. On the ring, not in the
    middle, so a waymark or a player in the tower never covers it. */
function SoakMark({ r, soak }: SoakMarkProps) {
  return (
    <g className="soak" transform={`translate(0 ${round2(-r)})`}>
      <circle className="badge" r={SOAK_BADGE_R} />
      <TowerIcon className="icon" x={-SOAK_ICON / 2} y={-SOAK_ICON / 2} width={SOAK_ICON} height={SOAK_ICON} />
      {/* Up a little, in the column, clear of the ring, as MechanicIcon places it. */}
      <text y={round2(-SOAK_ICON * 0.06)} fontSize={SOAK_ICON * 0.5}>
        {soak}
      </text>
    </g>
  );
}

interface PushProps {
  from: Point;
  to: Point;
}

/** The half widths of a knockback's arrow, its shaft and its head, and the length of its head, in
    arena units. The app's choice, for the picture. */
const PUSH_SHAFT_HALF = 1.3;
const PUSH_HEAD_HALF = 3;
const PUSH_HEAD_LEN = 3.6;

/** Where a knockback pushes you: a wide, hollow arrow from `from` to `to`, like the push in the
    knockback icons (icons.tsx, rule 5). A thin arrow is a move you make; this one throws you. */
function Push({ from, to }: PushProps) {
  const d = unit([to[0] - from[0], to[1] - from[1]]);
  const across: Point = [-d[1], d[0]];
  const back = addVec(to, d, -PUSH_HEAD_LEN);
  const at = (p: Point, w: number): Point => addVec(p, across, w);
  const pts = [
    at(from, PUSH_SHAFT_HALF),
    at(back, PUSH_SHAFT_HALF),
    at(back, PUSH_HEAD_HALF),
    to,
    at(back, -PUSH_HEAD_HALF),
    at(back, -PUSH_SHAFT_HALF),
    at(from, -PUSH_SHAFT_HALF),
  ];
  return <polygon className="push" points={pts.map(pt).join(" ")} />;
}

/** True for one of the boss's weapons. */
export const isWeapon = (o: Overlay): boolean => o.t === "axe" || o.t === "sword" || o.t === "scythe";

/** True for the filled area of an attack. */
export const isHit = (o: Overlay): boolean =>
  o.t === "aoe" || o.t === "donut" || o.t === "band" || o.t === "poly" || (o.t === "lane" && !o.soft);

/** Overlays with the attacks first, then the rest (safe rings, towers) on top, so an attack never
    covers them. */
export const hitsFirst = (os: readonly Overlay[]): Overlay[] => [...os.filter(isHit), ...os.filter((o) => !isHit(o))];
