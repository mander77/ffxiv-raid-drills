// @vitest-environment happy-dom
import { assert, beforeEach, test } from "vitest";
import { roundOf, scoresOf, useProgressStore } from "../../src/stores/progress";

/** Two fights, so each test can check that one fight's progress stays apart from the other's. */
const F = "m11s";
const OTHER = "other";

beforeEach(() => {
  useProgressStore.getState().reset(F);
  useProgressStore.getState().reset(OTHER);
});
const st = () => useProgressStore.getState();

test("an answer counts in its score and in the round of its tab", () => {
  st().record(F, "k-sword", true, "learn", "H1");
  st().record(F, "k-sword", false, "learn", "H1");
  assert.deepEqual(scoresOf(st(), F, "H1")["k-sword"], { seen: 2, correct: 1 });
  assert.include(roundOf(st(), F, "learn"), { slot: "H1", done: 2, correct: 1 });
  assert.include(roundOf(st(), F, "timeline"), { done: 0 }, "the other tab's round is apart");
});

test("an answer for another slot starts a new round, and each slot keeps its own scores", () => {
  st().record(F, "k-sword", true, "learn", "H1");
  st().record(F, "k-sword", false, "learn", "H2");
  st().record(F, "k-axe", true, "learn", "H2");
  assert.include(roundOf(st(), F, "learn"), { slot: "H2", done: 2, correct: 1 });
  assert.deepEqual(scoresOf(st(), F, "H1"), { "k-sword": { seen: 1, correct: 1 } });
  assert.deepEqual(scoresOf(st(), F, "H2"), {
    "k-sword": { seen: 1, correct: 0 },
    "k-axe": { seen: 1, correct: 1 },
  });
});

test("each fight keeps its own scores and rounds", () => {
  st().record(F, "k-sword", true, "learn", "H1");
  st().visit(F, "learn", "k-sword");
  assert.deepEqual(scoresOf(st(), OTHER, "H1"), {});
  assert.include(roundOf(st(), OTHER, "learn"), { done: 0, current: null });
  st().reset(OTHER);
  assert.deepEqual(scoresOf(st(), F, "H1"), { "k-sword": { seen: 1, correct: 1 } }, "a reset erases only its own fight");
});

test("a slot with no answers has no scores, the same object each time", () => {
  assert.deepEqual(scoresOf(st(), F, "H2"), {});
  assert.strictEqual(scoresOf(st(), F, "H2"), scoresOf(st(), F, "H2"), "a selector that does not draw again for nothing");
});

test("a finished round opens again on a new card, and reset erases every slot", () => {
  st().visit(F, "learn", "k-sword");
  st().finish(F, "learn");
  assert.isTrue(roundOf(st(), F, "learn").finished);
  st().visit(F, "learn", "k-axe");
  assert.isFalse(roundOf(st(), F, "learn").finished);
  st().record(F, "k-axe", true, "learn", "H1");
  st().score(F, "k-axe", true, "H2");
  st().reset(F);
  assert.deepEqual(st().scores[F], {});
  assert.include(roundOf(st(), F, "learn"), { done: 0, current: null, finished: false });
});

test("the quick round counts an answer in the score of its slot only", () => {
  st().score(F, "k-sword", false, "H2");
  assert.deepEqual(scoresOf(st(), F, "H2")["k-sword"], { seen: 1, correct: 0 });
  assert.deepEqual(scoresOf(st(), F, "H1"), {});
  assert.include(roundOf(st(), F, "learn"), { done: 0 });
});

test("saved scores of version 2 come back, and scores of an older version are dropped", async () => {
  const saved = { [F]: { H1: { "k-sword": { seen: 3, correct: 2 } } } };
  localStorage.setItem("raid-drills-progress", JSON.stringify({ state: { scores: saved }, version: 2 }));
  await useProgressStore.persist.rehydrate();
  assert.deepEqual(st().scores, saved);

  localStorage.setItem(
    "raid-drills-progress",
    JSON.stringify({ state: { scores: { H1: { "k-sword": { seen: 3, correct: 2 } } } }, version: 1 }),
  );
  await useProgressStore.persist.rehydrate();
  assert.deepEqual(st().scores, {}, "version 1 had no fights");
});
