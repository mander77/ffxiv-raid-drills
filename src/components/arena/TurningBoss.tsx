import { useEffect, useRef, useState } from "react";
import type { Boss } from "../../types";
import { BossMark } from "./BossMark";

/** Where a boss with no facing turns from when he first turns to a target: north, where his tank
    holds him before the cast. */
const TURN_FROM = 0;

/** The short way round from one facing to another, in degrees: -180 to 180. */
const shortTurn = (from: number, to: number): number => ((((to - from) % 360) + 540) % 360) - 180;

export interface TurningBossProps {
  boss: Boss;
}

/** The boss on a live arena. When he only turns (the same spot, a new facing), his ring turns from
    the old facing to the new one, the short way round, as he does in the game. His first turn on a
    spot, from no facing to a target, starts from north. A jump, or a change to no facing, draws him
    at once. The angle is kept unwrapped (it can pass 360), so the next turn starts from where the
    ring is. */
export function TurningBoss({ boss }: TurningBossProps) {
  const { x, y, f } = boss;
  const [angle, setAngle] = useState<number | null>(f);
  /** His spot and facing at the last change, to tell a turn from a jump. */
  const last = useRef({ x, y, f });

  // The turn is an animation in the browser (a CSS transition on the ring), so it is kept in step
  // here, after a change of spot or facing. That is what an effect is for.
  useEffect(() => {
    const was = last.current;
    last.current = { x, y, f };
    if (f == null || was.x !== x || was.y !== y) {
      setAngle(f);
      return;
    }
    // His first turn: show him facing north, let the browser paint that, then turn him.
    if (was.f == null) {
      setAngle(TURN_FROM);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setAngle(TURN_FROM + shortTurn(TURN_FROM, f)));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setAngle((a) => (a == null ? f : a + shortTurn(a, f)));
  }, [x, y, f]);

  return <BossMark boss={{ ...boss, f: angle }} />;
}
