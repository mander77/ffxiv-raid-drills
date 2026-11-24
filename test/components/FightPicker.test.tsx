// @vitest-environment happy-dom
// FightPicker, FightChooser and FightGate: the site with two fights: M11S and a made-up test fight (test/fixtures/testFight), added to the
// list of fights and nowhere else. Each fight's pages start with its id, an address with no fight
// asks you to pick one, and the header has a fight picker.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, assert, beforeAll, test, vi } from "vitest";
import { App } from "../../src/App";
import type { FightData } from "../../src/data/fights/types";

vi.mock("../../src/data/fights", async () => {
  const { M11S } = await import("../../src/data/fights/m11s");
  const { TEST_FIGHT } = await import("../fixtures/testFight");
  const FIGHTS: readonly FightData[] = [M11S, TEST_FIGHT];
  return { FIGHTS, fightById: (id: string | undefined) => FIGHTS.find((f) => f.id === id) };
});

beforeAll(() => {
  Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", { configurable: true, value: () => new DOMMatrix() });
});
afterEach(cleanup);

function Where() {
  const at = useLocation();
  return <output data-testid="where">{at.pathname}</output>;
}
function open(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  );
}
const where = (): string => screen.getByTestId("where").textContent ?? "";

test("an address with no fight asks for one, then opens the same page in it", async () => {
  open("/learn/k-sword");
  assert.ok(screen.getByRole("heading", { name: "Pick a Fight" }));
  await userEvent.setup().click(screen.getByRole("link", { name: /M11S/ }));
  assert.equal(where(), "/m11s/learn/k-sword");
  assert.ok(screen.getByText("The boss jumps to the SWORD. Where do you go?"));
});

test("Home with no fight asks for one too", () => {
  open("/");
  assert.ok(screen.getByRole("heading", { name: "Pick a Fight" }));
  assert.ok(screen.getByRole("link", { name: /TEST/ }));
});

test("every tab of the test fight opens from its own address, with its links inside the fight", () => {
  open("/test");
  assert.ok(screen.getByRole("img", { name: "Test Spread on the arena" }), "Home shows the fight's own picture");
  const tabs = within(screen.getAllByRole("navigation", { name: "Tabs" })[0]).getAllByRole("link");
  assert.deepEqual(
    tabs.map((a) => a.getAttribute("href")),
    ["/test", "/test/learn", "/test/practice", "/test/timeline", "/test/pressure", "/test/sheet"],
  );
  cleanup();
  open("/test/learn");
  assert.equal(where(), "/test/learn/t-learn");
  assert.ok(screen.getByText("Test Spread: where do you go?"));
  cleanup();
  open("/test/practice");
  assert.match(where(), /^\/test\/practice\/t-spread\/[A-Z0-9]{4}$/);
  assert.ok(screen.getAllByText("Click your test spot.").length > 0);
  cleanup();
  open("/test/timeline");
  assert.equal(where(), "/test/timeline/n-0");
  cleanup();
  open("/test/sheet");
  assert.ok(screen.getByRole("link", { name: "Test guide" }));
  cleanup();
  open("/test/pressure");
  assert.ok(screen.getByRole("button", { name: "Start" }));
});

test("the header's fight picker opens the same tab in the other fight", async () => {
  open("/m11s/timeline/n-3");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Fight: M11S/ }));
  await user.click(screen.getByRole("menuitem", { name: /TEST/ }));
  assert.equal(where(), "/test/timeline/n-0");
});

test("an unknown fight opens the fight list", () => {
  open("/nope/learn");
  assert.equal(where(), "/");
  assert.ok(screen.getByRole("heading", { name: "Pick a Fight" }));
});
