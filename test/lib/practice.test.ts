import { assert, test } from "vitest";
import { MAPS } from "../../src/data/drills";
import { inZone, rotZone, stepZone, zoneCenter } from "../../src/geometry";
import { answerStep, buildPattern, phaseAfter } from "../../src/lib/practice";
import type { Point, StepResult } from "../../src/types";

/** The middle of the right area of the next step, which is always inside it. */
function rightSpot(pattern: ReturnType<typeof buildPattern>, results: StepResult[]): Point {
  const base = stepZone(pattern.scene.steps[results.length], results);
  if (!base) throw new Error("no zone");
  return zoneCenter(rotZone(base, pattern.k));
}

test("the same code builds the same pattern", () => {
  for (const m of MAPS) {
    const a = buildPattern(m, "H1", "AB23");
    const b = buildPattern(m, "H1", "AB23");
    assert.equal(a.k, b.k, m.id);
    assert.equal(JSON.stringify(a.scene.overlays), JSON.stringify(b.scene.overlays), m.id);
  }
});

test("every mechanic can be answered right, step by step, and then it is done", () => {
  for (const m of MAPS) {
    const pattern = buildPattern(m, "H1", "K7Q2");
    const results: StepResult[] = [];
    for (let i = 0; i < pattern.scene.steps.length; i++) {
      const r = answerStep(pattern.scene, pattern.k, results, rightSpot(pattern, results));
      if (!r) throw new Error(`${m.id} step ${i + 1}: no answer`);
      assert.isTrue(r.ok, `${m.id} step ${i + 1}`);
      results.push(r);
      assert.equal(phaseAfter(pattern.scene, results), i < pattern.scene.steps.length - 1 ? "right" : "ask");
    }
    assert.isNull(answerStep(pattern.scene, pattern.k, results, [50, 50]), `${m.id}: nothing left to answer`);
  }
});

test("a wrong spot waits for Next step, and its puddle drops in the right area", () => {
  const m = MAPS.find((x) => x.build("H1", x.variants?.[0] ?? null).steps.some((s) => s.drop));
  if (!m) throw new Error("no mechanic drops a puddle");
  const pattern = buildPattern(m, "H1", "K7Q2");
  const results: StepResult[] = [];
  // Answer right until the first step that drops a puddle, then miss it.
  while (!pattern.scene.steps[results.length].drop) {
    const r = answerStep(pattern.scene, pattern.k, results, rightSpot(pattern, results));
    if (r) results.push(r);
  }
  const wrong = answerStep(pattern.scene, pattern.k, results, [-50, -50]);
  if (!wrong?.drop) throw new Error("no puddle");
  assert.isFalse(wrong.ok);
  assert.isTrue(inZone(wrong.drop, wrong.z), "the puddle goes where it should have gone");
  assert.equal(phaseAfter(pattern.scene, [...results, wrong]), results.length + 1 < pattern.scene.steps.length ? "wrong" : "ask");
});
