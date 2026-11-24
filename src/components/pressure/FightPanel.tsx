import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useFight } from "../../hooks/useFight";
import { useFightFrame } from "../../hooks/useFightFrame";
import { activeSeg, type FightView, nextSeg, upcoming, watchQuestion } from "../../lib/fight";
import { clock } from "../../time";
import type { Fight, FightSeg } from "../../types";
import { CategoryIcons, categoryNames } from "../CategoryIcons";
import { LastAnswer } from "../LastAnswer";
import { LineList } from "../LineList";
import { RuleBox } from "../RuleBox";
import { SetupText } from "../SetupText";
import { StepChips } from "../StepChips";

export interface FightPanelProps {
  view: FightView;
  fight: Fight;
  /** Go to a Mechanic. */
  onGoTo: (g: FightSeg) => void;
  /** Go to step j of a mechanic, paused. */
  onGoToStep: (g: FightSeg, j: number) => void;
  /** Watch the spawns of the mechanic again. */
  onSpawns: () => void;
}

/** The mechanic on the arena, in the player. Its setup shows in full, the steps show as
    chips, and at the end the rule shows with the way on to the next mechanic. Between mechanics:
    the next mechanic and the next ability. */
export function FightPanel({ view: v, fight, onGoTo, onGoToStep, onSpawns }: FightPanelProps) {
  const g = v.si >= 0 ? fight.segs[v.si] : null;
  return (
    <section aria-label="The correct moves">
      {g ? (
        <Mechanic view={v} fight={fight} g={g} onGoTo={onGoTo} onGoToStep={onGoToStep} onSpawns={onSpawns} />
      ) : (
        <Between paused={v.paused} fight={fight} onGoTo={onGoTo} />
      )}
    </section>
  );
}

interface MechanicProps {
  view: FightView;
  fight: Fight;
  g: FightSeg;
  onGoTo: (g: FightSeg) => void;
  /** Go to step j of a mechanic, paused. */
  onGoToStep: (g: FightSeg, j: number) => void;
  onSpawns: () => void;
}

/** The mechanic on the arena: its setup, its steps, the step asked and the last answer. */
function Mechanic({ view: v, fight, g, onGoTo, onGoToStep, onSpawns }: MechanicProps) {
  const res = v.results;
  const j = res.length;
  const n = g.due.length;
  const done = j >= n;
  const nx = nextSeg(fight, v.si);
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl tracking-wide">{g.title}</h2>
      {g.scene.setup.length > 0 && <SetupText lines={g.scene.setup} ordered={g.scene.ordered} />}
      {/* The player tests nothing, so its chips always go to a step. */}
      {n > 1 && <StepChips count={n} results={res} at={done ? undefined : j} onPick={(i) => onGoToStep(g, i)} />}
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
          <p className="font-medium">{watchQuestion(g.scene.steps[j].q)}</p>
          {/* The player shows the correct move with its question; your marker walks there. */}
          <p className="mt-1.5 font-semibold text-success-foreground">Correct move:</p>
          <LineList lines={g.scene.steps[j].a} />
        </div>
      )}
      {j > 0 && <LastAnswer ok={res[j - 1].ok} answer={g.scene.steps[j - 1].a} />}
      {done ? (
        <>
          {g.scene.rule.length > 0 && <RuleBox rule={g.scene.rule} />}
          <div className="flex flex-wrap items-center gap-3">
            {nx && (
              // A mechanic's name can be longer than the column: the button wraps, which shadcn's does not.
              <Button className="h-auto min-h-9 py-2 text-left whitespace-normal" onClick={() => onGoTo(nx)}>
                Next: {nx.title}
              </Button>
            )}
            <Button variant="outline" onClick={() => onGoTo(g)}>
              Watch It Again
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
            Watch the Spawns Again
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
  const { abilities } = useFight();
  useFightFrame((s) => {
    const nx = upcoming(s.fight, s.t);
    const seg = nx ? s.fight.segs.indexOf(nx) : -1;
    const ability = abilities.findIndex((x) => x.t >= s.t);
    setNext((was) => (was.seg === seg && was.ability === ability ? was : { seg, ability }));
  });
  const nx = next.seg >= 0 ? fight.segs[next.seg] : null;
  const a = next.ability >= 0 ? abilities[next.ability] : null;
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl tracking-wide">Between mechanics</h2>
      {nx && (
        <>
          <p className="text-sm">
            Next mechanic: {nx.title} at {clock(nx.from)}.
          </p>
          {/* The line above names the mechanic, so the button stays short. */}
          <Button onClick={() => onGoTo(nx)}>Jump to Next Mechanic</Button>
        </>
      )}
      {a && (
        <div className="space-y-1 rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Next ability · {clock(a.t)}</p>
          <p className="font-semibold">{a.name}</p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <CategoryIcons cats={a.cats} />
            {categoryNames(a.cats)}
          </p>
          <p>{a.note}</p>
        </div>
      )}
      {paused && <p className="text-sm text-muted-foreground">Paused. Press Play to run the fight clock.</p>}
    </div>
  );
}
