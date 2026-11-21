// @vitest-environment happy-dom
// TS note: the comment above makes Vitest run this file in happy-dom, a fake browser page, so the
// component has a document to draw into. The other test files run in plain Node.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, beforeAll, test } from "vitest";
import { useSlotStore } from "../../src/stores/slot";

// core.ts looks up the #view element when it loads, so the page needs one before the import.
let CheatSheetPage: ComponentType;
let TL: readonly unknown[];
let state: { stats: Record<string, { s: number; r: number }> };
beforeAll(async () => {
  document.body.innerHTML = '<main id="view"></main>';
  ({ CheatSheetPage } = await import("../../src/pages/CheatSheetPage"));
  ({ TL } = await import("../../src/data/timeline"));
  ({ state } = await import("../../src/core"));
});
afterEach(cleanup);

/** Draw the sheet for a slot. Its links need a router around them. */
function draw(slot: "H1" | "H2"): void {
  useSlotStore.setState({ slot });
  render(
    <MemoryRouter>
      <CheatSheetPage />
    </MemoryRouter>,
  );
}

test("the cheat sheet shows the timeline for your slot, one row per line", () => {
  draw("H2");
  assert.ok(screen.getByRole("heading", { name: "Your timeline as H2" }));
  // One header row, then one row per timeline line.
  assert.equal(screen.getAllByRole("row").length, TL.length + 1);
  assert.match(screen.getByText(/Stand in the pocket behind him/).textContent ?? "", /Yours is his right/);
});

test("H1 gets the other side", () => {
  draw("H1");
  assert.match(screen.getByText(/Stand in the pocket behind him/).textContent ?? "", /Yours is his left/);
});

test("each rule links to its Learn card", () => {
  draw("H1");
  const links = screen.getAllByRole("link", { name: "Learn →" });
  assert.equal(links[0].getAttribute("href"), "/mech/k-first-weapon");
});

test("Reset my progress asks once, then erases the progress", async () => {
  state.stats = { "k-sword": { s: 2, r: 1 }, "k-axe": { s: 1, r: 1 } };
  draw("H1");
  const user = userEvent.setup();
  assert.ok(screen.getByText(/You answered 2 different items/));
  await user.click(screen.getByRole("button", { name: "Reset my progress" }));
  assert.equal(Object.keys(state.stats).length, 2, "the first click only asks");
  await user.click(screen.getByRole("button", { name: "Click again to erase progress" }));
  assert.equal(Object.keys(state.stats).length, 0);
  assert.ok(screen.getByText(/You answered 0 different items/));
});
