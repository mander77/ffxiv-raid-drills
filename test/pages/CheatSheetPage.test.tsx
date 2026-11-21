// @vitest-environment happy-dom
// TS note: the comment above makes Vitest run this file in happy-dom, a fake browser page, so the
// component has a document to draw into. The other test files run in plain Node.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { TL } from "../../src/data/timeline";
import { CheatSheetPage } from "../../src/pages/CheatSheetPage";
import { useSlotStore } from "../../src/stores/slot";

afterEach(cleanup);

/** Draw the sheet for a slot. */
function draw(slot: "H1" | "H2"): void {
  useSlotStore.setState({ slot });
  render(<CheatSheetPage />);
}

test("the cheat sheet shows the timeline for your slot, one row per line", () => {
  draw("H2");
  assert.ok(screen.getByText("Your timeline as H2"));
  // One header row, then one row per timeline line.
  assert.equal(screen.getAllByRole("row").length, TL.length + 1);
  assert.match(screen.getByText(/Stand in the pocket behind him/).textContent ?? "", /Yours is his right/);
});

test("H1 gets the other side", () => {
  draw("H1");
  assert.match(screen.getByText(/Stand in the pocket behind him/).textContent ?? "", /Yours is his left/);
});

test("the sword picture marks your pocket for your slot", () => {
  draw("H1");
  const picture = screen.getByRole("img", { name: /Sword example/ });
  // Your label is green (zlabel); the other slot's is grey (zlabel other).
  assert.match(picture.querySelector("g.zlabel:not(.other) text")?.textContent ?? "", /G1 \/ H1/);
});

test("every source opens in a new tab", () => {
  draw("H1");
  const wtfdig = screen.getByRole("link", { name: "wtfdig M11S" });
  assert.equal(wtfdig.getAttribute("target"), "_blank");
});
