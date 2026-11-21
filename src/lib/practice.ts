// The rules of a Practice mechanic, as plain functions: build its pattern from a code, and answer
// a step with a click. The Practice page and its tests both use them.
import { facingNext } from "../data/drills";
import { inZone, rotOverlay, rotZone, stepZone, zoneCenter } from "../geometry";
import type { Boss, Drill, Point, Scene, Slot, StepResult } from "../types";
import { random, withSeed } from "../util";

/** A mechanic's pattern: its scene, and `k`, how many quarter turns the arena is turned. */
export interface Pattern {
  scene: Scene;
  k: number;
}

/** Build a mechanic's pattern from its code. The code seeds every random choice, so the same code
    builds the same pattern: a link with a code opens the pattern it names. */
export function buildPattern(item: Drill, slot: Slot, code: string): Pattern {
  return withSeed(code, () => {
    const v = item.variants ? item.variants[Math.floor(random() * item.variants.length)] : null;
    const k = item.rotate ? Math.floor(random() * 4) : 0;
    return { scene: item.build(slot, v), k };
  });
}

/** The status of a mechanic between clicks:
    - "ask": a step is asked, and the floor shows no answer for it.
    - "right": the last spot was right. It stays on the floor, and the next click answers the next step.
    - "wrong": the last spot was wrong. The mechanic waits for Next step.
    When every step is answered, the mechanic is done, whatever the status. */
export type StepStatus = "ask" | "right" | "wrong";

/** Answer the next step with a click at p, in arena units. Returns the result, or null when there
    is no step left to answer. A puddle drops where you clicked, or in the right area after a
    wrong click. */
export function answerStep(scene: Scene, k: number, results: readonly StepResult[], p: Point): StepResult | null {
  const step = scene.steps[results.length];
  const base = step ? stepZone(step, [...results]) : undefined;
  if (!step || !base) return null;
  const zone = rotZone(base, k);
  const ok = inZone(p, zone);
  return { p, ok, z: zone, drop: step.drop ? (ok ? p : zoneCenter(zone)) : null };
}

/** The status after an answer: a right spot stays on screen until the next click; a wrong one waits
    for Next step; the last answer ends the mechanic. */
export const statusAfter = (scene: Scene, results: readonly StepResult[]): StepStatus =>
  results.length >= scene.steps.length ? "ask" : results[results.length - 1]?.ok ? "right" : "wrong";

/** The boss for the picture: where the scene puts him after n answers. While the next step is
    asked, he has already turned to face its weapon. */
export function bossFor(scene: Scene, k: number, n: number, showLast: boolean): Boss | null {
  const boss = scene.bossAt ? scene.bossAt(n) : scene.boss ? rotOverlay(scene.boss, k) : null;
  return boss && n > 0 && !showLast ? facingNext(scene, n, boss) : boss;
}
