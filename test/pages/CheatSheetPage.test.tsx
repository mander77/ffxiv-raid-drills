// @vitest-environment happy-dom
// TS note: the comment above makes Vitest run this file in happy-dom, a fake browser page, so the
// component has a document to draw into. The other test files run in plain Node.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test } from "vitest";
import { REFERENCE } from "../../src/data/reference";
import { TIMELINE } from "../../src/data/timeline";
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
  assert.ok(screen.getByText("Your Timeline as H2"));
  // One header row, then one row per timeline line.
  assert.equal(screen.getAllByRole("row").length, TIMELINE.length + 1);
});

test("every mechanic has its picture, under its phase, for your slot", () => {
  draw("H2");
  assert.ok(screen.getByRole("heading", { name: "Every Mechanic as H2" }));
  assert.equal(screen.getAllByRole("img", { name: /on the arena/ }).length, REFERENCE.length);
  const phase3 = screen.getByRole("region", { name: "Phase 3: Arena Split" });
  assert.ok(within(phase3).getByRole("img", { name: /^Massive Meteor on the arena/ }));
  // The rules are the Learn cards' rules, for your slot.
  assert.ok(screen.getByText("Scythe: H1 at the butt, H2 at the point, close in."));
});

test("the buttons at the top jump to each section of the page", () => {
  draw("H1");
  const chips = within(screen.getByRole("navigation", { name: "Sections on this page" })).getAllByRole("link");
  assert.deepEqual(
    chips.map((c) => c.textContent),
    ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Panic Reset", "Timeline", "Sources", "Your Progress"],
  );
  // Each one goes to a section that is on the page.
  for (const c of chips) assert.ok(document.getElementById(c.getAttribute("href")?.slice(1) ?? ""), c.textContent ?? "");
});

test("each mechanic links to the tabs that train it", () => {
  draw("H1");
  assert.equal(screen.getAllByRole("link", { name: "Learn" }).length, REFERENCE.length);
  const links = within(screen.getByRole("navigation", { name: "Train Raw Steel Trophy" })).getAllByRole("link");
  assert.deepEqual(
    links.map((l) => [l.textContent, l.getAttribute("href")]),
    [
      ["Learn", "/learn/k-raw-first"],
      ["Practice: Axe", "/practice/m-raw-axe"],
      ["Practice: Scythe", "/practice/m-raw-scythe"],
      ["Timeline", "/timeline/n-0"],
    ],
  );
});

test("a mechanic shows the answer that is yours alone", () => {
  draw("H2");
  assert.ok(screen.getByText(/The pocket behind him on his right/));
  assert.isNotEmpty(screen.getAllByText("As H2:"));
});

test("every source opens in a new tab", () => {
  draw("H1");
  const wtfdig = screen.getByRole("link", { name: "wtfdig M11S" });
  assert.equal(wtfdig.getAttribute("target"), "_blank");
});

test("the sources name where the times and the attack sizes come from", () => {
  draw("H1");
  assert.ok(screen.getByRole("link", { name: "cactbot r11s timeline" }));
  assert.ok(screen.getByRole("link", { name: "BossMod M11S module" }));
});

test("Your progress counts your slot's answers; Reset asks once, then erases every slot", async () => {
  useProgressStore.setState({
    scores: {
      H1: {
        "k-sword": { seen: 2, correct: 1 },
        "k-axe": { seen: 1, correct: 1 },
      },
      H2: { "k-sword": { seen: 1, correct: 0 } },
    },
  });
  draw("H1");
  const user = userEvent.setup();
  assert.ok(screen.getByText(/You answered 2 different items as H1/));
  await user.click(screen.getByRole("button", { name: "Reset My Progress" }));
  assert.equal(Object.keys(useProgressStore.getState().scores).length, 2, "the first click only asks");
  await user.click(screen.getByRole("button", { name: "Click Again to Erase Progress" }));
  assert.deepEqual(useProgressStore.getState().scores, {});
  assert.ok(screen.getByText(/You answered 0 different items/));
});
