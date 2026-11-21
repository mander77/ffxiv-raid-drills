import { f1 } from "../../geometry";
import type { ZoneShape } from "../../types";

export interface ZoneMarkProps {
  z: ZoneShape;
  /** The look: "ok" (the right spot, green), "pick" (a preview or "Go here", blue), "other" (the
      other slot's spot, grey), "later" (saved for later, purple) or "hit" (red). */
  cls: string;
}

/** A spot on the arena: a circle, a rectangle or a polygon. A zone decided by a rule draws its
    `show` shapes, each in its own look if it has one. */
export function ZoneMark({ z, cls }: ZoneMarkProps) {
  if ("fn" in z)
    return (
      <>
        {z.show.map((sh, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the shapes of a zone never change order.
          <ZoneMark key={i} z={sh} cls={sh.cls || cls} />
        ))}
      </>
    );
  const className = `zone ${cls}`;
  if ("poly" in z) return <polygon className={className} points={z.poly.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ")} />;
  if ("c" in z) return <circle className={className} cx={f1(z.c[0])} cy={f1(z.c[1])} r={z.r} />;
  return (
    <rect className={className} x={f1(z.rect[0])} y={f1(z.rect[1])} width={f1(z.rect[2] - z.rect[0])} height={f1(z.rect[3] - z.rect[1])} />
  );
}
