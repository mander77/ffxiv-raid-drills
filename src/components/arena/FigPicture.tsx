import type { Fig, Preview } from "../../types";
import { Arena, pieceLayers } from "./Arena";
import { BossMark } from "./BossMark";
import { ZoneArea } from "./ZoneArea";

export interface FigPictureProps {
  fig: Fig;
  /** True once the question is answered: the picture shows what the mechanic does and the right
      spot in green. */
  answered: boolean;
  label: string;
  /** One answer to preview before you answer, in the neutral colour. */
  preview?: Preview;
  className?: string;
}

/** A still arena picture for a quiz question. Until it is answered, it shows the setup, or the
    setup with one answer previewed. After the answer, it shows what the mechanic does and the
    right spot in green. */
export function FigPicture({ fig: f, answered, label, preview, className }: FigPictureProps) {
  const extra = answered ? (f.after ?? []) : preview ? preview.pieces : (f.before ?? []);
  const zones = answered
    ? // biome-ignore lint/suspicious/noArrayIndexKey: the zones of a picture never change order.
      (f.answer ?? []).map((z, i) => <ZoneArea key={i} z={z} cls="ok" />)
    : // biome-ignore lint/suspicious/noArrayIndexKey: the zones of a picture never change order.
      (preview?.zones ?? []).map((z, i) => <ZoneArea key={i} z={z} cls="pick" />);
  return (
    <Arena
      label={label}
      split={f.split}
      className={className}
      layers={{ ...pieceLayers([...f.overlays, ...extra]), zones, boss: f.boss ? <BossMark boss={f.boss} /> : null }}
    />
  );
}
