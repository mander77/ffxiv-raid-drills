// @vitest-environment happy-dom
import { assert, test } from "vitest";
import { useSlotStore } from "../../src/stores/slot";

/** Load the slot store from a saved value, as on a page load. */
async function loadSaved(slot: unknown): Promise<string> {
  localStorage.setItem("raid-drills-slot", JSON.stringify({ state: { slot } }));
  await useSlotStore.persist.rehydrate();
  return useSlotStore.getState().slot;
}

test("a saved healer slot comes back", async () => {
  assert.equal(await loadSaved("H2"), "H2");
  assert.equal(await loadSaved("H1"), "H1");
});

test("a saved slot of a role with no drills yet, or no slot at all, falls back to H1", async () => {
  for (const saved of ["MT", "R2", "h2", "toString", 2, null]) assert.equal(await loadSaved(saved), "H1");
});
