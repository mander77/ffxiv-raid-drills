// @vitest-environment happy-dom
import { assert, test } from "vitest";
import { usePressureStore } from "../../src/stores/pressure";

test("saved Pressure settings that the app does not know fall back to the defaults", async () => {
  localStorage.setItem(
    "raid-drills-pressure",
    JSON.stringify({ state: { secs: 7, stops: "yes", choices: { raw: "sword", ult: "cw" }, speed: 3 }, version: 0 }),
  );
  await usePressureStore.persist.rehydrate();
  const s = usePressureStore.getState();
  assert.equal(s.secs, 6);
  assert.equal(s.stops, false);
  assert.equal(s.choices.raw, "random");
  assert.equal(s.choices.ult, "cw");
  assert.equal(s.speed, 1);
});
