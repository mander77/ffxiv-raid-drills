import { round2 } from "../../geometry";
import type { ZoneLook, ZoneShape } from "../../types";

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
