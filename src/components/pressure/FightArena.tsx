import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { runnerAt } from "../../data/route";
import { dist } from "../../geometry";
import { useArenaSizes, useFight } from "../../hooks/useFight";
import { useFightFrame } from "../../hooks/useFightFrame";
import type { FightView } from "../../lib/fight";
import { promptOf } from "../../lib/fight";
import { markRole, partyOf } from "../../party";
import type { Hit, Overlay, Point, Slot } from "../../types";
import { LiveArena } from "../arena/LiveArena";
import { Shape, Tether } from "../arena/Shape";

/** A hit to show over the arena: `n` counts the hits, so each one draws (and animates) anew. */
export interface ShownHit {
  n: number;
  hit: Hit;
  /** Where the boss stood, for a tank buster. */
  at: Point;
}

export interface FightArenaProps {
  view: FightView;
  slot: Slot;
  /** The run: label the last correct answer "Correct spot". */
  correctLabel: boolean;
  /** The run: a click picks your spot. On the player, a click pauses it. */
  pickSpot: boolean;
  /** The last hit, for its flash or tank buster. */
  hit: ShownHit | null;
  /** A new number draws the arena anew, so a mechanic's spawns play again. */
  replay: number;
  onPointClick: (p: Point) => void;
  className?: string;
}

/** The arena of the full fight: the mechanic on the clock, with the flash of each hit, the
    countdown ring around the boss and your moving marker. */
export function FightArena({ view: v, slot, correctLabel, pickSpot, hit, replay, onPointClick, className }: FightArenaProps) {
  const g = v.si;
  const bossAt: Point = v.boss ? [v.boss.x, v.boss.y] : [50, 50];
  const tether = v.scene.tether;
  // Your stack or spread marker rides on your moving marker while its step is asked.
  const head = v.scene.headMark;
  const myMarker = head?.you && v.results.length === (head.at ?? 0) ? head : undefined;
  // A bait circle rides on your moving marker while its step is asked.
  const bait = v.scene.steps[v.results.length]?.bait;
  return (
    <LiveArena
      // A new mechanic draws a new arena, so its weapons spawn in again.
      key={`${g >= 0 ? g : v.scene.split ? "split" : "idle"}-${replay}`}
      scene={v.scene}
      k={v.k}
      results={v.results}
      showLast={v.showAnswer}
      hint={false}
      boss={v.boss}
      wentOff={(i) => v.wentOff[i] ?? false}
      correctLabel={correctLabel}
      pickSpot={pickSpot}
      target={v.target}
      spawned={v.spawned}
      onPointClick={onPointClick}
      className={cn("cursor-pointer", className)}
      floor={<FloorAttacks at={bossAt} />}
      effects={
        <>
          {hit && <HitEffect key={hit.n} hit={hit.hit} at={hit.at} split={v.scene.split ?? false} />}
          <CountdownRing at={bossAt} />
        </>
      }
      runner={
        <Runner
          slot={slot}
          portal={tether && v.results.length >= (tether.from ?? 0) ? tether.portal : undefined}
          fixed={tether?.fixed}
          stack={myMarker && !myMarker.spread ? myMarker.n : undefined}
          spread={myMarker?.spread}
          bait={bait}
        />
      }
    />
  );
}

interface HitEffectProps {
  hit: Hit;
  at: Point;
  /** The Arena Split: the flash covers both platforms, which reach past 0 and 100. */
  split: boolean;
}

/** Damage going out: a flash over the floor in the category's colour, or for a tank buster, the
    tanks and the hit on them. Its CSS animation fades it out. */
function HitEffect({ hit, at, split }: HitEffectProps) {
  const { busterPieces } = useFight().clock;
  const halfWidth = useArenaSizes().split?.halfWidth;
  const clip = useId();
  // The floor: one square, or both platforms of the Arena Split.
  const [x, width] = split && halfWidth ? [50 - halfWidth, halfWidth * 2] : [0, 100];
  if (hit.kind === "tank")
    // A buster's line (Great Wall of Fire) reaches past the wall, so it is clipped to the floor.
    return (
      <g className="buster">
        <clipPath id={clip}>
          <rect x={x} y="0" width={width} height="100" />
        </clipPath>
        <g clipPath={`url(#${clip})`}>
          {busterPieces(hit.name, at).map((o, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a buster's pieces never change order.
            <Shape key={i} overlay={o} />
          ))}
        </g>
      </g>
    );
  if (hit.kind === "aoe") return null;
  if (hit.area) return <circle className={cn("hitfx", hit.kind, hit.cat)} cx={hit.area.c[0]} cy={hit.area.c[1]} r={hit.area.r} />;
  return <rect className={cn("hitfx", hit.kind, hit.cat)} x={x} y="0" width={width} height="100" />;
}

interface FloorAttacksProps {
  /** The middle of the boss. */
  at: Point;
}

/** The attacks on the floor that no mechanic draws, such as a fire trail while it casts. They
    come and go with the fight clock. */
function FloorAttacks({ at }: FloorAttacksProps) {
  const { floorAttacks } = useFight().clock;
  const [shown, setShown] = useState<{ key: string; overlays: Overlay[] }>({ key: "[]", overlays: [] });
  useFightFrame((s) => {
    const overlays = floorAttacks(s.t, at);
    const key = JSON.stringify(overlays);
    // A state setter draws again only when the value changes, so this draws only when one comes or goes.
    setShown((was) => (was.key === key ? was : { key, overlays }));
  });
  return (
    <g className="pointer-events-none">
      {shown.overlays.map((o, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the attacks at one time never change order.
        <Shape key={i} overlay={o} />
      ))}
    </g>
  );
}

interface CountdownRingProps {
  /** The middle of the boss. */
  at: Point;
}

/** The ring around the boss: it empties as your hit comes closer, and turns red at the end. */
function CountdownRing({ at }: CountdownRingProps) {
  const ring = useRef<SVGCircleElement>(null);
  useFightFrame((s) => {
    const el = ring.current;
    if (!el) return;
    const r = promptOf(s).ring;
    el.style.display = r ? "" : "none";
    if (r) {
      el.setAttribute("stroke-dashoffset", (100 * r.empty).toFixed(1));
      el.style.stroke = r.urgent ? "var(--arena-miss)" : "";
    }
  });
  // It starts at the top, so it turns -90 degrees round its middle.
  return (
    <circle
      ref={ring}
      className="tring"
      cx={at[0]}
      cy={at[1]}
      r="16"
      pathLength={100}
      strokeDasharray="100"
      transform={`rotate(-90 ${at[0]} ${at[1]})`}
      style={{ display: "none" }}
    />
  );
}

interface RunnerProps {
  slot: Slot;
  /** Your tether's portal, when you have a tether: the tether runs from it to your marker. */
  portal?: Point;
  /** The tether is never shown as stretched. */
  fixed?: boolean;
  /** You have a stack marker: it hits this many times. */
  stack?: number;
  /** You have a spread marker. */
  spread?: boolean;
  /** The radius of the attack you bait, drawn as a circle around you. */
  bait?: number;
}

/** Your marker: it runs the correct spots on the player, and to your clicks in the run. It waits on
    each spot until the hit lands, then runs to the next one. While it has to get there, a dotted
    line goes to the spot, and a ring marks it. With a tether, the tether follows it. */
function Runner({ slot, portal, fixed = false, stack, spread = false, bait }: RunnerProps) {
  const me = useRef<SVGGElement>(null);
  const path = useRef<SVGLineElement>(null);
  const next = useRef<SVGCircleElement>(null);
  // Two tethers, one red and one stretched: each frame shows the one that fits its length.
  const short = useRef<SVGGElement>(null);
  const long = useRef<SVGGElement>(null);
  /** How long a tether is before it counts as stretched. */
  const reach = useArenaSizes().split?.tetherStretch ?? Number.POSITIVE_INFINITY;
  useFightFrame((s) => {
    const { at, target } = runnerAt(s.route, s.t);
    const to = target?.p;
    me.current?.setAttribute("transform", `translate(${at[0].toFixed(2)} ${at[1].toFixed(2)})`);
    if (portal) {
      const stretched = !fixed && dist(portal, at) >= reach;
      for (const [g, show] of [
        [short.current, !stretched],
        [long.current, stretched],
      ] as const) {
        if (!g) continue;
        g.style.display = show ? "" : "none";
        for (const line of g.querySelectorAll("line")) {
          line.setAttribute("x2", at[0].toFixed(2));
          line.setAttribute("y2", at[1].toFixed(2));
        }
      }
    }
    const away = to != null && Math.hypot(to[0] - at[0], to[1] - at[1]) > 0.5;
    if (path.current) {
      path.current.style.display = away ? "" : "none";
      if (to) {
        path.current.setAttribute("x1", at[0].toFixed(2));
        path.current.setAttribute("y1", at[1].toFixed(2));
        path.current.setAttribute("x2", to[0].toFixed(2));
        path.current.setAttribute("y2", to[1].toFixed(2));
      }
    }
    if (next.current) {
      next.current.style.display = to ? "" : "none";
      if (to) {
        next.current.setAttribute("cx", to[0].toFixed(2));
        next.current.setAttribute("cy", to[1].toFixed(2));
      }
    }
  });
  return (
    <g className="runner">
      {portal && (
        <>
          <g ref={short}>
            <Tether portal={portal} to={portal} stretched={false} fixed={fixed} />
          </g>
          <g ref={long} style={{ display: "none" }}>
            <Tether portal={portal} to={portal} stretched />
          </g>
        </>
      )}
      <line ref={path} className="runpath" style={{ display: "none" }} />
      <circle ref={next} className="runnext" r="2.6" style={{ display: "none" }} />
      <g ref={me}>
        {bait != null && <circle className="bait" r={bait} />}
        <circle className="runhalo" r="4.2" />
        <Shape overlay={{ t: "mark", x: 0, y: 0, l: slot, r: markRole(partyOf(slot).role) }} />
        {spread && <Shape overlay={{ t: "target", x: 0, y: 0 }} />}
        {stack != null && <Shape overlay={{ t: "stackMark", x: 0, y: 0, n: stack }} />}
      </g>
    </g>
  );
}
