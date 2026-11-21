import { cn } from "@/lib/utils";

export interface TallyProps {
  correct: number;
  incorrect: number;
  missed: number;
  /** The name of the third count: "Froze" in the quick round, "Too slow" in the run. */
  missedLabel: string;
}

/** The counts at the end of a round: correct, incorrect, and the ones you missed. */
export function Tally({ correct, incorrect, missed, missedLabel }: TallyProps) {
  // Each count's colour is a complete Tailwind class, so Tailwind finds it when it scans the code.
  const items = [
    { label: "Correct", n: correct, color: "text-success-foreground" },
    { label: "Incorrect", n: incorrect, color: "text-destructive" },
    { label: missedLabel, n: missed, color: "text-warning-foreground" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border p-3 text-center">
          <dt className="text-sm text-muted-foreground">{it.label}</dt>
          <dd className={cn("font-display text-4xl tabular-nums", it.color)}>{it.n}</dd>
        </div>
      ))}
    </dl>
  );
}
