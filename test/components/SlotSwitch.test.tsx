// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, test } from "vitest";
import { SlotSwitch } from "../../src/components/SlotSwitch";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import { useSlotStore } from "../../src/stores/slot";

beforeEach(() => useSlotStore.setState({ slot: "H1" }));
afterEach(cleanup);

function draw(): void {
  render(
    <TooltipProvider>
      <SlotSwitch />
    </TooltipProvider>,
  );
}

test("shows every role, with Healer picked and the others not available", () => {
  draw();
  const roles = screen.getByRole("radiogroup", { name: "Role" });
  const healer = screen.getByRole("radio", { name: "Healer" });
  assert.ok(roles.contains(healer));
  assert.equal(healer.getAttribute("aria-checked"), "true");
  for (const name of ["Tank", "Melee", "Ranged"]) assert.equal(screen.getByRole("radio", { name }).getAttribute("aria-disabled"), "true");
});

test("Group 2 switches the slot to H2", async () => {
  draw();
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: "2" }));
  assert.equal(useSlotStore.getState().slot, "H2");
  assert.equal(screen.getByRole("radio", { name: "2" }).getAttribute("aria-checked"), "true");
  // A second click on the picked group keeps it.
  await user.click(screen.getByRole("radio", { name: "2" }));
  assert.equal(useSlotStore.getState().slot, "H2");
});

test("a role that is not ready says so, and stays unpicked", async () => {
  draw();
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: "Tank" }));
  assert.ok((await screen.findAllByText("Tank drills: not yet available")).length > 0);
  assert.equal(screen.getByRole("radio", { name: "Healer" }).getAttribute("aria-checked"), "true");
  assert.equal(useSlotStore.getState().slot, "H1");
});
