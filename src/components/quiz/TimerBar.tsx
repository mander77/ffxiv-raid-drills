import { useEffect, useEffectEvent, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { type Timer, timerAt } from "../../lib/pressure";

export interface TimerBarProps {
  timer: Timer;
  /** Stop the bar where it is: after an answer. */
  stopped: boolean;
  /** Called once, when the time to decide runs out. */
  onTimeout: () => void;
}

/** The colour of the bar while you read, while you decide, and in the last third. Complete class
    names, so Tailwind finds them. They colour the bar inside the Progress (its indicator). */
const LOOK = {
  reading: "*:data-[slot=progress-indicator]:bg-hint-foreground",
  deciding: "*:data-[slot=progress-indicator]:bg-primary",
  low: "*:data-[slot=progress-indicator]:bg-destructive",
} as const;

/** The timer of a timed card (a shadcn/ui Progress): the bar fills while you read, then drains
    while you decide. */
export function TimerBar({ timer, stopped, onTimeout }: TimerBarProps) {
  const [now, setNow] = useState<{ look: keyof typeof LOOK; percent: number }>({ look: "reading", percent: 0 });
  const timeout = useEffectEvent(onTimeout);

  // The clock runs outside React: a timeout ends the card, even when the tab is in the background,
  // and each animation frame moves the bar. The bar draws again only when its whole percent changes.
  useEffect(() => {
    if (stopped) return;
    const t0 = performance.now();
    let frame = 0;
    const tick = (time: number): void => {
      const at = timerAt(timer, time - t0);
      const look = at.reading ? "reading" : at.low ? "low" : "deciding";
      const percent = Math.round(at.fill * 100);
      setNow((was) => (was.look === look && was.percent === percent ? was : { look, percent }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const end = setTimeout(timeout, timer.readMs + timer.decideMs);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(end);
    };
  }, [stopped, timer]);

  const label = now.look === "reading" ? "Read" : "Decide";
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-sm font-medium" aria-hidden="true">
        {label}
      </span>
      <Progress
        value={now.percent}
        // shadcn's Progress uses `value` for the bar's width only, so the value for screen readers
        // goes to Radix directly.
        aria-valuenow={now.percent}
        aria-label={now.look === "reading" ? "Time to read" : "Time to decide"}
        // The bar follows the clock itself, so the indicator's slide animation is off.
        className={cn("flex-1 *:data-[slot=progress-indicator]:transition-none", LOOK[now.look])}
      />
    </div>
  );
}
