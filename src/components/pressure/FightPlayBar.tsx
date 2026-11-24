import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFightFrame } from "../../hooks/useFightFrame";
import { SPEEDS, type Speed } from "../../stores/pressure";
import { clock } from "../../time";
import { IconButton } from "../IconButton";
import { NewFightIcon, OpenMenuIcon, PauseIcon, PlayIcon, ResetIcon } from "../icons";

/** A mechanic's start, marked under the slider. */
export interface SliderMark {
  t: number;
  name: string;
}

/** The width of the slider's thumb in pixels (size-4 in slider.tsx), so a tick lines up with the
    thumb at its time: the Slider keeps its thumb inside the track, so the thumb's centre runs from
    half a thumb in at the start to half a thumb in at the end. */
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

/** The play bar of Watch the correct moves, thin like a video player's: a slider for the fight
    time across the top, with a tick under it where each mechanic starts (point at one for its
    name, click it to go there), then one row with play or pause, the time, the speed, and buttons
    for Start over, New fight and Settings. */
export function FightPlayBar({ end, marks, paused, speed, onPlay, onSeek, onSpeed, settings, onRestart, onNewFight }: FightPlayBarProps) {
  const time = useRef<HTMLSpanElement>(null);

  // Each frame moves the time. The text changes through a ref, so the bar does not draw again.
  useFightFrame((s) => {
    const text = `${clock(s.t)} / ${clock(end)}`;
    if (time.current && time.current.textContent !== text) time.current.textContent = text;
  });

  return (
    // Thin, like a video player's controls: the slider across the top, the buttons in one row under it.
    <div className="rounded-lg border bg-card px-1.5 py-1">
      <FightTimeSlider end={end} onSeek={onSeek} />
      {/* The ticks' row is as tall as a tick's target, which is wider than the line it draws. */}
      <div className="relative h-4">
        {marks.map((m) => (
          <Tick key={m.t} mark={m} left={`calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${m.t / end})`} onSeek={onSeek} />
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1 border-t pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" aria-label={paused ? "Play" : "Pause"} onClick={onPlay}>
              {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
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
              <OpenMenuIcon aria-hidden="true" />
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
        <IconButton label="Start Over" onClick={onRestart}>
          <ResetIcon aria-hidden="true" />
        </IconButton>
        <IconButton label="New Fight" onClick={onNewFight}>
          <NewFightIcon aria-hidden="true" />
        </IconButton>
        {settings}
      </div>
    </div>
  );
}

interface FightTimeSliderProps {
  end: number;
  onSeek: (t: number) => void;
}

/** The slider for the fight time. It follows the fight clock, and dragging it, clicking its track
    or the arrow keys on it move the clock. */
function FightTimeSlider({ end, onSeek }: FightTimeSliderProps) {
  const [t, setT] = useState(0);
  /** True while you drag the slider, so the clock does not move it under your finger. */
  const dragging = useRef(false);

  // Each frame moves the slider to the fight time, to its step of 0.1 seconds. The state changes
  // only when that step changes, so the slider draws again a few times a second, not every frame.
  useFightFrame((s) => {
    if (!dragging.current) setT(Math.round(s.t * 10) / 10);
  });

  return (
    <Slider
      aria-label="Fight time"
      min={0}
      max={end}
      step={0.1}
      value={[t]}
      className="h-4"
      onPointerDown={() => {
        dragging.current = true;
      }}
      onValueChange={([v]) => {
        setT(v);
        onSeek(v);
      }}
      // The slider holds the pointer while you drag, so the pointer comes up on it.
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      // The slider's keys are its own: the arrows move it a step, and Space does not play or pause
      // the fight while it has the focus.
      onKeyDown={(e) => e.stopPropagation()}
    />
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
          aria-label={`Jump to ${mark.name}`}
          className="group absolute inset-y-0 flex w-3 -translate-x-1/2 cursor-pointer justify-center"
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
