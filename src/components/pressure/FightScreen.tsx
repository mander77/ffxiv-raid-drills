import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Fight, FightSeg } from "../../data/fight";
import type { CastControls } from "../../hooks/useCastTimeline";
import { FightFrameContext, type FrameFn } from "../../hooks/useFightFrame";
import { useFightKeys } from "../../hooks/useFightKeys";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  type Answered,
  activeSeg,
  answerFightStep,
  askAt,
  CAST_GO_LEAD,
  clickTarget,
  type FightMode,
  type FightState,
  type FightView,
  newFightState,
  nextSeg,
  seek,
  stepGoAt,
  tickFight,
  viewOf,
} from "../../lib/fight";
import type { Speed } from "../../stores/pressure";
import { useProgressStore } from "../../stores/progress";
import type { Point, Slot } from "../../types";
import { ArenaFrame, type ArenaFrameProps } from "../arena/ArenaFrame";
import { CastBar } from "./CastBar";
import { CastList } from "./CastList";
import { FightArena, type ShownHit } from "./FightArena";
import { FightHud } from "./FightHud";
import { FightPanel } from "./FightPanel";
import { FightPlayBar } from "./FightPlayBar";
import { Countdown, HitLabel, RunProgress, RunResult } from "./RunOverlays";

export interface FightScreenProps {
  /** run: you click your spots. watch: the correct moves play by themselves. */
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
  /** The player: whether the clock was paused when you took hold of the casts coming up. */
  const pausedBeforeHold = useRef(false);
  /** Counts "Watch the Spawns Again": the arena draws anew, so its spawns play again. */
  const [replays, setReplays] = useState(0);
  const score = useProgressStore((s) => s.score);
  /** A wide screen (lg, 1024 px and up): the run's cast bar, prompt and bar sit beside the arena,
      and the player has three columns. */
  const wide = useMediaQuery("(min-width: 1024px)");

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
    if (a.scored) score(a.scored.drill, a.scored.allCorrect, slot);
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
  /** The player: a click on a step chip goes to that step, paused. */
  function goToStep(g: FightSeg, j: number): void {
    const s = sim.current;
    s.paused = true;
    s.look = false;
    seekTo(stepGoAt(g, j));
  }
  /** The player: what the casts coming up let you do. A click on a cast pauses a few seconds
      before it, so you see it come; a drag moves the clock, which waits while you hold the timer
      and plays on after if it was playing. */
  const castControls: CastControls = {
    goTo(t) {
      const s = sim.current;
      s.paused = true;
      s.look = false;
      seekTo(t - CAST_GO_LEAD);
    },
    hold(holding) {
      const s = sim.current;
      if (holding) {
        pausedBeforeHold.current = s.paused;
        s.paused = true;
      } else {
        s.paused = pausedBeforeHold.current;
        onPause?.(s.paused ? s.t : null);
      }
      refresh();
    },
    scrub: seekTo,
  };
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
  /** The player, paused at the end of a mechanic: go to the next one. Returns whether it went. */
  function goToNextSeg(): boolean {
    const s = sim.current;
    const si = activeSeg(s.fight, s.t);
    const nx = si >= 0 ? nextSeg(s.fight, si) : null;
    if (!s.paused || !nx || s.results[si].length < s.fight.segs[si].due.length) return false;
    goToSeg(nx);
    return true;
  }
  useFightKeys({
    onPlayPause: togglePause,
    onSkip: mode === "watch" ? (seconds) => seekTo(sim.current.t + seconds) : undefined,
    onEnter: mode === "watch" ? goToNextSeg : undefined,
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

  /** The run's bar, in the place and the look of the player's play bar. */
  const runBar = (
    <div className="flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-1.5 pl-3">
      <RunProgress />
      <Button variant="outline" size="sm" onClick={togglePause}>
        {view.look ? "Go" : view.paused ? "Resume" : "Pause"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => onQuit?.(sim.current)}>
        Quit
      </Button>
    </div>
  );
  const playBar = (
    <FightPlayBar
      end={fight.end}
      marks={fight.segs.map((g) => ({ t: g.from, name: g.title }))}
      paused={view.paused}
      speed={speed}
      onPlay={togglePause}
      onSeek={seekTo}
      onSpeed={(v) => onSpeed?.(v)}
      settings={settings}
      onRestart={restart}
      onNewFight={() => onNewFight?.(sim.current.t)}
    />
  );
  const mechanicPanel = (
    <FightPanel view={view} fight={fight} onGoTo={goToSeg} onGoToStep={goToStep} onSpawns={() => setReplays((n) => n + 1)} />
  );
  /** The bar for the mode: the player's play bar, or the run's bar. */
  const controls = mode === "watch" ? playBar : runBar;

  /** What sits against the arena's floor, the same in the run and the player. A wide screen: what
      the boss casts and what it means before it (the player: the cast bar over the mechanic, which
      scrolls inside when it is long; the run: the cast bar over the prompt), and the bar over the
      casts coming up beside it. In a row, the arena grows up to its size limit (mx-0: no margins to
      centre it) and keeps room on each side for its columns. Below that, one column: the same
      over the arena, and the bar over the casts coming up, sideways, under it; the arena keeps its
      full size, and the page scrolls. */
  const sides: Partial<ArenaFrameProps> = wide
    ? {
        before: (
          <div className="flex w-80 flex-col gap-3">
            {mode === "watch" ? (
              <>
                <CastBar />
                <ScrollArea className="min-h-0 flex-1">{mechanicPanel}</ScrollArea>
              </>
            ) : (
              <FightHud />
            )}
          </div>
        ),
        beside: (
          <div className="flex w-80 flex-col gap-2">
            {controls}
            <CastList axis="y" className="flex-1" controls={mode === "watch" ? castControls : undefined} />
          </div>
        ),
        // On a tall screen the side columns run on to the bottom of the screen.
        tallSides: true,
        className: "mx-0 ml-80 mr-80 min-w-0 flex-1",
      }
    : mode === "watch"
      ? {
          over: (
            <div className="space-y-3 pb-2">
              <CastBar />
              {mechanicPanel}
            </div>
          ),
          under: (
            <div className="space-y-2">
              {controls}
              <CastList axis="x" controls={castControls} />
            </div>
          ),
          fill: true,
        }
      : {
          // The run's prompt sticks to the top of the screen, like the prompt bar on the other tabs.
          bar: <FightHud />,
          under: (
            <div className="space-y-2">
              {controls}
              <CastList axis="x" />
            </div>
          ),
          fill: true,
        };
  const arena = (
    // On a wide screen the whole arena fits on the screen. Below that, it fills its column (`fill`)
    // and the page scrolls, as on a phone.
    <ArenaFrame {...sides}>
      <FightArena
        view={view}
        slot={slot}
        correctLabel={mode === "run"}
        pickSpot={mode === "run"}
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
    </ArenaFrame>
  );

  return (
    <FightFrameContext value={frames}>
      {/* The run and the player look the same (owner's choice); only what sits against the floor
          differs. A wide screen: three columns in the middle of the page, which read as one. Below
          that, one column: never half of each (owner's choice). */}
      {wide ? <div className="flex justify-center">{arena}</div> : arena}
    </FightFrameContext>
  );
}
