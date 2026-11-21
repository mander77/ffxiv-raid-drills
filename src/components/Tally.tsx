import { cn } from "@/lib/utils";

export interface TallyProps {
  right: number;
  wrong: number;
  missed: number;
  /** The name of the third count: "Froze" in the quick round, "Too slow" in the run. */
  missedLabel: string;
}

/** The counts at the end of a round: right, wrong, and the ones you missed. */
export function Tally({ right, wrong, missed, missedLabel }: TallyProps) {
  // Each count's colour is a complete Tailwind class, so Tailwind finds it when it scans the code.
  const items = [
    { label: "Right", n: right, color: "text-green-700" },
    { label: "Wrong", n: wrong, color: "text-destructive" },
    { label: missedLabel, n: missed, color: "text-amber-700" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border p-3 text-center">
          <dt className="text-sm text-muted-foreground">{it.label}</dt>
          <dd className={cn("text-3xl font-semibold tabular-nums", it.color)}>{it.n}</dd>
        </div>
      ))}
    </dl>
  );
}
