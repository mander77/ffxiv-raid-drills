import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { type Answered, activeSeg, countdownOf } from "../../lib/fight";
import { CategoryDots } from "../CategoryDots";
import type { ShownHit } from "./FightArena";

// The small parts that sit over the fight's arena: the name of a hit (the run and the player),
// and the run's result, countdown and progress.

export interface HitLabelProps {
  hit: ShownHit;
}

/** The name of a hit over the arena for a moment, after its category's colour mark. */
export function HitLabel({ hit }: HitLabelProps) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-[8%] left-1/2 flex max-w-[94%] -translate-x-1/2 animate-flash-label items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1 text-sm font-semibold whitespace-nowrap text-background"
    >
      <CategoryDots cats={[hit.hit.cat]} size="md" />
      <span className="truncate">{hit.hit.name}</span>
    </div>
  );
}

/** The colour of a result in the run: the theme's answer pairs turned round, the strong colour as
    the fill and the soft one as the text, so the label stands out on the pale arena. Complete
    class names, so Tailwind finds them. */
const RESULT_LOOK: Record<Answered["kind"], string> = {
  ok: "bg-success-foreground text-success",
  bad: "bg-danger-foreground text-danger",
  slow: "bg-warning-foreground text-warning",
};
const RESULT_TEXT: Record<Answered["kind"], string> = { ok: "✓ Correct", bad: "✗ Not there", slow: "✗ Too slow" };

export interface RunResultProps {
  kind: Answered["kind"];
}

/** The run: your result over the arena for a moment. */
export function RunResult({ kind }: RunResultProps) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute bottom-[6%] left-1/2 -translate-x-1/2 animate-flash-label rounded-full px-3.5 py-1 font-semibold whitespace-nowrap shadow-sm",
        RESULT_LOOK[kind],
      )}
    >
      {RESULT_TEXT[kind]}
    </div>
  );
}

/** The run: the 3-2-1 before each mechanic. It runs on the fight clock, so a pause stops it too. */
export function Countdown() {
  const [count, setCount] = useState<{ n: number; name: string } | null>(null);
  useFightFrame((s) => {
    const c = countdownOf(s);
    setCount((was) => (was?.n === c?.n && was?.name === c?.name ? was : c));
  });
  if (!count) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center gap-2 bg-background/60 text-center">
      <b className="font-display text-8xl tabular-nums">{count.n}</b>
      <span className="text-xl font-semibold">{count.name}</span>
    </div>
  );
}

/** The run: how far you are, in mechanics. */
export function RunProgress() {
  const [text, setText] = useState("");
  useFightFrame((s) => {
    const f = s.fight;
    const si = activeSeg(f, s.t);
    const i = si >= 0 ? si : f.segs.findIndex((x) => x.from > s.t);
    setText(`Mechanic ${i < 0 ? f.segs.length : i + 1} of ${f.segs.length}`);
  });
  return <span className="flex-1 text-sm text-muted-foreground">{text}</span>;
}
