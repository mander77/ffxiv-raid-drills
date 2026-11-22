import type { ReactNode } from "react";
import { PUDDLE_R } from "../../data/attacks";
import { rotOverlay, rotZone, round2, stepZone } from "../../geometry";
import { bossFor } from "../../lib/practice";
import { cn } from "../../lib/utils";
import type { Boss, Overlay, Point, Scene, StepResult, Zone } from "../../types";
import { Arena, pieceLayers } from "./Arena";
import { hitsFirst, Shape } from "./Shape";
import { TurningBoss } from "./TurningBoss";
import { ZoneArea } from "./ZoneArea";
import { ZoneLabel } from "./ZoneLabel";

/** How far below a weapon's foot its order number goes, under its name. The app's choice. */
const ORD_BELOW = 10;

export interface LiveArenaProps {
  scene: Scene;
  /** How many quarter turns the arena is turned. */
  k: number;
  results: readonly StepResult[];
  /** Show the last answer on the floor: its area, its label and your click. */
  showLast: boolean;
  /** Show me: the correct area for the step asked, in blue with "Go here". */
  hint: boolean;
  /** Called with the spot you click, in arena units. Leave it out when the arena takes no clicks. */
  onPointClick?: (p: Point) => void;
  className?: string;
  /* The full fight sets the props below. */
  /** The boss, when the fight clock places him. Left out, he follows the answers. */
  boss?: Boss | null;
  /** Whether the puddle of step i has gone off, so it fades. Left out, a puddle fades two steps
      after it drops. */
  wentOff?: (i: number) => boolean;
  /** Label the last correct answer "Correct spot". Watch the correct moves leaves it out: your marker
      walks into each spot. */
  correctLabel?: boolean;
  /** The correct area of your marker's next spot, in blue (Watch the correct moves). */
  target?: Zone | null;
  /** What the fight draws over the arena: the flash of a hit, the countdown ring, a tank buster. */
  effects?: ReactNode;
  /** Your moving marker, on top of everything. */
  runner?: ReactNode;
}

/** The arena of a Practice mechanic: its pattern, your answers, the puddles you dropped and the
    boss. Each weapon is its own group, so it fades once it has resolved, and in a mechanic that
    shows its spawns, the weapons appear one at a time. */
export function LiveArena({
  scene: sc,
  k,
  results,
  showLast,
  hint,
  onPointClick,
  className,
  boss: placed,
  wentOff,
  correctLabel = true,
  target,
  effects,
  runner,
}: LiveArenaProps) {
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
          <Shape key={j} overlay={rotOverlay(o, k)} />
        ))}
        {sc.spawnPlay && pos && "x" in pos && (
          <text className="ord" x={round2(pos.x)} y={round2(pos.y + ORD_BELOW)}>
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
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: a puddle belongs to its step, which never moves.
          key={`drop-${i}`}
          className={cn("drop", (wentOff ? wentOff(i) : i <= n - 2) && "fading")}
          cx={round2(r.drop[0])}
          cy={round2(r.drop[1])}
          r={PUDDLE_R}
        />,
      );
    const leave = sc.steps[i].leave;
    if (leave)
      drops.push(
        // biome-ignore lint/suspicious/noArrayIndexKey: a piece left behind belongs to its step, which never moves.
        <Shape key={`leave-${i}`} overlay={leave} />,
      );
  });
  // Cues show with their step's question and stay. Player marks in a cue go in the marks layer.
  const cues = sc.steps
    .slice(0, asking + 1)
    .flatMap((st) => st.cue ?? [])
    .map((o) => rotOverlay(o, k));

  // Show me: the correct area of the step asked.
  const hintStep = hint ? sc.steps[n] : undefined;
  const hintBase = hintStep ? stepZone(hintStep, [...results]) : undefined;
  const hintZone = hintBase ? rotZone(hintBase, k) : undefined;

  const boss = placed === undefined ? bossFor(sc, k, n, showLast) : placed;
  const shapes = (os: readonly Overlay[]): ReactNode =>
    // biome-ignore lint/suspicious/noArrayIndexKey: these pieces never change order.
    os.map((o, i) => <Shape key={i} overlay={o} />);

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
            {last && lastStep && <ZoneArea zone={last.z} look={lastStep.lookAhead ? "later" : last.ok ? "ok" : "bad"} />}
            {hintZone && hintStep && <ZoneArea zone={hintZone} look={hintStep.lookAhead ? "later" : "pick"} />}
            {target && <ZoneArea zone={target} look="pick" />}
          </>
        ),
        boss: boss && <TurningBoss boss={boss} />,
        labels: (
          <>
            {base.labels}
            {last && lastStep && (lastStep.lookAhead || correctLabel) && (
              <ZoneLabel zone={last.z} kind={lastStep.lookAhead ? "later" : "correct"} />
            )}
            {hintZone && hintStep && <ZoneLabel zone={hintZone} kind={hintStep.lookAhead ? "later" : "go"} />}
          </>
        ),
        marks: (
          <>
            {base.marks}
            {shapes(cues.filter((o) => o.t === "mark"))}
          </>
        ),
        effects,
        me: (
          <>
            {last && !last.missed && (
              <g className={cn("pick", last.ok ? "ok" : "bad")} transform={`translate(${round2(last.p[0])} ${round2(last.p[1])})`}>
                <circle className="halo" r="2.6" />
                <circle className="dot" r="1.1" />
              </g>
            )}
            {runner}
          </>
        ),
      }}
    />
  );
}
