// @vitest-environment happy-dom
// TS note: the comment above makes Vitest run this file in happy-dom, a fake browser page, so the
// component has a document to draw into. The other test files run in plain Node.
import { test, assert, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/preact";
import type { Slot } from "../src/types";
import type { FunctionComponent } from "preact";

// core.ts looks up the #view element when it loads, so the page needs one before the import.
let Sheet: FunctionComponent<{slot: Slot}>;
let TL: readonly unknown[];
let state: { stats: Record<string, {s: number; r: number}> };
beforeAll(async () => {
  document.body.innerHTML = '<main id="view"></main>';
  ({ Sheet } = await import("../src/views/sheet"));
  ({ TL } = await import("../src/data/timeline"));
  ({ state } = await import("../src/core"));
});
afterEach(cleanup);

test("the cheat sheet shows the timeline for your slot, one row per line", () => {
  render(<Sheet slot="H2" />);
  assert.ok(screen.getByRole("heading", {name:"Your timeline as H2"}));
  // One header row, then one row per timeline line.
  assert.equal(screen.getAllByRole("row").length, TL.length + 1);
  assert.match(screen.getByText(/Stand in the pocket behind him/).textContent ?? "", /Yours is his right/);
});

test("H1 gets the other side", () => {
  render(<Sheet slot="H1" />);
  assert.match(screen.getByText(/Stand in the pocket behind him/).textContent ?? "", /Yours is his left/);
});

test("Reset my progress asks once, then erases the progress", async () => {
  state.stats = {"k-sword": {s:2, r:1}, "k-axe": {s:1, r:1}};
  render(<Sheet slot="H1" />);
  assert.ok(screen.getByText(/You answered 2 different items/));
  await fireEvent.click(screen.getByRole("button", {name:"Reset my progress"}));
  assert.deepEqual(Object.keys(state.stats).length, 2, "the first click only asks");
  await fireEvent.click(screen.getByRole("button", {name:"Click again to erase progress"}));
  assert.deepEqual(state.stats, {});
  assert.ok(screen.getByText(/You answered 0 different items/));
  assert.ok(screen.getByRole("button", {name:"Reset my progress"}));
});
