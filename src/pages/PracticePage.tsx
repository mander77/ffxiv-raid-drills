// The Practice page (/map/<mechanic>/<code>): one mechanic at a time, with no timer. Click where you
// stand, and the arena shows the right area. The code names the mechanic's pattern, so a link opens
// the same one. On a wide screen the list of mechanics sits beside the arena; on a narrow screen,
// Back, Next and phase chips take its place.
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { PageContainer } from "../components/PageContainer";
import { MechanicList } from "../components/practice/MechanicList";
import { MechanicNav } from "../components/practice/MechanicNav";
import { PracticeDrill } from "../components/practice/PracticeDrill";
import { RoundDone } from "../components/RoundDone";
import { changes, MAPS } from "../data/drills";
import { buildPattern } from "../lib/practice";
import { useProgressStore } from "../stores/progress";
import { useSlotStore } from "../stores/slot";
import { tabOf } from "../tabs";
import { isCode, newCode } from "../util";

/** The mechanics, in fight order. */
const DRILLS = [...MAPS].sort((a, b) => a.order - b.order);

/** The address of a mechanic with a new pattern. For clicks only: drawing must not make random
    codes, so a redirect uses the code the page made once (see `fresh`). */
const withNewCode = (id: string): string => `/map/${id}/${newCode()}`;

export function PracticePage() {
  const { drill, code } = useParams();
  const navigate = useNavigate();
  const slot = useSlotStore((s) => s.slot);
  const round = useProgressStore((s) => s.rounds.map);
  const record = useProgressStore((s) => s.record);
  const visit = useProgressStore((s) => s.visit);
  const finish = useProgressStore((s) => s.finish);
  const newRound = useProgressStore((s) => s.newRound);
  /** Counts Again and Watch the spawns again: each one starts the same pattern fresh. */
  const [tries, setTries] = useState(0);
  /** A new code for a redirect, made once when the page opens, so every draw sends to the same one. */
  // TS note: useState(newCode) passes the function itself, so React calls it once, on the first draw.
  const [fresh] = useState(newCode);

  const i = DRILLS.findIndex((m) => m.id === drill);
  const item = i >= 0 ? DRILLS[i] : undefined;
  const okCode = code !== undefined && isCode(code) ? code.toUpperCase() : undefined;
  // Building a pattern runs the mechanic's own code, so it is kept until the mechanic, the code or
  // the slot changes.
  const pattern = useMemo(() => (item && okCode ? buildPattern(item, slot, okCode) : undefined), [item, okCode, slot]);

  // Remember the mechanic, so the tab opens on it again.
  useEffect(() => {
    if (item) visit("map", item.id);
  }, [item, visit]);

  const lede = <p className="text-muted-foreground">{tabOf("/map")?.lede}</p>;

  // /map with no mechanic: the round is done, or it opens on the mechanic you were on, or the first.
  if (drill === undefined) {
    if (round.finished) {
      const mine = round.slot === slot;
      return (
        <main>
          <PageContainer className="space-y-6 py-6">
            {lede}
            <RoundDone
              right={mine ? round.right : 0}
              done={mine ? round.done : 0}
              onAgain={() => {
                newRound("map");
                navigate(withNewCode(DRILLS[0].id));
              }}
            />
          </PageContainer>
        </main>
      );
    }
    return <Navigate to={`/map/${round.card ?? DRILLS[0].id}/${fresh}`} replace />;
  }
  // A mechanic that does not exist: start from the first. A mechanic with no code (or a broken
  // one): give it a new pattern, so the address always names the pattern on screen.
  if (!item) return <Navigate to={`/map/${DRILLS[0].id}/${fresh}`} replace />;
  if (!okCode || !pattern) return <Navigate to={`/map/${item.id}/${fresh}`} replace />;
  if (okCode !== code) return <Navigate to={`/map/${item.id}/${okCode}`} replace />;

  function goNext(): void {
    if (i < DRILLS.length - 1) navigate(withNewCode(DRILLS[i + 1].id));
    else {
      finish("map");
      navigate("/map");
    }
  }

  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        {lede}
        <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <MechanicList items={DRILLS} current={item.id} className="max-lg:hidden" />
          <div className="space-y-4">
            <MechanicNav items={DRILLS} i={i} className="lg:hidden" />
            <PracticeDrill
              key={`${item.id}-${okCode}-${slot}-${tries}`}
              item={item}
              pattern={pattern}
              i={i}
              count={DRILLS.length}
              canChange={changes(item)}
              onScore={(ok) => record(item.id, ok, "map", slot)}
              onNextMechanic={goNext}
              onAgain={() => setTries((t) => t + 1)}
              onNewPattern={() => navigate(withNewCode(item.id))}
              onReplaySpawns={() => setTries((t) => t + 1)}
            />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
