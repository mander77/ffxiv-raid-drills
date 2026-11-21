import { ChevronDown, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { type ReactNode, useRef } from "react";
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

/** A mechanic's start, marked under the slider. */
export interface SliderMark {
  t: number;
  name: string;
}

/** The width of the slider's thumb in pixels, so a tick lines up with the thumb at its time. The
    browsers draw it about this wide. */
const THUMB = 16;

export interface FightPlayBarProps {
  /** The end of the fight, in seconds. */
  end: number;
  /** Each mechanic and when it starts, for the ticks under the slider. */
  marks: readonly SliderMark[];
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

/** The play bar of Watch the right moves, thin like a video player's: a slider for the fight
    time across the top, with a tick under it where each mechanic starts (point at one for its
    name, click it to go there), then one row with play or pause, the time, the speed, and buttons
    for Start over, New fight and Settings. */
export function FightPlayBar({ end, marks, paused, speed, onPlay, onSeek, onSpeed, settings, onRestart, onNewFight }: FightPlayBarProps) {
  const slider = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  /** True while you drag the slider, so the clock does not move it under your finger. */
  const dragging = useRef(false);

  // Each frame moves the slider and the time. The slider is an uncontrolled input: React sets its
  // first value, and the frame loop and your drags move it after that.
  useFightFrame((s) => {
    if (slider.current && !dragging.current) slider.current.value = s.t.toFixed(1);
    const text = `${clock(s.t)} / ${clock(end)}`;
    if (time.current && time.current.textContent !== text) time.current.textContent = text;
  });

  return (
    // Thin, like a video player's controls: the slider across the top, the buttons in one row under it.
    <div className="rounded-lg border bg-card px-1.5 py-1">
      <input
        ref={slider}
        type="range"
        min={0}
        max={end}
        step={0.1}
        defaultValue={0}
        aria-label="Fight time"
        className="block h-4 w-full accent-primary"
        onPointerDown={() => {
          dragging.current = true;
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <div className="relative h-2">
        {marks.map((m) => (
          <Tick key={m.t} mark={m} left={`calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${m.t / end})`} onSeek={onSeek} />
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1 border-t pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" aria-label={paused ? "Play" : "Pause"} onClick={onPlay}>
              {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </Button>
          </TooltipTrigger>
          {/* The keys, for the keyboard: they show when you point at the button. */}
          <TooltipContent>Space: play or pause. ← and →: 5 seconds back or on. Or click the map.</TooltipContent>
        </Tooltip>
        <span ref={time} className="mr-auto px-1 text-sm whitespace-nowrap tabular-nums" />
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

interface TickProps {
  mark: SliderMark;
  /** Where it sits along the slider, as CSS. */
  left: string;
  onSeek: (t: number) => void;
}

/** One mechanic's tick under the slider: its name shows when you point at it, and a click goes to
    it. The keyboard skips the ticks; the slider and the mechanic's own buttons cover it. */
function Tick({ mark, left, onSeek }: TickProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Go to ${mark.name}`}
          className="group absolute inset-y-0 flex w-2 -translate-x-1/2 cursor-pointer justify-center"
          style={{ left }}
          onClick={() => onSeek(mark.t)}
        >
          <span className="w-px bg-muted-foreground/60 group-hover:w-0.5 group-hover:bg-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{mark.name}</TooltipContent>
    </Tooltip>
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
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
