import type { ReactNode } from "react";
import { PUDDLE_R } from "../../data/attacks";
import { f1, rotOverlay, rotZone, stepZone } from "../../geometry";
import { bossFor } from "../../lib/practice";
import { cn } from "../../lib/utils";
import type { Overlay, Point, Scene, StepResult } from "../../types";
import { Arena, pieceLayers } from "./Arena";
import { hitsFirst, Shape } from "./Shape";
import { TurningBoss } from "./TurningBoss";
import { ZoneLabel } from "./ZoneLabel";
import { ZoneMark } from "./ZoneMark";

export interface PracticeArenaProps {
  scene: Scene;
  /** How many quarter turns the arena is turned. */
  k: number;
  results: readonly StepResult[];
  /** Show the last answer on the floor: its area, its label and your click. */
  showLast: boolean;
  /** Show me: the right area for the step asked, in blue with "Go here". */
  hint: boolean;
  /** Called with the spot you click, in arena units. Leave it out when the arena takes no clicks. */
  onPointClick?: (p: Point) => void;
  className?: string;
}

/** The arena of a Practice mechanic: its pattern, your answers, the puddles you dropped and the
    boss. Each weapon is its own group, so it fades once it has resolved, and in a mechanic that
    shows its spawns, the weapons appear one at a time. */
export function PracticeArena({ scene: sc, k, results, showLast, hint, onPointClick, className }: PracticeArenaProps) {
  const n = results.length;
  const done = n >= sc.steps.length;
  const asking = showLast ? n - 1 : n;

  // The scene's own pieces: the weapons with a spawn index each get their own group.
  const groups: Overlay[][] = [];
  for (const o of sc.overlays) {
    if (o.spawn == null) continue;
    groups[o.spawn] ??= [];
    groups[o.spawn].push(o);
  }
  const base = pieceLayers(sc.overlays.filter((o) => o.spawn == null).map((o) => rotOverlay(o, k)));
  // Weapons that resolved fade; the one just answered stays until the next step. With
  // spawnAhead, each answered step brings in one more weapon.
  const gone = showLast ? n - 1 : n;
  const visible = sc.spawnAhead != null ? sc.spawnAhead + n : Number.POSITIVE_INFINITY;
  const weapons = groups.map((g, i) => {
    const pos = g.find((o) => o.t === "scythe" || o.t === "axe" || o.t === "sword");
    return (
      <g
        // biome-ignore lint/suspicious/noArrayIndexKey: a weapon's spawn index is its identity.
        key={i}
        className={cn("spawn", i < gone && "gone", i >= visible && "later")}
        style={sc.spawnPlay ? { animationDelay: `${0.3 + i}s` } : undefined}
      >
        {g.map((o, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of a weapon never change order.
          <Shape key={j} o={rotOverlay(o, k)} />
        ))}
        {sc.spawnPlay && pos && "x" in pos && (
          <text className="ord" x={f1(pos.x + 4.5)} y={f1(pos.y + 4.5)}>
            {i + 1}
          </text>
        )}
      </g>
    );
  });

  // What the last answer revealed (the attack) goes under the weapons, so their icons stay sharp.
  const last = showLast ? results[n - 1] : undefined;
  const lastStep = last ? sc.steps[n - 1] : undefined;
  const reveal = lastStep?.reveal ? hitsFirst(lastStep.reveal.map((o) => rotOverlay(o, k))) : [];

  // The puddles dropped before the last step with clearDrops (up to the one asked) are gone. A
  // puddle goes off two steps after it drops: it fades out then.
  const kept = sc.steps.slice(0, asking + 1).reduce((from, st, i) => (st.clearDrops ? i : from), 0);
  const drops: ReactNode[] = [];
  results.forEach((r, i) => {
    if (r.drop && i >= kept)
      drops.push(
        // biome-ignore lint/suspicious/noArrayIndexKey: a puddle belongs to its step, which never moves.
        <circle key={`drop-${i}`} className={cn("drop", i <= n - 2 && "fading")} cx={f1(r.drop[0])} cy={f1(r.drop[1])} r={PUDDLE_R} />,
      );
    const leave = sc.steps[i].leave;
    if (leave)
      drops.push(
        // biome-ignore lint/suspicious/noArrayIndexKey: a piece left behind belongs to its step, which never moves.
        <Shape key={`leave-${i}`} o={leave} />,
      );
  });
  // Cues show with their step's question and stay. Player marks in a cue go in the marks layer.
  const cues = sc.steps
    .slice(0, asking + 1)
    .flatMap((st) => st.cue ?? [])
    .map((o) => rotOverlay(o, k));

  // Show me: the right area of the step asked.
  const hintStep = hint ? sc.steps[n] : undefined;
  const hintBase = hintStep ? stepZone(hintStep, [...results]) : undefined;
  const hintZone = hintBase ? rotZone(hintBase, k) : undefined;

  const boss = bossFor(sc, k, n, showLast);
  const shapes = (os: readonly Overlay[]): ReactNode =>
    // biome-ignore lint/suspicious/noArrayIndexKey: these pieces never change order.
    os.map((o, i) => <Shape key={i} o={o} />);

  return (
    <Arena
      label={done ? "Arena map. The mechanic is done." : "Arena map. Click to choose a spot."}
      split={sc.split}
      className={cn("live", done && "locked", sc.spawnPlay && "play", className)}
      onPointClick={done ? undefined : onPointClick}
      layers={{
        ground: (
          <>
            {shapes(reveal)}
            {base.ground}
            {weapons}
          </>
        ),
        drops: (
          <>
            {drops}
            {shapes(cues.filter((o) => o.t !== "mark"))}
          </>
        ),
        zones: (
          <>
            {last && lastStep && <ZoneMark z={last.z} cls={lastStep.look ? "later" : last.ok ? "ok" : "bad"} />}
            {hintZone && hintStep && <ZoneMark z={hintZone} cls={hintStep.look ? "later" : "pick"} />}
          </>
        ),
        boss: boss && <TurningBoss boss={boss} />,
        labels: (
          <>
            {base.labels}
            {last && lastStep && <ZoneLabel zone={last.z} kind={lastStep.look ? "later" : "right"} />}
            {hintZone && hintStep && <ZoneLabel zone={hintZone} kind={hintStep.look ? "later" : "go"} />}
          </>
        ),
        marks: (
          <>
            {base.marks}
            {shapes(cues.filter((o) => o.t === "mark"))}
          </>
        ),
        me: last && !last.missed && (
          <g className={cn("pick", last.ok ? "ok" : "bad")} transform={`translate(${f1(last.p[0])} ${f1(last.p[1])})`}>
            <circle className="halo" r="2.6" />
            <circle className="dot" r="1.1" />
          </g>
        ),
      }}
    />
  );
}
