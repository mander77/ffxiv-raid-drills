// @vitest-environment happy-dom
import { assert, test } from "vitest";
import { M11S } from "../../src/data/fights/m11s";
import { choicesOf, usePressureStore } from "../../src/stores/pressure";

test("saved Pressure settings that the app does not know fall back to the defaults", async () => {
  localStorage.setItem(
    "raid-drills-pressure",
    JSON.stringify({ state: { secs: 7, stops: "yes", choices: { m11s: { raw: "sword", ult: "cw" } }, speed: 3 }, version: 2 }),
  );
  await usePressureStore.persist.rehydrate();
  const s = usePressureStore.getState();
  assert.equal(s.secs, 6);
  assert.equal(s.stops, false);
  assert.equal(choicesOf(s, M11S).raw, "random");
  assert.equal(choicesOf(s, M11S).ult, "cw");
  assert.equal(s.speed, 1);
});

test("each fight keeps its own picks", () => {
  usePressureStore.getState().setChoices(M11S.id, { ...M11S.clock.random, ult: "ccw" });
  usePressureStore.getState().setChoices("other", { ult: "cw" });
  assert.equal(choicesOf(usePressureStore.getState(), M11S).ult, "ccw");
});
