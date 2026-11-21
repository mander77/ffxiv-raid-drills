import { ChevronDown, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  onPlay: () => void;
  onSeek: (t: number) => void;
  onSpeed: (speed: Speed) => void;
  /** The Settings button and its sheet. */
  settings?: ReactNode;
  onRestart: () => void;
  onNewFight: () => void;
}

/** The play bar of Watch the right moves, in one slim row under the arena, like a video player's:
    play or pause, a slider for the fight time (its ticks mark where each mechanic starts), the
    time, the speed, and buttons for Start over, New fight and Settings. On a phone it wraps. */
export function FightPlayBar({ end, marks, paused, speed, onPlay, onSeek, onSpeed, settings, onRestart, onNewFight }: FightPlayBarProps) {
  const slider = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  /** True while you drag the slider, so the clock does not move it under your finger. */
  const dragging = useRef(false);
  const ticks = useId();

  // Each frame moves the slider and the time. The slider is an uncontrolled input: React sets its
  // first value, and the frame loop and your drags move it after that.
  useFightFrame((s) => {
    if (slider.current && !dragging.current) slider.current.value = s.t.toFixed(1);
    const text = `${clock(s.t)} / ${clock(end)}`;
    if (time.current && time.current.textContent !== text) time.current.textContent = text;
  });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-card p-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" aria-label={paused ? "Play" : "Pause"} onClick={onPlay}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </Button>
        </TooltipTrigger>
        {/* The keys, for the keyboard: they show when you point at the button. */}
        <TooltipContent>Space: play or pause. ← and →: 5 seconds back or on. Or click the map.</TooltipContent>
      </Tooltip>
      <input
        ref={slider}
        type="range"
        min={0}
        max={end}
        step={0.1}
        defaultValue={0}
        list={ticks}
        aria-label="Fight time"
        className="min-w-32 flex-1 accent-primary"
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
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={`Speed: ${speed}x`} className="tabular-nums">
              {speed}x
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={String(speed)}
              onValueChange={(v) => {
                const next = SPEEDS.find((x) => String(x) === v);
                if (next) onSpeed(next);
              }}
            >
              {SPEEDS.map((x) => (
                <DropdownMenuRadioItem key={x} value={String(x)}>
                  {x}x
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton label="Start over" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
        </IconButton>
        <IconButton label="New fight" onClick={onNewFight}>
          <Shuffle aria-hidden="true" />
        </IconButton>
        {settings}
      </div>
    </div>
  );
}

interface IconButtonProps {
  /** The button's name, read out and shown as its tooltip. */
  label: string;
  onClick: () => void;
  children: ReactNode;
}

/** A small icon button, with its name as a tooltip. */
function IconButton({ label, onClick, children }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
