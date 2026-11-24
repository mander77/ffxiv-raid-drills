import { HITBOX } from "../../data/fights/m11s/attacks";
import { unit, zoneCenter } from "../../geometry";
import type { Point, Zone } from "../../types";
import { ArenaLabel, type LabelLook } from "./ArenaLabel";

/** The kinds of label a zone can carry: the text, the width in arena units, and the colour. A
    look-ahead step (spot the first weapon) is not a spot to go to, so it gets its own label and
    colour. */
export const ZONE_LABELS = {
  correct: { text: "Correct spot", w: 17, look: "ok" },
  later: { text: "Look Ahead", w: 16, look: "later" },
  go: { text: "Go here", w: 14, look: "pick" },
} as const satisfies Record<string, { text: string; w: number; look: LabelLook }>;

/** The height of a zone's label, in arena units. */
const LABEL_H = 4.2;

/** How far from the boss's middle a label keeps clear: his hitbox ring and its flank ticks. */
const BOSS_CLEAR = HITBOX + 2;

export interface ZoneLabelProps {
  zone: Zone;
  kind: keyof typeof ZONE_LABELS;
  /** The boss's middle. The label keeps out of his ring, so it never covers him or the weapon he
      stands on. */
  boss?: Point | null;
}

/** Keep a label's middle inside the picture. */
function clampInside(p: Point, w: number): Point {
  return [Math.max(-4 + w / 2, Math.min(104 - w / 2, p[0])), Math.max(-6 + LABEL_H / 2, Math.min(104 - LABEL_H / 2, p[1]))];
}

/** Whether a label box centred on p reaches into the circle of radius r around c. */
function touches(p: Point, w: number, c: Point, r: number): boolean {
  const nx = Math.max(p[0] - w / 2, Math.min(c[0], p[0] + w / 2));
  const ny = Math.max(p[1] - LABEL_H / 2, Math.min(c[1], p[1] + LABEL_H / 2));
  return Math.hypot(nx - c[0], ny - c[1]) < r;
}

/** A label over a zone: above it when there is room, else below it, and always inside the picture.
    When that spot is inside the boss's ring, the label moves straight out from him, past the ring.
    It does not name your slot: your own marker is you, so a slot name would look like a second you. */
export function ZoneLabel({ zone: z, kind, boss }: ZoneLabelProps) {
  const label = ZONE_LABELS[kind];
  const ctr = zoneCenter(z);
  const top = "c" in z ? z.c[1] - z.r : "rect" in z ? z.rect[1] : ctr[1] + 1;
  const bottom = "c" in z ? z.c[1] + z.r : "rect" in z ? z.rect[3] : ctr[1] - 1;
  const y = "fn" in z ? ctr[1] : top - 3 >= -3 ? top - 3 : bottom + 3;
  let at = clampInside([ctr[0], y], label.w);
  if (boss && touches(at, label.w, boss, BOSS_CLEAR)) {
    // Out from the boss through the zone's middle; straight up when the zone is on him.
    const away = Math.hypot(ctr[0] - boss[0], ctr[1] - boss[1]) > 1 ? unit([ctr[0] - boss[0], ctr[1] - boss[1]]) : ([0, -1] as Point);
    for (let d = 0; d <= 60 && touches(at, label.w, boss, BOSS_CLEAR); d += 0.5)
      at = clampInside([boss[0] + away[0] * d, boss[1] + away[1] * d], label.w);
  }
  return <ArenaLabel at={at} text={label.text} w={label.w} h={LABEL_H} look={label.look} />;
}
