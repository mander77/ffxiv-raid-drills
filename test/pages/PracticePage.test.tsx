// @vitest-environment happy-dom
// Practice: a mechanic opens with a pattern code in the address, a click answers, Show me helps
// without counting, and an incorrect spot waits for Next step.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, assert, beforeAll, beforeEach, test } from "vitest";
import { DRILLS } from "../../src/data/drills";
import { rotZone, stepZone, zoneCenter } from "../../src/geometry";
import { buildPattern } from "../../src/lib/practice";
import { PracticePage } from "../../src/pages/PracticePage";
import { useProgressStore } from "../../src/stores/progress";
import { useSlotStore } from "../../src/stores/slot";
import type { Point } from "../../src/types";

const FIRST = [...DRILLS].sort((a, b) => a.order - b.order)[0];
const CODE = "K7Q2";

beforeAll(() => {
  // happy-dom does no layout. A one-to-one screen matrix makes a click at (x, y) in the page the
  // spot (x, y) on the arena.
  Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", { configurable: true, value: () => new DOMMatrix() });
});
beforeEach(() => {
  useSlotStore.setState({ slot: "H1" });
  useProgressStore.getState().reset();
});
afterEach(cleanup);

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}
function open(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/practice/:drill?/:code?" element={<PracticePage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}
const where = (): string | null => screen.getByTestId("where").textContent;
const arena = (): Element => screen.getByRole("img", { name: /Arena map/ });
const clickAt = (p: Point): boolean => fireEvent.click(arena(), { clientX: p[0], clientY: p[1] });

/** The correct spot of the first step of the first mechanic, for the test's code. */
function firstRightSpot(): Point {
  const pattern = buildPattern(FIRST, "H1", CODE);
  const base = stepZone(pattern.scene.steps[0], []);
  if (!base) throw new Error("no zone");
  return zoneCenter(rotZone(base, pattern.k));
}

test("the first mechanic is one step, which these tests rely on", () => {
  assert.equal(buildPattern(FIRST, "H1", CODE).scene.steps.length, 1);
});

test("Practice with no mechanic opens the first one with a new pattern code", () => {
  open("/practice");
  assert.match(where() ?? "", new RegExp(`^/practice/${FIRST.id}/[2-9A-HJ-NP-Z]{4}$`));
});

test("a link with a code keeps that pattern", () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  assert.equal(where(), `/practice/${FIRST.id}/${CODE}`);
  assert.ok(arena());
});

test("a correct click answers the step and counts in your score", () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  clickAt(firstRightSpot());
  assert.ok(screen.getByText("Correct", { selector: "[role=status]" }));
  assert.deepEqual(useProgressStore.getState().scores[FIRST.id], { seen: 1, correct: 1 });
  assert.ok(arena().querySelector(".zlabel"), "the correct spot is tagged");
});

test("Show me draws the spot, and a try with it does not count", async () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Show me" }));
  assert.ok(arena().querySelector(".zone.pick"), "the correct area shows in blue");
  assert.equal(screen.getByRole("button", { name: "Hide" }).getAttribute("aria-pressed"), "true");
  clickAt(firstRightSpot());
  assert.ok(screen.getByText("Correct", { selector: "[role=status]" }));
  assert.isUndefined(useProgressStore.getState().scores[FIRST.id]);
});

test("an incorrect spot says so and counts, and Again starts over", async () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  const user = userEvent.setup();
  clickAt([-40, -40]);
  assert.ok(screen.getAllByText("Not there").length > 0);
  assert.ok(arena().querySelector(".pick.bad"), "your click shows in red");
  assert.deepEqual(useProgressStore.getState().scores[FIRST.id], { seen: 1, correct: 0 });
  await user.click(screen.getAllByRole("button", { name: "Again" })[0]);
  assert.isNull(arena().querySelector(".pick"), "a fresh try");
  assert.equal(where(), `/practice/${FIRST.id}/${CODE}`, "the same pattern");
});

test("the mechanic's panel names what you do in it, and the list opens another mechanic with a new code", async () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  assert.ok(within(screen.getByRole("region", { name: "The mechanic" })).getByText("Spread"));
  const second = [...DRILLS].sort((a, b) => a.order - b.order)[1];
  await userEvent.setup().click(screen.getAllByRole("link", { name: new RegExp(`${second.title}$`) })[0]);
  assert.match(where() ?? "", new RegExp(`^/practice/${second.id}/[2-9A-HJ-NP-Z]{4}$`));
});
