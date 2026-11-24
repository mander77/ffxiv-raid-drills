// How the boss moves between the steps of a scene, for every fight: Practice and the full fight
// both use these.
import type { Boss, Scene } from "../types";

/** True when the boss jumps once `n` steps of the scene are done: his next place is elsewhere. */
export function jumpsNext(sc: Scene, n: number): boolean {
  const now = sc.bossAt?.(n),
    next = sc.bossAt?.(n + 1);
  return Boolean(now && next && (next.x !== now.x || next.y !== now.y));
}

/** The boss before a jump: he turns to face the place he jumps to next. `n` steps of the scene
    are done. He stays as he is when no jump comes next. */
export function facingNext(sc: Scene, n: number, boss: Boss): Boss {
  const next = sc.bossAt?.(n + 1);
  return next && next.f != null && (next.x !== boss.x || next.y !== boss.y) ? { ...boss, f: next.f } : boss;
}
