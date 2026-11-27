// The rules of a Practice mechanic, as plain functions: build its pattern from a code, and answer
// a step with a click. The Practice page and its tests both use them.
import { inZone, rotOverlay, rotZone, stepZone, whyNotAt, zoneCenter } from "../geometry";
import type { Boss, Drill, DrillKind, Point, Scene, Slot, StepResult } from "../types";
import { random, withSeed } from "../util";
import { facingNext } from "./scene";

/** True when a new try at this drill can look different: random parts, a variant or a turn. */
export const changes = (m: Drill): boolean => Boolean(m.random || m.variants || m.rotate);

/** A mechanic's pattern: its scene, and `k`, how many quarter turns the arena is turned. */
export interface Pattern {
  scene: Scene;
  k: number;
}

/** Build a mechanic's pattern from its code. The code seeds every random choice, so the same code
    builds the same pattern: a link with a code opens the pattern it names. */
/** Each kind a mechanic can be, in order: one for most, several for a weapon mechanic (each
    weapon is a party stack, proteans or a light party stack). */
export function kindsOf(drill: Drill): readonly DrillKind[] {
  return typeof drill.kind === "string" ? [drill.kind] : drill.kind;
}

export function buildPattern(item: Drill, slot: Slot, code: string): Pattern {
  return withSeed(code, () => {
    const v = item.variants ? item.variants[Math.floor(random() * item.variants.length)] : null;
    const k = item.rotate ? Math.floor(random() * 4) : 0;
    return { scene: item.build(slot, v), k };
  });
}

/** The status of a mechanic between clicks:
    - "ask": a step is asked, and the floor shows no answer for it.
    - "correct": the last spot was correct. It stays on the floor, and the next click answers the next step.
    - "incorrect": the last spot was incorrect. The mechanic waits for Next step.
    When every step is answered, the mechanic is done, whatever the status. */
export type StepStatus = "ask" | "correct" | "incorrect";

/** Answer the next step with a click at p, in arena units. Returns the result, or null when there
    is no step left to answer. A puddle drops where you clicked, or in the correct area after a
    incorrect click. */
export function answerStep(scene: Scene, k: number, results: readonly StepResult[], p: Point): StepResult | null {
  const step = scene.steps[results.length];
  const base = step ? stepZone(step, [...results]) : undefined;
  if (!step || !base) return null;
  const zone = rotZone(base, k);
  const ok = inZone(p, zone);
  const why = ok ? undefined : whyNotAt(step, [...results], p, k);
  return { p, ok, z: zone, drop: step.drop ? (ok ? p : zoneCenter(zone)) : null, ...(why ? { why } : {}) };
}

/** The status after an answer: a correct spot stays on screen until the next click; an incorrect one waits
    for Next step; the last answer ends the mechanic. */
export const statusAfter = (scene: Scene, results: readonly StepResult[]): StepStatus =>
  results.length >= scene.steps.length ? "ask" : results[results.length - 1]?.ok ? "correct" : "incorrect";

/** The boss for the picture: where the scene puts him after n answers. While the next step is
    asked, he has already turned to face its weapon. */
export function bossFor(scene: Scene, k: number, n: number, showLast: boolean): Boss | null {
  const boss = scene.bossAt ? scene.bossAt(n) : scene.boss ? rotOverlay(scene.boss, k) : null;
  return boss && n > 0 && !showLast ? facingNext(scene, n, boss) : boss;
}
