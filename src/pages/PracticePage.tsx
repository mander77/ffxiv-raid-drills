// The Practice page (/practice/<mechanic>/<code>): one mechanic at a time, with no timer. Click where you
// stand, and the arena shows the correct area. The code names the mechanic's pattern, so a link opens
// the same one. The screen has the layout of Pressure's player, and its fight line (Practice
// mechanics only) opens another mechanic.
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { PageContainer } from "../components/PageContainer";
import { DrillScreen } from "../components/practice/DrillScreen";
import { RoundDone } from "../components/RoundDone";
import { changes, DRILLS } from "../data/drills";
import { buildPattern } from "../lib/practice";
import { useProgressStore } from "../stores/progress";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import { isCode, newCode } from "../util";

/** The mechanics, in fight order. */
const IN_ORDER = [...DRILLS].sort((a, b) => a.order - b.order);

/** The address of a mechanic with a new pattern. For clicks only: drawing must not make random
    codes, so a redirect uses the code the page made once (see `fresh`). */
const withNewCode = (id: string): string => `/practice/${id}/${newCode()}`;

export function PracticePage() {
  const { drill, code } = useParams();
  const navigate = useNavigate();
  const slot = useSlotStore((s) => s.slot);
  const round = useProgressStore((s) => s.rounds.practice);
  const record = useProgressStore((s) => s.record);
  const visit = useProgressStore((s) => s.visit);
  const finish = useProgressStore((s) => s.finish);
  const newRound = useProgressStore((s) => s.newRound);
  /** Counts Again and Watch the spawns again: each one starts the same pattern fresh. */
  const [tries, setTries] = useState(0);
  /** A new code for a redirect, made once when the page opens, so every draw sends to the same one. */
  // TS note: useState(newCode) passes the function itself, so React calls it once, on the first draw.
  const [fresh] = useState(newCode);

  const i = IN_ORDER.findIndex((m) => m.id === drill);
  const item = i >= 0 ? IN_ORDER[i] : undefined;
  const okCode = code !== undefined && isCode(code) ? code.toUpperCase() : undefined;
  // Building a pattern runs the mechanic's own code, so it is kept until the mechanic, the code or
  // the slot changes.
  const pattern = useMemo(() => (item && okCode ? buildPattern(item, slot, okCode) : undefined), [item, okCode, slot]);

  // Remember the mechanic, so the tab opens on it again.
  useEffect(() => {
    if (item) visit("practice", item.id);
  }, [item, visit]);

  const lede = <p className="text-muted-foreground">{tabOf("/practice")?.lede}</p>;

  // /practice with no mechanic: the round is done, or it opens on the mechanic you were on, or the first.
  if (drill === undefined) {
    if (round.finished) {
      const mine = round.slot === slot;
      return (
        <main>
          <PageContainer className="space-y-6 py-6">
            {lede}
            <RoundDone
              correct={mine ? round.correct : 0}
              done={mine ? round.done : 0}
              onAgain={() => {
                newRound("practice");
                navigate(withNewCode(IN_ORDER[0].id));
              }}
            />
          </PageContainer>
        </main>
      );
    }
    return <Navigate to={`/practice/${round.current ?? IN_ORDER[0].id}/${fresh}`} replace />;
  }
  // A mechanic that does not exist: start from the first. A mechanic with no code (or a broken
  // one): give it a new pattern, so the address always names the pattern on screen.
  if (!item) return <Navigate to={`/practice/${IN_ORDER[0].id}/${fresh}`} replace />;
  if (!okCode || !pattern) return <Navigate to={`/practice/${item.id}/${fresh}`} replace />;
  if (okCode !== code) return <Navigate to={`/practice/${item.id}/${okCode}`} replace />;

  function goNext(): void {
    if (i < IN_ORDER.length - 1) navigate(withNewCode(IN_ORDER[i + 1].id));
    else {
      finish("practice");
      navigate("/practice");
    }
  }

  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        {lede}
        <DrillScreen
          tryKey={`${item.id}-${okCode}-${slot}-${tries}`}
          item={item}
          pattern={pattern}
          i={i}
          count={IN_ORDER.length}
          canChange={changes(item)}
          onScore={(ok) => record(item.id, ok, "practice", slot)}
          onNextMechanic={goNext}
          onAgain={() => setTries((t) => t + 1)}
          onNewPattern={() => navigate(withNewCode(item.id))}
          onReplaySpawns={() => setTries((t) => t + 1)}
          onPick={(id) => navigate(withNewCode(id))}
        />
      </PageContainer>
    </main>
  );
}
