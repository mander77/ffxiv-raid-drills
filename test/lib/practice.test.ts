import { assert, test } from "vitest";
import { DRILLS } from "../../src/data/drills";
import { inZone, rotZone, stepZone, zoneCenter } from "../../src/geometry";
import { answerStep, buildPattern, statusAfter } from "../../src/lib/practice";
import type { Point, StepResult } from "../../src/types";

/** The middle of the correct area of the next step, which is always inside it. */
function correctSpot(pattern: ReturnType<typeof buildPattern>, results: StepResult[]): Point {
  const base = stepZone(pattern.scene.steps[results.length], results);
  if (!base) throw new Error("no zone");
  return zoneCenter(rotZone(base, pattern.k));
}

test("the same code builds the same pattern", () => {
  for (const m of DRILLS) {
    const a = buildPattern(m, "H1", "AB23");
    const b = buildPattern(m, "H1", "AB23");
    assert.equal(a.k, b.k, m.id);
    assert.equal(JSON.stringify(a.scene.overlays), JSON.stringify(b.scene.overlays), m.id);
  }
});

test("every mechanic can be answered correct, step by step, and then it is done", () => {
  for (const m of DRILLS) {
    const pattern = buildPattern(m, "H1", "K7Q2");
    const results: StepResult[] = [];
    for (let i = 0; i < pattern.scene.steps.length; i++) {
      const r = answerStep(pattern.scene, pattern.k, results, correctSpot(pattern, results));
      if (!r) throw new Error(`${m.id} step ${i + 1}: no answer`);
      assert.isTrue(r.ok, `${m.id} step ${i + 1}`);
      results.push(r);
      assert.equal(statusAfter(pattern.scene, results), i < pattern.scene.steps.length - 1 ? "correct" : "ask");
    }
    assert.isNull(answerStep(pattern.scene, pattern.k, results, [50, 50]), `${m.id}: nothing left to answer`);
  }
});

test("an incorrect spot waits for Next step, and its puddle drops in the correct area", () => {
  const m = DRILLS.find((x) => x.build("H1", x.variants?.[0] ?? null).steps.some((s) => s.drop));
  if (!m) throw new Error("no mechanic drops a puddle");
  const pattern = buildPattern(m, "H1", "K7Q2");
  const results: StepResult[] = [];
  // Answer correct until the first step that drops a puddle, then miss it.
  while (!pattern.scene.steps[results.length].drop) {
    const r = answerStep(pattern.scene, pattern.k, results, correctSpot(pattern, results));
    if (r) results.push(r);
  }
  const incorrect = answerStep(pattern.scene, pattern.k, results, [-50, -50]);
  if (!incorrect?.drop) throw new Error("no puddle");
  assert.isFalse(incorrect.ok);
  assert.isTrue(inZone(incorrect.drop, incorrect.z), "the puddle goes where it should have gone");
  assert.equal(statusAfter(pattern.scene, [...results, incorrect]), results.length + 1 < pattern.scene.steps.length ? "incorrect" : "ask");
});
