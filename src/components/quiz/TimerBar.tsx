import { useEffect, useEffectEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type Timer, timerAt } from "../../lib/pressure";

export interface TimerBarProps {
  timer: Timer;
  /** Stop the bar where it is: after an answer. */
  stopped: boolean;
  /** Called once, when the time to decide runs out. */
  onTimeout: () => void;
}

/** The timer of a timed card: the bar fills while you read, then drains while you decide. */
export function TimerBar({ timer, stopped, onTimeout }: TimerBarProps) {
  const fill = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState<"reading" | "deciding" | "low">("reading");
  const timeout = useEffectEvent(onTimeout);

  // The clock runs outside React: a timeout ends the card, even when the tab is in the background,
  // and each animation frame moves the bar through its ref, without drawing the component again.
  // The look changes only twice, so that one goes through state.
  useEffect(() => {
    if (stopped) return;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const at = timerAt(timer, now - t0);
      if (fill.current) fill.current.style.width = `${(at.fill * 100).toFixed(1)}%`;
      setLook(at.reading ? "reading" : at.low ? "low" : "deciding");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const end = setTimeout(timeout, timer.readMs + timer.decideMs);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(end);
    };
  }, [stopped, timer]);

  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-sm font-medium" aria-live="polite">
        {look === "reading" ? "Read" : "Decide"}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          ref={fill}
          className={cn(
            "h-full w-0 rounded-full",
            look === "reading" && "bg-sky-500",
            look === "deciding" && "bg-primary",
            look === "low" && "bg-destructive",
          )}
        />
      </div>
    </div>
  );
}
