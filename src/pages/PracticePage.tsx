// The Practice page (/practice/<mechanic>/<code>): one mechanic at a time, with no timer. Click where you
// stand, and the arena shows the correct area. The code names the mechanic's pattern, so a link opens
// the same one. The screen has the layout of Pressure's player, and its list of mechanics
// opens another one.
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { PageContainer } from "../components/PageContainer";
import { DrillScreen } from "../components/practice/DrillScreen";
import { RoundDone } from "../components/RoundDone";
import { useFight, useFightLink } from "../hooks/useFight";
import { buildPattern, changes } from "../lib/practice";
import { roundOf, useProgressStore } from "../stores/progress";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import { isCode, newCode } from "../util";

export function PracticePage() {
  const { drill, code } = useParams();
  const navigate = useNavigate();
  const slot = useSlotStore((s) => s.slot);
  const { id: fight, drills } = useFight();
  const link = useFightLink();
  /** The mechanics, in fight order. */
  const inOrder = useMemo(() => [...drills].sort((a, b) => a.order - b.order), [drills]);
  /** The address of a mechanic with a new pattern. For clicks only: drawing must not make random
      codes, so a redirect uses the code the page made once (see `fresh`). */
  const withNewCode = (id: string): string => link(`/practice/${id}/${newCode()}`);
  const round = useProgressStore((s) => roundOf(s, fight, "practice"));
  const record = useProgressStore((s) => s.record);
  const visit = useProgressStore((s) => s.visit);
  const finish = useProgressStore((s) => s.finish);
  const newRound = useProgressStore((s) => s.newRound);
  /** Counts Reset and Watch the spawns again: each one starts the same pattern fresh. */
  const [tries, setTries] = useState(0);
  /** A new code for a redirect, made once when the page opens, so every draw sends to the same one. */
  // TS note: useState(newCode) passes the function itself, so React calls it once, on the first draw.
  const [fresh] = useState(newCode);

  const i = inOrder.findIndex((m) => m.id === drill);
  const item = i >= 0 ? inOrder[i] : undefined;
  const okCode = code !== undefined && isCode(code) ? code.toUpperCase() : undefined;
  // Building a pattern runs the mechanic's own code, so it is kept until the mechanic, the code or
  // the slot changes.
  const pattern = useMemo(() => (item && okCode ? buildPattern(item, slot, okCode) : undefined), [item, okCode, slot]);

  // Remember the mechanic, so the tab opens on it again.
  useEffect(() => {
    if (item) visit(fight, "practice", item.id);
  }, [item, fight, visit]);

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
                newRound(fight, "practice");
                navigate(withNewCode(inOrder[0].id));
              }}
            />
          </PageContainer>
        </main>
      );
    }
    return <Navigate to={link(`/practice/${round.current ?? inOrder[0].id}/${fresh}`)} replace />;
  }
  // A mechanic that does not exist: start from the first. A mechanic with no code (or a broken
  // one): give it a new pattern, so the address always names the pattern on screen.
  if (!item) return <Navigate to={link(`/practice/${inOrder[0].id}/${fresh}`)} replace />;
  if (!okCode || !pattern) return <Navigate to={link(`/practice/${item.id}/${fresh}`)} replace />;
  if (okCode !== code) return <Navigate to={link(`/practice/${item.id}/${okCode}`)} replace />;

  function goNext(): void {
    if (i < inOrder.length - 1) navigate(withNewCode(inOrder[i + 1].id));
    else {
      finish(fight, "practice");
      navigate(link("/practice"));
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
          count={inOrder.length}
          canChange={changes(item)}
          onScore={(ok) => record(fight, item.id, ok, "practice", slot)}
          onNextMechanic={goNext}
          onReset={() => setTries((t) => t + 1)}
          onNewPattern={() => navigate(withNewCode(item.id))}
          onReplaySpawns={() => setTries((t) => t + 1)}
          onPick={(id) => navigate(withNewCode(id))}
        />
      </PageContainer>
    </main>
  );
}
