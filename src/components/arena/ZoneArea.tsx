import { round2 } from "../../geometry";
import type { Point, ZoneLook, ZoneShape } from "../../types";

/** A closed outline as SVG path data. */
const outline = (pts: readonly Point[]): string => `M${pts.map((p) => `${round2(p[0])},${round2(p[1])}`).join("L")}Z`;

export interface ZoneAreaProps {
  zone: ZoneShape;
  /** The colour of the area (see ZoneLook). */
  look: ZoneLook;
}

/** A zone's area on the arena: a circle, a rectangle or a polygon, in its colour. A zone decided by
    a rule draws its `show` shapes, each in its own look if it has one. */
export function ZoneArea({ zone: z, look }: ZoneAreaProps) {
  if ("fn" in z)
    return (
      <>
        {z.show.map((sh, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the shapes of a zone never change order.
          <ZoneArea key={i} zone={sh} look={sh.look ?? look} />
        ))}
      </>
    );
  const className = `zone ${look}`;
  // A ring: the outer edge and the hole in one path. The even-odd rule leaves the hole empty.
  if ("poly" in z && z.hole) return <path className={className} d={`${outline(z.poly)} ${outline(z.hole)}`} fillRule="evenodd" />;
  if ("poly" in z) return <polygon className={className} points={z.poly.map((p) => `${round2(p[0])},${round2(p[1])}`).join(" ")} />;
  if ("c" in z) return <circle className={className} cx={round2(z.c[0])} cy={round2(z.c[1])} r={z.r} />;
  return (
    <rect
      className={className}
      x={round2(z.rect[0])}
      y={round2(z.rect[1])}
      width={round2(z.rect[2] - z.rect[0])}
      height={round2(z.rect[3] - z.rect[1])}
    />
  );
}
