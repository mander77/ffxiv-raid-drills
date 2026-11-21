import { f1, zoneCenter } from "../../geometry";
import type { Zone } from "../../types";

/** The tags a zone can carry: its text, its width in arena units, and its look. A look-ahead step
    (spot the first weapon) is not a spot to go to, so it gets its own tag and colour. */
export const ZONE_TAGS = {
  right: { text: "Right spot", w: 17, cls: "zlabel" },
  later: { text: "Saved for later", w: 24, cls: "zlabel later" },
  go: { text: "Go here", w: 14, cls: "zlabel pick" },
} as const;

export interface ZoneTagProps {
  zone: Zone;
  tag: keyof typeof ZONE_TAGS;
}

/** A tag over a zone: above it when there is room, else below it, and always inside the picture.
    It does not name your slot: your own marker is you, so a slot name would look like a second you. */
export function ZoneTag({ zone: z, tag }: ZoneTagProps) {
  const t = ZONE_TAGS[tag];
  const ctr = zoneCenter(z);
  const top = "c" in z ? z.c[1] - z.r : "rect" in z ? z.rect[1] : ctr[1] + 1;
  const bottom = "c" in z ? z.c[1] + z.r : "rect" in z ? z.rect[3] : ctr[1] - 1;
  const y = "fn" in z ? ctr[1] : top - 3 >= -3 ? top - 3 : bottom + 3;
  const x = Math.max(-4 + t.w / 2, Math.min(104 - t.w / 2, ctr[0]));
  return (
    <g className={t.cls}>
      <rect x={f1(x - t.w / 2)} y={f1(y - 2.1)} width={t.w} height="4.2" rx=".9" />
      <text x={f1(x)} y={f1(y)}>
        {t.text}
      </text>
    </g>
  );
}
