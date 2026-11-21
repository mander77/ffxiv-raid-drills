import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ABILITIES } from "../../data/abilities";
import type { Fight, FightSeg } from "../../data/fight";
import { useFightFrame } from "../../hooks/useFightFrame";
import { activeSeg, type FightView, nextSeg, upcoming } from "../../lib/fight";
import { clock } from "../../time";
import { CategoryDots, categoryNames } from "../CategoryDots";
import { LastAnswer } from "../LastAnswer";
import { RuleBox } from "../RuleBox";
import { SetupText } from "../SetupText";
import { StepChips } from "../StepChips";
import { FightTimeline } from "./FightTimeline";

export interface FightPanelProps {
  view: FightView;
  fight: Fight;
  speed: number;
  /** Go to a mechanic. */
  onGoTo: (g: FightSeg) => void;
  /** Watch the spawns of the mechanic again. */
  onSpawns: () => void;
  /** Show the clock and the fight timeline at the top (a narrow screen). On a wide screen they sit
      under the cast bar instead (FightUpcoming). */
  timeline?: boolean;
}

/** The panel beside the player: the mechanic on the arena, then the clock and the fight timeline.
    Its setup folds after the first hit, the steps show as chips, and at the end the rule shows
    with the way on to the next mechanic. Between mechanics: the next mechanic and the next ability. */
export function FightPanel({ view: v, fight, speed, onGoTo, onSpawns, timeline = true }: FightPanelProps) {
  const g = v.si >= 0 ? fight.segs[v.si] : null;
  return (
    <section aria-label="The right moves" className="space-y-4">
      {g ? (
        <Mechanic view={v} fight={fight} g={g} onGoTo={onGoTo} onSpawns={onSpawns} />
      ) : (
        <Between paused={v.paused} fight={fight} onGoTo={onGoTo} />
      )}
      {timeline && <FightUpcoming speed={speed} />}
    </section>
  );
}

export interface FightUpcomingProps {
  speed: number;
}

/** The clock and the speed, then the fight timeline: what the boss casts next. */
export function FightUpcoming({ speed }: FightUpcomingProps) {
  return (
    <div className="space-y-2">
      <p className="flex gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">The right moves</span>
        <Clock /> · {speed}x
      </p>
      <FightTimeline />
    </div>
  );
}

/** The fight time, moved on every frame. */
function Clock() {
  const text = useRef<HTMLSpanElement>(null);
  useFightFrame((s) => {
    const t = clock(s.t);
    if (text.current && text.current.textContent !== t) text.current.textContent = t;
  });
  return <span ref={text} className="tabular-nums" />;
}

interface MechanicProps {
  view: FightView;
  fight: Fight;
  g: FightSeg;
  onGoTo: (g: FightSeg) => void;
  onSpawns: () => void;
}

/** The mechanic on the arena: its setup, its steps, the step asked and the last answer. */
function Mechanic({ view: v, fight, g, onGoTo, onSpawns }: MechanicProps) {
  const res = v.results;
  const j = res.length;
  const n = g.due.length;
  const done = j >= n;
  const nx = nextSeg(fight, v.si);
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl tracking-wide">{g.title}</h2>
      {g.scene.setup && <SetupText key={v.si} text={g.scene.setup} folded={j > 0} />}
      {n > 1 && <StepChips count={n} results={res} />}
      {!done && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">
            Step {j + 1} of {n}
            {!v.paused && (
              <>
                {" "}
                · hits in <DueIn />
              </>
            )}
          </p>
          <p className="font-medium">{g.scene.steps[j].q}</p>
        </div>
      )}
      {j > 0 && <LastAnswer ok={res[j - 1].ok} question={g.scene.steps[j - 1].q} answer={g.scene.steps[j - 1].a} />}
      {done ? (
        <>
          {g.scene.rule && <RuleBox rule={g.scene.rule} />}
          <div className="flex flex-wrap items-center gap-3">
            {nx && <Button onClick={() => onGoTo(nx)}>Next: {nx.title}</Button>}
            <Button variant="outline" onClick={() => onGoTo(g)}>
              Watch it again
            </Button>
            {nx && v.paused && (
              <span className="text-sm text-muted-foreground pointer-coarse:hidden">
                <Kbd>Enter</Kbd> next
              </span>
            )}
          </div>
        </>
      ) : (
        g.scene.spawnPlay && (
          <Button variant="outline" onClick={onSpawns}>
            Watch the spawns again
          </Button>
        )
      )}
    </div>
  );
}

/** The seconds to the hit of the step asked, moved on every frame. */
function DueIn() {
  const text = useRef<HTMLElement>(null);
  useFightFrame((s) => {
    const si = activeSeg(s.fight, s.t);
    const g = si >= 0 ? s.fight.segs[si] : null;
    const j = si >= 0 ? s.results[si].length : 0;
    const t = g && j < g.due.length ? `${Math.max(0, g.due[j] - s.t).toFixed(1)} s` : "";
    if (text.current && text.current.textContent !== t) text.current.textContent = t;
  });
  return <b ref={text} className="tabular-nums" />;
}

interface BetweenProps {
  paused: boolean;
  fight: Fight;
  onGoTo: (g: FightSeg) => void;
}

/** Between mechanics: the next mechanic, with a button to go there, and the next ability. */
function Between({ paused, fight, onGoTo }: BetweenProps) {
  // Both change as the clock runs, so a frame function keeps them current.
  const [next, setNext] = useState<{ seg: number; ability: number }>({ seg: -1, ability: -1 });
  useFightFrame((s) => {
    const nx = upcoming(s.fight, s.t);
    const seg = nx ? s.fight.segs.indexOf(nx) : -1;
    const ability = ABILITIES.findIndex((x) => x.t >= s.t);
    setNext((was) => (was.seg === seg && was.ability === ability ? was : { seg, ability }));
  });
  const nx = next.seg >= 0 ? fight.segs[next.seg] : null;
  const a = next.ability >= 0 ? ABILITIES[next.ability] : null;
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl tracking-wide">Between mechanics</h2>
      {nx && (
        <>
          <p className="text-sm">
            Next mechanic: {nx.title} at {clock(nx.from)}.
          </p>
          <Button onClick={() => onGoTo(nx)}>Go to {nx.title}</Button>
        </>
      )}
      {a && (
        <div className="space-y-1 rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Next ability · {clock(a.t)}</p>
          <p className="font-semibold">{a.name}</p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <CategoryDots cats={a.cats} size="md" />
            {categoryNames(a.cats)}
          </p>
          <p>{a.note}</p>
        </div>
      )}
      {paused && <p className="text-sm text-muted-foreground">Paused. Press Play to run the fight clock.</p>}
    </div>
  );
}
