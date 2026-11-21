import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Fight, FightSeg } from "../../data/fight";
import { FightFrameContext, type FrameFn, useFightFrame } from "../../hooks/useFightFrame";
import { useFitToScreen } from "../../hooks/useFitToScreen";
import {
  type Answered,
  activeSeg,
  answerFightStep,
  askAt,
  clickTarget,
  countdownOf,
  type FightMode,
  type FightState,
  type FightView,
  newFightState,
  nextSeg,
  seek,
  tickFight,
  viewOf,
} from "../../lib/fight";
import type { Speed } from "../../stores/pressure";
import { useProgressStore } from "../../stores/progress";
import type { Point, Slot } from "../../types";
import { ARENA_ASPECT } from "../arena/Arena";
import { CategoryDots } from "../CategoryDots";
import { FightArena, type ShownHit } from "./FightArena";
import { FightHud } from "./FightHud";
import { FightPanel } from "./FightPanel";
import { FightPlayBar } from "./FightPlayBar";

export interface FightScreenProps {
  /** run: you click your spots. watch: the right moves play by themselves. */
  mode: FightMode;
  fight: Fight;
  slot: Slot;
  /** Open paused at this moment (a shared link to the player). */
  startAt?: number;
  /** The run: stop at each new mechanic, so you can look first. */
  stops?: boolean;
  /** The player's speed. */
  speed?: Speed;
  onSpeed?: (speed: Speed) => void;
  /** Called once, when the fight ends. */
  onDone: (s: FightState) => void;
  /** The run: Quit. */
  onQuit?: (s: FightState) => void;
  /** The player: called when it pauses (with the moment) or plays (null), for the address. */
  onPause?: (t: number | null) => void;
  /** The player: the Settings button and its sheet, in the play bar. */
  settings?: ReactNode;
  /** The player: New fight, at this moment. */
  onNewFight?: (t: number) => void;
}

/** The full fight on the fight clock. The clock and its rules live in src/lib/fight.ts; this
    component runs the frame loop, takes your clicks and keys, and draws the screen. The arena and
    the panel draw again only when what they show changes (viewOf's key); the parts that move on
    every frame (the cast bar, the timeline, your marker) move through refs (useFightFrame).
    A new `fight` prop (new picks, another slot) goes on at the same moment; give the component a
    `key` to start a fight from the pull instead. */
export function FightScreen({
  mode,
  fight,
  slot,
  startAt,
  stops = false,
  speed = 1,
  onSpeed,
  onDone,
  onQuit,
  onPause,
  settings,
  onNewFight,
}: FightScreenProps) {
  // TS note: the fight clock is a plain object that changes on every frame, outside React, so it
  // lives in a ref. The first draw makes it once (the function passed to useState runs once).
  const [first] = useState(() => {
    const s = newFightState(mode, fight, { paused: startAt !== undefined, stops });
    if (startAt !== undefined) seek(s, startAt);
    return s;
  });
  const sim = useRef(first);
  /** The fight the clock runs, to see when the fight prop changes. */
  const built = useRef(fight);
  const [frames] = useState(() => new Set<FrameFn>());
  const [view, setView] = useState<FightView>(() => viewOf(first));
  const [hit, setHit] = useState<ShownHit | null>(null);
  const [result, setResult] = useState<{ n: number; kind: Answered["kind"] } | null>(null);
  const ended = useRef(false);
  /** Counts "Watch the spawns again": the arena draws anew, so its spawns play again. */
  const [replays, setReplays] = useState(0);
  const score = useProgressStore((s) => s.score);
  // The whole arena fits on the screen: it is never taller than the room from its top to the
  // bottom of the screen (less the run's bar under it).
  const [fit, fitHeight] = useFitToScreen<HTMLDivElement>(mode === "run" ? RUN_BAR_ROOM : SCREEN_MARGIN);

  /** Draw what changed: the view when its key changed, and every part that moves. */
  function refresh(): void {
    const s = sim.current;
    const v = viewOf(s);
    setView((was) => (was.key === v.key ? was : v));
    for (const f of frames) f(s);
  }
  /** The run: show the result of an answer over the arena, and count a finished mechanic. */
  function showAnswer(a: Answered | null): void {
    if (!a || mode !== "run") return;
    setResult((was) => ({ n: (was?.n ?? 0) + 1, kind: a.kind }));
    if (a.scored) score(a.scored.drill, a.scored.allRight);
  }

  // One step of the clock per animation frame.
  const step = useEffectEvent((dt: number) => {
    if (ended.current) return;
    const s = sim.current;
    const tick = tickFight(s, dt, speed);
    const last = tick.hits.at(-1);
    if (last) {
      const v = viewOf(s);
      setHit((was) => ({ n: (was?.n ?? 0) + 1, hit: last, at: v.boss ? [v.boss.x, v.boss.y] : [50, 50] }));
    }
    for (const a of tick.answers) showAnswer(a);
    if (tick.done) {
      ended.current = true;
      onDone(s);
      return;
    }
    refresh();
  });
  // The frame loop runs outside React, like a game loop. A long gap (a hidden tab) does not jump
  // the fight: a frame moves the clock at most a quarter of a second.
  useEffect(() => {
    let last = performance.now();
    let id = requestAnimationFrame(function loop(now: number) {
      step(Math.max(0, Math.min(0.25, (now - last) / 1000)));
      last = now;
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function togglePause(): void {
    const s = sim.current;
    s.paused = !s.paused;
    // Go, after a stop at a new mechanic, works the same way.
    s.look = false;
    onPause?.(s.paused ? s.t : null);
    refresh();
  }
  function seekTo(t: number): void {
    const s = sim.current;
    seek(s, t);
    if (s.paused) onPause?.(s.t);
    refresh();
  }
  /** The player: go to a mechanic. Paused, it opens where its first step is asked. */
  function goToSeg(g: FightSeg): void {
    seekTo(sim.current.paused ? askAt(g, 0) : g.from);
  }
  function restart(): void {
    sim.current = newFightState(mode, fight, { paused: sim.current.paused, stops });
    onPause?.(sim.current.paused ? 0 : null);
    refresh();
  }
  function handlePointClick(p: Point): void {
    // On the player, a click on the map pauses it or plays it again, like a video.
    if (mode === "watch") {
      togglePause();
      return;
    }
    const s = sim.current;
    const si = clickTarget(s);
    if (si < 0) return;
    showAnswer(answerFightStep(s, si, p));
    refresh();
  }

  // The keys: Space plays or pauses. On the player, the arrows go 5 seconds back or on, and
  // paused at the end of a mechanic, Enter goes to the next one.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    // Keys on a button or the slider are theirs, and so are keys in Settings (a dialog).
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "BUTTON" || target?.tagName === "INPUT" || target?.closest('[role="dialog"]')) return;
    const s = sim.current;
    if (e.key === " ") {
      e.preventDefault();
      togglePause();
    } else if (mode === "watch" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      seekTo(s.t + (e.key === "ArrowLeft" ? -5 : 5));
    } else if (mode === "watch" && e.key === "Enter") {
      const si = activeSeg(s.fight, s.t);
      const nx = si >= 0 ? nextSeg(s.fight, si) : null;
      if (s.paused && nx && s.results[si].length >= s.fight.segs[si].due.length) {
        e.preventDefault();
        goToSeg(nx);
      }
    }
  });
  // A new fight (new picks, another slot) is built again at the same moment, paused or playing.
  // The clock is outside React, so an effect keeps it in step with the fight prop.
  const rebuild = useEffectEvent((next: Fight) => {
    if (built.current === next) return;
    built.current = next;
    const was = sim.current;
    const s = newFightState(mode, next, { paused: was.paused, stops });
    seek(s, was.t);
    sim.current = s;
    refresh();
  });
  useEffect(() => rebuild(fight), [fight]);

  // The keys listen on the window, outside React, so an effect adds and removes the listener.
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const arena = (
    <div
      ref={fit}
      className="relative mx-auto w-full max-w-2xl"
      style={fitHeight === undefined ? undefined : { maxWidth: Math.min(ARENA_MAX, fitHeight * ARENA_ASPECT) }}
    >
      <FightArena
        view={view}
        slot={slot}
        rightLabel={mode === "run"}
        hit={hit}
        replay={replays}
        onPointClick={handlePointClick}
        className="h-auto w-full"
      />
      {hit && <HitLabel key={hit.n} hit={hit} />}
      {mode === "run" ? (
        <>
          {result && <RunResult key={result.n} kind={result.kind} />}
          <Countdown />
          {view.paused && !view.look && (
            <div className="absolute inset-0 grid place-items-center bg-background/75">
              <Button onClick={togglePause}>Resume</Button>
            </div>
          )}
          {view.look && view.si >= 0 && (
            // A stop at a new mechanic: a bar at the bottom of the arena, which leaves the floor in view.
            <div className="absolute inset-x-2 bottom-2 flex items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-md">
              <span className="flex-1">
                New mechanic: <b>{fight.segs[view.si].title}</b>. Look at the floor, then press Go.
              </span>
              <Button onClick={togglePause}>Go</Button>
            </div>
          )}
        </>
      ) : (
        view.paused && (
          <div className="pointer-events-none absolute top-0 left-[4%] rounded-full bg-foreground px-3 py-1 text-sm text-background">
            Paused<span className="max-sm:hidden"> · click the map to play</span>
          </div>
        )
      )}
    </div>
  );

  return (
    <FightFrameContext value={frames}>
      {mode === "run" ? (
        <div className="mx-auto max-w-xl space-y-3">
          <FightHud />
          {arena}
          <div className="flex items-center gap-3">
            <RunProgress />
            <Button variant="outline" onClick={togglePause}>
              {view.look ? "Go" : view.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="outline" onClick={() => onQuit?.(sim.current)}>
              Quit
            </Button>
          </div>
        </div>
      ) : (
        // On a wide screen the play bar goes beside the arena, at the top of the panel, so the arena
        // can use the screen's whole height. On a phone it comes under the arena.
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-3">
            <FightHud />
            {arena}
          </div>
          <div className="min-w-0 space-y-4">
            <FightPlayBar
              end={fight.end}
              marks={fight.segs.map((g) => g.from)}
              paused={view.paused}
              speed={speed}
              onPlay={togglePause}
              onSeek={seekTo}
              onSpeed={(v) => onSpeed?.(v)}
              settings={settings}
              onRestart={restart}
              onNewFight={() => onNewFight?.(sim.current.t)}
            />
            <FightPanel view={view} fight={fight} speed={speed} onGoTo={goToSeg} onSpawns={() => setReplays((n) => n + 1)} />
          </div>
        </div>
      )}
    </FightFrameContext>
  );
}

/** The room for the run's bar under the arena, and the margin at the bottom of the screen, in
    pixels. The app's choice. */
const RUN_BAR_ROOM = 64;
const SCREEN_MARGIN = 16;
/** The widest the arena gets, in pixels. The app's choice: wider only adds scrolling. */
const ARENA_MAX = 672;

interface HitLabelProps {
  hit: ShownHit;
}

/** The name of a hit over the arena for a moment, after its category's colour mark. */
function HitLabel({ hit }: HitLabelProps) {
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

/** The colour of a result in the run. Complete class names, so Tailwind finds them. */
const RESULT_LOOK: Record<Answered["kind"], string> = {
  ok: "bg-green-700",
  bad: "bg-destructive",
  slow: "bg-amber-600",
};
const RESULT_TEXT: Record<Answered["kind"], string> = { ok: "✓ Right", bad: "✗ Not there", slow: "✗ Too slow" };

interface RunResultProps {
  kind: Answered["kind"];
}

/** The run: your result over the arena for a moment. */
function RunResult({ kind }: RunResultProps) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute bottom-[6%] left-1/2 -translate-x-1/2 animate-flash-label rounded-full px-3.5 py-1 font-semibold whitespace-nowrap text-white",
        RESULT_LOOK[kind],
      )}
    >
      {RESULT_TEXT[kind]}
    </div>
  );
}

/** The run: the 3-2-1 before each mechanic. It runs on the fight clock, so a pause stops it too. */
function Countdown() {
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
function RunProgress() {
  const [text, setText] = useState("");
  useFightFrame((s) => {
    const f = s.fight;
    const si = activeSeg(f, s.t);
    const i = si >= 0 ? si : f.segs.findIndex((x) => x.from > s.t);
    setText(`Mechanic ${i < 0 ? f.segs.length : i + 1} of ${f.segs.length}`);
  });
  return <span className="flex-1 text-sm text-muted-foreground">{text}</span>;
}
