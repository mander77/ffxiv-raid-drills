// @vitest-environment happy-dom
// Practice: a mechanic opens with a pattern code in the address, a click answers, Show me helps
// without counting, and an incorrect spot waits for Next step.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, assert, beforeAll, beforeEach, test } from "vitest";
import { TooltipProvider } from "../../src/components/ui/tooltip";
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
    // The app wraps every page in a TooltipProvider, for the icon buttons.
    { wrapper: TooltipProvider },
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
  assert.ok(screen.getByRole("img", { name: "Arena map. Click where you stand." }), "the arena says a click picks your spot");
});

test("a correct click answers the step and counts in your score", () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  clickAt(firstRightSpot());
  assert.ok(screen.getByText("Correct", { selector: "[role=status]" }));
  assert.deepEqual(useProgressStore.getState().scores.H1?.[FIRST.id], { seen: 1, correct: 1 });
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
  assert.isUndefined(useProgressStore.getState().scores.H1?.[FIRST.id]);
});

test("an incorrect spot says so and counts, and Reset starts over", async () => {
  open(`/practice/${FIRST.id}/${CODE}`);
  const user = userEvent.setup();
  clickAt([-40, -40]);
  assert.ok(screen.getAllByText("Not there").length > 0);
  assert.ok(arena().querySelector(".pick.bad"), "your click shows in red");
  assert.deepEqual(useProgressStore.getState().scores.H1?.[FIRST.id], { seen: 1, correct: 0 });
  await user.click(screen.getByRole("button", { name: "Reset" }));
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

/** Answers `steps` steps of the mechanic on screen with a click off every spot, and Next step after each. */
async function answerOff(steps: number): Promise<void> {
  const user = userEvent.setup();
  for (let s = 0; s < steps; s++) {
    clickAt([-40, -40]);
    const next = screen.queryByRole("button", { name: "Next step" });
    if (next) await user.click(next);
  }
}
const VOID = DRILLS.find((m) => m.id === "m-void");
const DANCE = DRILLS.find((m) => m.id === "m-dance");

test("Void Stardust has more steps than Dance of Domination after it, which the next tests rely on", () => {
  if (!VOID || !DANCE) throw new Error("no m-void or m-dance");
  assert.isAbove(buildPattern(VOID, "H1", CODE).scene.steps.length, buildPattern(DANCE, "H1", CODE).scene.steps.length);
});

for (const [how, go] of [
  ["Next mechanic", () => userEvent.setup().click(screen.getByRole("button", { name: "Next mechanic" }))],
  ["Enter", () => userEvent.setup().keyboard("{Enter}")],
] as const) {
  test(`${how} after a mechanic with many steps opens a shorter one at its first step`, async () => {
    if (!VOID || !DANCE) throw new Error("no m-void or m-dance");
    open(`/practice/${VOID.id}/${CODE}`);
    await answerOff(buildPattern(VOID, "H1", CODE).scene.steps.length);
    assert.ok(screen.getByRole("button", { name: "Next mechanic" }), "the mechanic is done");
    await go();
    assert.match(where() ?? "", new RegExp(`^/practice/${DANCE.id}/`));
    assert.ok(screen.getByRole("heading", { name: DANCE.title }));
    assert.ok(screen.getByRole("button", { name: "Show me" }), "the new mechanic asks its first step");
  });
}

test("a click in the list on a mechanic with fewer steps than you answered opens it at its first step", async () => {
  if (!VOID || !DANCE) throw new Error("no m-void or m-dance");
  open(`/practice/${VOID.id}/${CODE}`);
  await answerOff(3);
  await userEvent.setup().click(screen.getAllByRole("link", { name: new RegExp(`${DANCE.title}$`) })[0]);
  assert.match(where() ?? "", new RegExp(`^/practice/${DANCE.id}/`));
  assert.ok(screen.getByRole("heading", { name: DANCE.title }));
  assert.ok(screen.getByRole("button", { name: "Show me" }), "the new mechanic asks its first step");
});
