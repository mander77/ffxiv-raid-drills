// @vitest-environment happy-dom
// TS note: the comment above makes Vitest run this file in happy-dom, a fake browser page, so the
// component has a document to draw into. The other test files run in plain Node.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test } from "vitest";
import { TL } from "../../src/data/timeline";
import { CheatSheetPage } from "../../src/pages/CheatSheetPage";
import { useProgressStore } from "../../src/stores/progress";
import { useSlotStore } from "../../src/stores/slot";

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

test("each rule links to its Learn card", () => {
  draw("H1");
  const links = screen.getAllByRole("link", { name: "Learn →" });
  assert.equal(links.length, 11);
  assert.equal(links[0].getAttribute("href"), "/mech/k-first-weapon");
});

test("every source opens in a new tab", () => {
  draw("H1");
  const wtfdig = screen.getByRole("link", { name: "wtfdig M11S" });
  assert.equal(wtfdig.getAttribute("target"), "_blank");
});

test("Reset my progress asks once, then erases the progress", async () => {
  useProgressStore.setState({
    scores: {
      "k-sword": { seen: 2, right: 1 },
      "k-axe": { seen: 1, right: 1 },
    },
  });
  draw("H1");
  const user = userEvent.setup();
  assert.ok(screen.getByText(/You answered 2 different items/));
  await user.click(screen.getByRole("button", { name: "Reset my progress" }));
  assert.equal(Object.keys(useProgressStore.getState().scores).length, 2, "the first click only asks");
  await user.click(screen.getByRole("button", { name: "Click again to erase progress" }));
  assert.equal(Object.keys(useProgressStore.getState().scores).length, 0);
  assert.ok(screen.getByText(/You answered 0 different items/));
});
