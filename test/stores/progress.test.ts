// @vitest-environment happy-dom
import { assert, beforeEach, test } from "vitest";
import { scoresOf, useProgressStore } from "../../src/stores/progress";

beforeEach(() => useProgressStore.getState().reset());
const st = () => useProgressStore.getState();

test("an answer counts in its score and in the round of its tab", () => {
  st().record("k-sword", true, "learn", "H1");
  st().record("k-sword", false, "learn", "H1");
  assert.deepEqual(st().scores.H1?.["k-sword"], { seen: 2, correct: 1 });
  assert.include(st().rounds.learn, { slot: "H1", done: 2, correct: 1 });
  assert.include(st().rounds.timeline, { done: 0 }, "the other tab's round is apart");
});

test("an answer for another slot starts a new round, and each slot keeps its own scores", () => {
  st().record("k-sword", true, "learn", "H1");
  st().record("k-sword", false, "learn", "H2");
  st().record("k-axe", true, "learn", "H2");
  assert.include(st().rounds.learn, { slot: "H2", done: 2, correct: 1 });
  assert.deepEqual(scoresOf(st(), "H1"), { "k-sword": { seen: 1, correct: 1 } });
  assert.deepEqual(scoresOf(st(), "H2"), {
    "k-sword": { seen: 1, correct: 0 },
    "k-axe": { seen: 1, correct: 1 },
  });
});

test("a slot with no answers has no scores, the same object each time", () => {
  assert.deepEqual(scoresOf(st(), "H2"), {});
  assert.strictEqual(scoresOf(st(), "H2"), scoresOf(st(), "H2"), "a selector that does not draw again for nothing");
});

test("a finished round opens again on a new card, and reset erases every slot", () => {
  st().visit("learn", "k-sword");
  st().finish("learn");
  assert.isTrue(st().rounds.learn.finished);
  st().visit("learn", "k-axe");
  assert.isFalse(st().rounds.learn.finished);
  st().record("k-axe", true, "learn", "H1");
  st().score("k-axe", true, "H2");
  st().reset();
  assert.deepEqual(st().scores, {});
  assert.include(st().rounds.learn, { done: 0, current: null, finished: false });
});

test("the quick round counts an answer in the score of its slot only", () => {
  st().score("k-sword", false, "H2");
  assert.deepEqual(st().scores.H2?.["k-sword"], { seen: 1, correct: 0 });
  assert.isUndefined(st().scores.H1);
  assert.include(st().rounds.learn, { done: 0 });
});

test("saved scores of version 1 come back, and scores of an older version are dropped", async () => {
  const saved = { H1: { "k-sword": { seen: 3, correct: 2 } } };
  localStorage.setItem("raid-drills-progress", JSON.stringify({ state: { scores: saved }, version: 1 }));
  await useProgressStore.persist.rehydrate();
  assert.deepEqual(st().scores, saved);

  localStorage.setItem("raid-drills-progress", JSON.stringify({ state: { scores: { "k-sword": { seen: 3, correct: 2 } } }, version: 0 }));
  await useProgressStore.persist.rehydrate();
  assert.deepEqual(st().scores, {}, "the old scores mixed both slots");
});
