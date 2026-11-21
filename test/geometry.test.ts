import { test, assert } from "vitest";
import { rot, rotZone, inZone, angOf, leftOf, polar, dist, stepZone } from "../src/geometry";
import type { Step, StepResult } from "../src/types";

test("rot turns a point a quarter turn clockwise about the arena center", () => {
  assert.deepEqual(rot([50, 10], 1), [90, 50]);
  assert.deepEqual(rot([50, 10], 2), [50, 90]);
  assert.deepEqual(rot([50, 10], 4), [50, 10]);
});

test("rotZone keeps rectangles as min/max corners", () => {
  assert.deepEqual(rotZone({rect:[0, 8, 26, 48]}, 1), {rect:[52, 0, 92, 26]});
});

test("angOf measures degrees clockwise from north", () => {
  assert.equal(angOf([0, -1]), 0);
  assert.equal(angOf([1, 0]), 90);
  assert.equal(angOf([0, 1]), 180);
  assert.equal(angOf([-1, 0]), 270);
});

test("leftOf gives the left-hand side of a facing", () => {
  assert.deepEqual(leftOf([1, 0]), [0, -1]);
});

test("inZone handles circles, rectangles and rule zones", () => {
  assert.ok(inZone([52, 50], {c:[50, 50], r:3}));
  assert.notOk(inZone([54, 50], {c:[50, 50], r:3}));
  assert.ok(inZone([10, 20], {rect:[0, 0, 25, 25]}));
  assert.ok(inZone([1, 1], {fn:p => p[0] < 5, label:[1, 1], show:[]}));
});

test("polar finds the point at an angle clockwise from north, and dist measures between points", () => {
  const close = (p: number[], q: number[]): void => { assert.closeTo(p[0], q[0], 1e-9); assert.closeTo(p[1], q[1], 1e-9); };
  close(polar(0, 10), [50, 40]);
  close(polar(90, 10), [60, 50]);
  close(polar(180, 5, [20, 20]), [20, 25]);
  assert.equal(dist([0, 0], [3, 4]), 5);
});

test("stepZone gives a step's fixed zone, or builds it from the answers so far", () => {
  const fixed: Step = {q:"", a:"", z:{c:[50, 50], r:5}};
  assert.deepEqual(stepZone(fixed, []), {c:[50, 50], r:5});
  const built: Step = {q:"", a:"", zf:(res: StepResult[]) => ({c:res[0].p, r:3})};
  const res: StepResult[] = [{p:[10, 20], ok:true, z:{c:[10, 20], r:3}, drop:null}];
  assert.deepEqual(stepZone(built, res), {c:[10, 20], r:3});
  assert.isUndefined(stepZone({q:"", a:""}, []));
});
