// @vitest-environment happy-dom
// IconButton: a button with only an icon, named for screen readers.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RotateCcw } from "lucide-react";
import { afterEach, assert, test, vi } from "vitest";
import { IconButton } from "../../src/components/IconButton";
import { TooltipProvider } from "../../src/components/ui/tooltip";

afterEach(cleanup);

test("an icon button has its label as its name, and a click calls it", async () => {
  const onClick = vi.fn();
  render(
    <IconButton label="Reset" onClick={onClick}>
      <RotateCcw aria-hidden="true" />
    </IconButton>,
    { wrapper: TooltipProvider },
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Reset" }));
  assert.equal(onClick.mock.calls.length, 1);
});
