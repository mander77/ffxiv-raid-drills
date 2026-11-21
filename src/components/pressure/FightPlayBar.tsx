import { Pause, Play } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFightFrame } from "../../hooks/useFightFrame";
import { SPEEDS, type Speed } from "../../stores/pressure";
import { clock } from "../../time";

export interface FightPlayBarProps {
  /** The end of the fight, in seconds. */
  end: number;
  /** Where each mechanic starts, for the ticks on the slider. */
  marks: readonly number[];
  paused: boolean;
  speed: Speed;
  settingsOpen: boolean;
  onPlay: () => void;
  onSeek: (t: number) => void;
  onSpeed: (speed: Speed) => void;
  onSettings: () => void;
  onRestart: () => void;
  onNewFight: () => void;
}

/** The play bar of Watch the right moves: play or pause, a slider for the fight time (its ticks
    mark where each mechanic starts), the time, Settings, the speed, Start over and New fight. */
export function FightPlayBar({
  end,
  marks,
  paused,
  speed,
  settingsOpen,
  onPlay,
  onSeek,
  onSpeed,
  onSettings,
  onRestart,
  onNewFight,
}: FightPlayBarProps) {
  const slider = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  /** True while you drag the slider, so the clock does not move it under your finger. */
  const dragging = useRef(false);
  const ticks = useId();
  const speedLabel = useId();

  // Each frame moves the slider and the time. The slider is an uncontrolled input: React sets its
  // first value, and the frame loop and your drags move it after that.
  useFightFrame((s) => {
    if (slider.current && !dragging.current) slider.current.value = s.t.toFixed(1);
    const text = `${clock(s.t)} / ${clock(end)}`;
    if (time.current && time.current.textContent !== text) time.current.textContent = text;
  });

  return (
    // The bar sticks to the bottom of the screen while the arena is in view.
    <div className="sticky bottom-0 z-10 space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        <Button size="icon" aria-label={paused ? "Play" : "Pause"} onClick={onPlay}>
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
        <input
          ref={slider}
          type="range"
          min={0}
          max={end}
          step={0.1}
          defaultValue={0}
          list={ticks}
          aria-label="Fight time"
          className="min-w-0 flex-1 accent-primary"
          onPointerDown={() => {
            dragging.current = true;
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <datalist id={ticks}>
          {marks.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <span ref={time} className="text-sm whitespace-nowrap tabular-nums" />
        <Button variant="outline" size="sm" aria-pressed={settingsOpen} onClick={onSettings}>
          Settings
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span id={speedLabel} className="sr-only">
          Speed
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(speed)}
          aria-labelledby={speedLabel}
          onValueChange={(v) => {
            const next = SPEEDS.find((x) => String(x) === v);
            if (next) onSpeed(next);
          }}
        >
          {SPEEDS.map((x) => (
            <ToggleGroupItem key={x} value={String(x)}>
              {x}x
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={onRestart}>
          Start over
        </Button>
        <Button variant="outline" size="sm" onClick={onNewFight}>
          New fight
        </Button>
        <span className="text-sm text-muted-foreground pointer-coarse:hidden">
          Click the map or <Kbd>Space</Kbd>: play or pause · <Kbd>←</Kbd> <Kbd>→</Kbd> 5 seconds
        </span>
      </div>
    </div>
  );
}
