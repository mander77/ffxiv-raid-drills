// @vitest-environment happy-dom
// Pressure: the start screen, a quick round, the run, and a shared link to the player.
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, assert, beforeAll, beforeEach, test } from "vitest";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import { RANDOM } from "../../src/data/fight";
import { playerLink } from "../../src/lib/pressure";
import { PressurePage } from "../../src/pages/PressurePage";
import { usePressureStore } from "../../src/stores/pressure";
import { useProgressStore } from "../../src/stores/progress";
import { useSlotStore } from "../../src/stores/slot";

beforeAll(() => {
  Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", { configurable: true, value: () => new DOMMatrix() });
});
beforeEach(() => {
  useSlotStore.setState({ slot: "H1" });
  useProgressStore.getState().reset();
  usePressureStore.setState({ secs: 6, stops: false, choices: RANDOM, speed: 1 });
});
afterEach(cleanup);

function Where() {
  const at = useLocation();
  return <output data-testid="where">{at.pathname + at.search}</output>;
}
function open(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pressure/:code?/:picks?" element={<PressurePage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
    // The app gives every tooltip one provider (App.tsx); the page needs it too.
    { wrapper: TooltipProvider },
  );
}
const where = (): string | null => screen.getByTestId("where").textContent;

test("the start screen offers the quick round and the full fight", () => {
  open("/pressure");
  assert.ok(screen.getByText("Timed questions"));
  assert.ok(screen.getByText("The whole fight on the clock"));
  assert.ok(screen.getByRole("button", { name: "Start the run" }));
  assert.ok(screen.getByRole("button", { name: "Watch the correct moves" }));
});

test("the seconds to decide are saved", async () => {
  open("/pressure");
  await userEvent.setup().click(screen.getByRole("radio", { name: "10" }));
  assert.equal(usePressureStore.getState().secs, 10);
});

test("a quick round asks 12 timed cards, and an answer counts in its score only", async () => {
  open("/pressure");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Start" }));
  assert.ok(screen.getByText(/Card 1 of 12/));
  assert.ok(screen.getByText("Read"), "the timer starts with the time to read");
  const answers = within(screen.getByRole("group", { name: "Answers" })).getAllByRole("button");
  await user.click(answers[0]);
  const scores = Object.values(useProgressStore.getState().scores.H1 ?? {});
  assert.deepEqual(
    scores.map((s) => s.seen),
    [1],
  );
  assert.equal(useProgressStore.getState().rounds.learn.done, 0, "no Learn round");
  await user.click(screen.getByRole("button", { name: "Next" }));
  assert.ok(screen.getByText(/Card 2 of 12/));
});

test("Start the run opens the run on /pressure, and Quit with no answer goes back", async () => {
  open("/pressure");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Start the run" }));
  assert.equal(where(), "/pressure");
  assert.ok(await screen.findByText(/Mechanic 1 of \d+/), "the first frame shows your progress");
  assert.ok(screen.getByRole("region", { name: "Casts coming up" }), "the casts coming up, as in the player");
  await user.click(screen.getByRole("button", { name: "Quit" }));
  assert.ok(screen.getByText("Timed questions"));
});

test("Watch the correct moves opens the player at a new fight's address", async () => {
  open("/pressure");
  await userEvent.setup().click(screen.getByRole("button", { name: "Watch the correct moves" }));
  assert.match(where() ?? "", /^\/pressure\/[2-9A-HJ-NP-Z]{4}$/);
  assert.ok(screen.getByRole("slider", { name: "Fight time" }));
});

test("a shared link opens the player paused at its moment, on its mechanic", () => {
  open("/pressure/K7Q2?t=46");
  assert.ok(screen.getByRole("button", { name: "Play" }), "paused");
  assert.ok(screen.getByRole("heading", { name: "Assault Evolved" }));
  assert.ok(screen.getByText(/Paused/));
});

test("the slider shows the fight time, and its keys are its own", async () => {
  open("/pressure/K7Q2?t=46");
  const user = userEvent.setup();
  const slider = screen.getByRole("slider", { name: "Fight time" });
  await waitFor(() => assert.equal(slider.getAttribute("aria-valuenow"), "46"));
  slider.focus();
  await user.keyboard("{ArrowRight}");
  // One step on, not 5 seconds: the window's arrow keys leave the slider alone.
  await waitFor(() => assert.equal(slider.getAttribute("aria-valuenow"), "46.1"));
  await user.keyboard(" ");
  assert.ok(screen.getByRole("button", { name: "Play" }), "Space on the slider does not play");
});

test("a tick under the slider names its mechanic, and a click goes there", async () => {
  open("/pressure/K7Q2?t=46");
  const user = userEvent.setup();
  const tick = screen.getByRole("button", { name: "Jump to Void Stardust again" });
  await user.hover(tick);
  assert.ok(await screen.findByRole("tooltip", { name: "Void Stardust again" }));
  await user.click(tick);
  assert.ok(screen.getByRole("heading", { name: "Void Stardust again" }));
});

test("a pick in Settings goes in the address, and the moment stays", async () => {
  open("/pressure/K7Q2?t=46");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Settings" }));
  assert.ok(screen.getByRole("heading", { name: "Fight pattern" }));
  const row = screen.getByRole("radiogroup", { name: "First Raw Steel Trophy" });
  await user.click(within(row).getByRole("radio", { name: "Axe" }));
  assert.equal(where(), "/pressure/K7Q2/raw=axe?t=46");
  assert.equal(usePressureStore.getState().choices.raw, "axe", "the pick is saved");
});

test("a link with a broken code opens the start screen", () => {
  open("/pressure/NOPE1");
  assert.equal(where(), "/pressure");
});

test("the player's address holds the code, the picks and the moment", () => {
  assert.equal(playerLink("K7Q2", RANDOM), "/pressure/K7Q2");
  assert.equal(playerLink("K7Q2", { ...RANDOM, raw: "axe", ult: "cw" }, 48.24), "/pressure/K7Q2/raw=axe,ult=cw?t=48.2");
});

test("between mechanics, Jump to next mechanic goes to the mechanic named above it", async () => {
  open("/pressure/K7Q2?t=66");
  // The panel fills in the next mechanic on the first frame of the fight clock.
  assert.ok(await screen.findByText(/Next mechanic: Void Stardust into the second weapons/));
  await userEvent.setup().click(screen.getByRole("button", { name: "Jump to next mechanic" }));
  assert.ok(screen.getByRole("heading", { name: "Void Stardust into the second weapons" }));
});
