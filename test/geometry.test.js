import { test } from "node:test";
import assert from "node:assert/strict";
import { rot, rotZone, inZone, angOf, leftOf } from "../js/geometry.js";

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
  assert.ok(!inZone([54, 50], {c:[50, 50], r:3}));
  assert.ok(inZone([10, 20], {rect:[0, 0, 25, 25]}));
  assert.ok(inZone([1, 1], {fn:p => p[0] < 5, label:[1, 1]}));
});
