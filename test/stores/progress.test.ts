import { assert, beforeEach, test } from "vitest";
import { useProgressStore } from "../../src/stores/progress";

beforeEach(() => useProgressStore.getState().reset());
const st = () => useProgressStore.getState();

test("an answer counts in its score and in the round of its tab", () => {
  st().record("k-sword", true, "learn", "H1");
  st().record("k-sword", false, "learn", "H1");
  assert.deepEqual(st().scores["k-sword"], { seen: 2, right: 1 });
  assert.include(st().rounds.learn, { slot: "H1", done: 2, right: 1 });
  assert.include(st().rounds.timeline, { done: 0 }, "the other tab's round is apart");
});

test("an answer for another slot starts a new round, but keeps the scores", () => {
  st().record("k-sword", true, "learn", "H1");
  st().record("k-axe", true, "learn", "H2");
  assert.include(st().rounds.learn, { slot: "H2", done: 1, right: 1 });
  assert.equal(Object.keys(st().scores).length, 2);
});

test("a finished round opens again on a new card, and reset erases everything", () => {
  st().visit("learn", "k-sword");
  st().finish("learn");
  assert.isTrue(st().rounds.learn.finished);
  st().visit("learn", "k-axe");
  assert.isFalse(st().rounds.learn.finished);
  st().record("k-axe", true, "learn", "H1");
  st().reset();
  assert.deepEqual(st().scores, {});
  assert.include(st().rounds.learn, { done: 0, current: null, finished: false });
});
