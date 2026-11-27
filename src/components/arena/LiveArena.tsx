import type { ReactNode } from "react";
import { rotOverlay, rotZone, round2, stepZone, unit, zoneCenter } from "../../geometry";
import { bossFor } from "../../lib/practice";
import { cn } from "../../lib/utils";
import type { Boss, Overlay, Point, Scene, StepResult, Zone } from "../../types";
import { Arena, pieceLayers, withoutChangedRocks } from "./Arena";
import { Shape, Tether } from "./Shape";
import { TurningBoss } from "./TurningBoss";
import { ZoneArea } from "./ZoneArea";
import { ZoneLabel } from "./ZoneLabel";

/** How far in from a weapon, toward the arena center, its order number goes, so it stays clear
    of the weapon's name on the outer side. The app's choice. */
const ORD_IN = 10;

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
      after it drops, or when a step with puddlesOff is asked, unless it stays for good (its life
      has no end). */
  wentOff?: (i: number) => boolean;
  /** Label the last correct answer "Correct spot". Watch the correct moves leaves it out: your marker
      walks into each spot. */
  correctLabel?: boolean;
  /** A click picks your spot, so the arena's name says "Click where you stand". Watch the correct
      moves leaves it out: there a click pauses the player. */
  pickSpot?: boolean;
  /** The correct area of your marker's next spot, in blue (Watch the correct moves). */
  target?: Zone | null;
  /** How many weapons have spawned on the fight clock. Each one shows as it spawns. Left out,
      the scene's spawnAhead rule shows them. */
  spawned?: number;
  /** What the fight draws over the arena: the flash of a hit, the countdown ring, a tank buster. */
  effects?: ReactNode;
  /** Your moving marker, on top of everything. It draws your tether too, so the arena leaves it out. */
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
  pickSpot = true,
  target,
  spawned,
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
  // Weapons that resolved fade; the one just answered stays until the next step. On the fight
  // clock each weapon shows as it spawns; with spawnAhead, each answered step brings in one more.
  const gone = showLast ? n - 1 : n;
  const visible = spawned ?? (sc.spawnAhead != null ? sc.spawnAhead + n : Number.POSITIVE_INFINITY);
  const boss = placed === undefined ? bossFor(sc, k, n, showLast) : placed;
  const bossAt: Point | null = boss ? [boss.x, boss.y] : null;
  const weapons = groups.map((g, i) => {
    const pos = g.find((o) => o.t === "scythe" || o.t === "axe" || o.t === "sword");
    // The weapon he stands on needs no name: his ring on its icon says which one it is.
    const at = pos && "x" in pos ? rotOverlay(pos, k) : undefined;
    const onBoss = boss && at && "x" in at && Math.hypot(at.x - boss.x, at.y - boss.y) < 0.5;
    const pieces = onBoss ? g.filter((o) => o.t !== "tag") : g;
    return (
      <g
        // biome-ignore lint/suspicious/noArrayIndexKey: a weapon's spawn index is its identity.
        key={i}
        className={cn("spawn", i < gone && "gone", i >= visible && "later")}
        // Practice plays the spawns one second apart. On the clock each comes in at its own time.
        style={sc.spawnPlay && spawned == null ? { animationDelay: `${0.3 + i}s` } : undefined}
      >
        {pieces.map((o, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of a weapon never change order.
          <Shape key={j} overlay={rotOverlay(o, k)} />
        ))}
        {sc.spawnPlay && pos && "x" in pos && (
          <text
            className="ord"
            x={round2(pos.x + unit([50 - pos.x, 50 - pos.y])[0] * ORD_IN)}
            y={round2(pos.y + unit([50 - pos.x, 50 - pos.y])[1] * ORD_IN)}
          >
            {i + 1}
          </text>
        )}
      </g>
    );
  });

  // What the last answer revealed (the attack) goes under the weapons, so their icons stay sharp.
  const last = showLast ? results[n - 1] : undefined;
  const lastStep = last ? sc.steps[n - 1] : undefined;
  // An attack that follows the party (revealAt) goes where the party went: your click when it
  // was correct, else the correct spot. A result is already turned by k, so it is not turned again.
  const partyAt: Point | undefined = last && (last.ok ? last.p : zoneCenter(last.z));
  const revealed = [
    ...(lastStep?.reveal?.map((o) => rotOverlay(o, k)) ?? []),
    ...(lastStep?.revealAt && partyAt ? lastStep.revealAt(partyAt) : []),
  ];
  const reveal = pieceLayers(revealed);
  // The scene's other pieces. A rock the reveal breaks or removes is left out.
  const base = pieceLayers(
    withoutChangedRocks(
      sc.overlays.filter((o) => o.spawn == null).map((o) => rotOverlay(o, k)),
      revealed,
    ),
  );

  // Your tether, from its portal to where you stand: your last click, or your mark before the first.
  // It shows once its step (`from`) is asked.
  const mine = runner === undefined ? sc.tether : undefined;
  const lastSpot = [...results].reverse().find((r) => !r.missed)?.p;
  const tetherTo: Point | undefined = mine && (lastSpot ?? [mine.you.x, mine.you.y]);
  // A stack marker, on its player until the step is answered. Yours rides on your moving marker
  // in the full fight, so it is not drawn here then.
  const head = sc.headMark;
  const headOn = head && results.length === 0 && !(head.you && runner !== undefined) ? rotOverlay(head.on, k) : undefined;

  // After a correct answer the next question is already asked; after an incorrect one it waits
  // for Next step.
  const asked = showLast && !results[n - 1]?.ok ? n - 1 : n;

  // The puddles dropped before the last step with clearDrops (up to the one asked) are gone. A
  // puddle goes off two steps after it drops, or when a step with puddlesOff is asked: it fades
  // out then. A puddle with no end to its life (an Ecliptic fire puddle) stays.
  const kept = sc.steps.slice(0, asking + 1).reduce((from, st, i) => (st.clearDrops ? i : from), 0);
  const allOff = sc.steps.slice(0, asked + 1).some((st) => st.puddlesOff);
  const drops: ReactNode[] = [];
  results.forEach((r, i) => {
    const puddle = sc.steps[i].drop;
    if (r.drop && puddle && i >= kept)
      drops.push(
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: a puddle belongs to its step, which never moves.
          key={`drop-${i}`}
          className={cn("drop", (wentOff ? wentOff(i) : Number.isFinite(puddle.life) && (allOff || i <= n - 2)) && "fading")}
          cx={round2(r.drop[0])}
          cy={round2(r.drop[1])}
          r={puddle.r}
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
    .slice(0, asked + 1)
    .flatMap((st) => st.cue ?? [])
    .map((o) => rotOverlay(o, k));

  // Show me: the correct area of the step asked.
  const hintStep = hint ? sc.steps[n] : undefined;
  const hintBase = hintStep ? stepZone(hintStep, [...results]) : undefined;
  const hintZone = hintBase ? rotZone(hintBase, k) : undefined;

  const shapes = (os: readonly Overlay[]): ReactNode =>
    // biome-ignore lint/suspicious/noArrayIndexKey: these pieces never change order.
    os.map((o, i) => <Shape key={i} overlay={o} />);

  return (
    <Arena
      label={arenaLabel(done, pickSpot && onPointClick !== undefined)}
      split={sc.split && (sc.splitAfter === undefined || n > sc.splitAfter)}
      className={cn("live", done && "locked", sc.spawnPlay && "play", className)}
      onPointClick={done ? undefined : onPointClick}
      layers={{
        ground: (
          <>
            {reveal.ground}
            {base.ground}
          </>
        ),
        weapons: (
          <>
            {base.weapons}
            {weapons}
          </>
        ),
        pushes: (
          <>
            {base.pushes}
            {reveal.pushes}
          </>
        ),
        drops: (
          <>
            {drops}
            {base.drops}
            {reveal.drops}
            {shapes(cues.filter((o) => o.t !== "mark"))}
            {mine && tetherTo && asked >= (mine.from ?? 0) && <Tether portal={mine.portal} to={tetherTo} fixed={mine.fixed} />}
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
            {reveal.labels}
            {last && lastStep && (lastStep.lookAhead || correctLabel) && (
              <ZoneLabel zone={last.z} kind={lastStep.lookAhead ? "later" : "correct"} boss={bossAt} />
            )}
            {hintZone && hintStep && <ZoneLabel zone={hintZone} kind={hintStep.lookAhead ? "later" : "go"} boss={bossAt} />}
          </>
        ),
        marks: (
          <>
            {base.marks}
            {reveal.marks}
            {shapes(cues.filter((o) => o.t === "mark"))}
            {mine && results.length === 0 && !mine.from && <Shape overlay={mine.you} />}
            {headOn && head && (
              <>
                <Shape overlay={headOn} />
                <Shape overlay={{ t: "stackMark", x: headOn.x, y: headOn.y, n: head.n }} />
              </>
            )}
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

/** The arena's name for screen readers. A click picks a spot on a map, which keys cannot, so
    the name says what a click does. */
function arenaLabel(done: boolean, pickSpot: boolean): string {
  if (done) return "Arena map. The mechanic is done.";
  return pickSpot ? "Arena map. Click where you stand." : "Arena map.";
}
