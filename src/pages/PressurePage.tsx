// The Pressure page (/pressure): the same questions, fast. A quick round of timed questions, or
// the full fight on the clock: the run, where you click your spots, and Watch the right moves,
// the player. A link to the player holds its fight: /pressure/<code>[/<picks>][?t=<seconds>].
import { type ReactNode, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { PageContainer } from "../components/PageContainer";
import { FightScreen } from "../components/pressure/FightScreen";
import { FightSettings } from "../components/pressure/FightSettings";
import { PressureStart } from "../components/pressure/PressureStart";
import { QuickRound } from "../components/pressure/QuickRound";
import { RunScore } from "../components/pressure/RunScore";
import { WatchDone } from "../components/pressure/WatchDone";
import { buildFight, type Choices, type Fight, parseChoices, RANDOM } from "../data/fight";
import { playerLink } from "../lib/pressure";
import { usePressureStore } from "../stores/pressure";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import type { StepResult } from "../types";
import { isCode, newCode } from "../util";

/** What the page shows at /pressure. The player has its own address, so it is not one of these. */
// TS note: a union of object types with a `kind` field is a discriminated union. After a check
// such as `screen.kind === "run"`, TypeScript knows that `screen.code` exists.
type Screen =
  | { kind: "start" }
  | { kind: "quick" }
  | { kind: "run"; code: string; choices: Choices; n: number }
  | { kind: "score"; fight: Fight; results: StepResult[][]; stopped: boolean };

export function PressurePage() {
  const { code, picks } = useParams();
  const navigate = useNavigate();
  const slot = useSlotStore((s) => s.slot);
  const choices = usePressureStore((s) => s.choices);
  const stops = usePressureStore((s) => s.stops);
  const [screen, setScreen] = useState<Screen>({ kind: "start" });

  function startRun(c: string, ch: Choices): void {
    setScreen((was) => ({ kind: "run", code: c, choices: ch, n: was.kind === "run" ? was.n + 1 : 0 }));
    navigate("/pressure");
  }
  function watch(c: string, ch: Choices): void {
    navigate(playerLink(c, ch));
  }

  let body: ReactNode;
  if (code !== undefined) {
    // A link to a fight that is not a code opens the start screen.
    if (!isCode(code)) return <Navigate to="/pressure" replace />;
    body = <Player key={code.toUpperCase()} code={code.toUpperCase()} picks={picks} onRun={startRun} />;
  } else if (screen.kind === "quick") body = <QuickRound onBack={() => setScreen({ kind: "start" })} />;
  else if (screen.kind === "run") body = <Run key={`${screen.n}-${slot}`} screen={screen} stops={stops} onEnd={setScreen} />;
  else if (screen.kind === "score")
    body = (
      <RunScore
        fight={screen.fight}
        results={screen.results}
        stopped={screen.stopped}
        onAgain={() => startRun(newCode(), choices)}
        // The same fight, so you see the right moves for the patterns you just had.
        onWatch={() => watch(screen.fight.code, screen.fight.choices)}
      />
    );
  else
    body = (
      <PressureStart
        onQuick={() => setScreen({ kind: "quick" })}
        onRun={() => startRun(newCode(), choices)}
        // A new fight with your saved picks.
        onWatch={() => watch(newCode(), choices)}
      />
    );

  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/pressure")?.lede}</p>
        {body}
      </PageContainer>
    </main>
  );
}

interface RunProps {
  screen: Extract<Screen, { kind: "run" }>;
  stops: boolean;
  onEnd: (next: Screen) => void;
}

/** The run: every mechanic in fight order at real speed. Click your spot before each hit lands. */
function Run({ screen, stops, onEnd }: RunProps) {
  const slot = useSlotStore((s) => s.slot);
  const fight = useMemo(() => buildFight(slot, screen.code, screen.choices), [slot, screen.code, screen.choices]);
  return (
    <FightScreen
      mode="run"
      fight={fight}
      slot={slot}
      stops={stops}
      onDone={(s) => onEnd({ kind: "score", fight, results: s.results.map((r) => [...r]), stopped: false })}
      // Quit: your score so far, or the start screen when you answered nothing.
      onQuit={(s) =>
        onEnd(
          s.results.some((r) => r.length)
            ? { kind: "score", fight, results: s.results.map((r) => [...r]), stopped: true }
            : { kind: "start" },
        )
      }
    />
  );
}

interface PlayerProps {
  code: string;
  /** The picks part of the address, such as "raw=axe,ult=cw". */
  picks: string | undefined;
  /** Run this fight. */
  onRun: (code: string, choices: Choices) => void;
}

/** Watch the right moves: the player for the fight in the address. New picks or another slot (H1
    or H2) build the same fight again, with its own spots, at the same moment. The address follows
    the player: paused, it holds the moment, so a copied link opens the same place. */
function Player({ code, picks, onRun }: PlayerProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const slot = useSlotStore((s) => s.slot);
  const speed = usePressureStore((s) => s.speed);
  const setSpeed = usePressureStore((s) => s.setSpeed);
  const setChoices = usePressureStore((s) => s.setChoices);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [done, setDone] = useState(false);
  const linkChoices = useMemo(() => (picks ? parseChoices(picks) : RANDOM), [picks]);
  const fight = useMemo(() => buildFight(slot, code, linkChoices), [slot, code, linkChoices]);
  const t = Number(params.get("t"));
  const startAt = Number.isFinite(t) && t > 0 ? Math.min(t, fight.end) : undefined;

  /** The same fight with new picks: the player builds it again at the same moment. They become
      your saved picks too. */
  function changePicks(next: Choices): void {
    setChoices(next);
    navigate({ pathname: playerLink(code, next), search: params.toString() }, { replace: true });
  }

  if (done)
    return (
      <WatchDone
        summary={fight.summary}
        onRun={() => onRun(code, linkChoices)}
        onWatch={() => {
          setDone(false);
          navigate(playerLink(code, linkChoices), { replace: true });
        }}
      />
    );
  return (
    <FightScreen
      mode="watch"
      fight={fight}
      slot={slot}
      startAt={startAt}
      speed={speed}
      onSpeed={setSpeed}
      settingsOpen={settingsOpen}
      onSettings={() => setSettingsOpen((o) => !o)}
      onDone={() => setDone(true)}
      onPause={(at) => setParams(at === null ? {} : { t: String(Math.round(at * 10) / 10) }, { replace: true })}
      onNewFight={(at) => navigate(playerLink(newCode(), linkChoices, at))}
      side={
        settingsOpen && <FightSettings code={code} choices={linkChoices} onChange={changePicks} onDone={() => setSettingsOpen(false)} />
      }
    />
  );
}
