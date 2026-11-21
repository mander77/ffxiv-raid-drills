import { zoneCenter } from "../../geometry";
import type { Zone } from "../../types";
import { ArenaLabel, type LabelLook } from "./ArenaLabel";

/** The kinds of label a zone can carry: the text, the width in arena units, and the colour. A
    look-ahead step (spot the first weapon) is not a spot to go to, so it gets its own label and
    colour. */
export const ZONE_LABELS = {
  right: { text: "Right spot", w: 17, look: "ok" },
  later: { text: "Saved for later", w: 24, look: "later" },
  go: { text: "Go here", w: 14, look: "pick" },
} as const satisfies Record<string, { text: string; w: number; look: LabelLook }>;

/** The height of a zone's label, in arena units. */
const LABEL_H = 4.2;

export interface ZoneLabelProps {
  zone: Zone;
  kind: keyof typeof ZONE_LABELS;
}

/** A label over a zone: above it when there is room, else below it, and always inside the picture.
    It does not name your slot: your own marker is you, so a slot name would look like a second you. */
export function ZoneLabel({ zone: z, kind }: ZoneLabelProps) {
  const label = ZONE_LABELS[kind];
  const ctr = zoneCenter(z);
  const top = "c" in z ? z.c[1] - z.r : "rect" in z ? z.rect[1] : ctr[1] + 1;
  const bottom = "c" in z ? z.c[1] + z.r : "rect" in z ? z.rect[3] : ctr[1] - 1;
  const y = "fn" in z ? ctr[1] : top - 3 >= -3 ? top - 3 : bottom + 3;
  const x = Math.max(-4 + label.w / 2, Math.min(104 - label.w / 2, ctr[0]));
  return <ArenaLabel at={[x, y]} text={label.text} w={label.w} h={LABEL_H} look={label.look} />;
}
