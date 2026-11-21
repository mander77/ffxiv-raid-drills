// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/preact";
import { SetupText } from "../../src/components/SetupText";

afterEach(cleanup);

test("before the first answer it shows in full, with no button", () => {
  render(<SetupText text="He jumps." folded={false} />);
  assert.equal(screen.getByText("He jumps.").className, "setup");
  assert.isNull(screen.queryByRole("button"));
});

test("after the first answer it folds, and More and Less open and close it", async () => {
  render(<SetupText text="He jumps." folded={true} />);
  const text = screen.getByText("He jumps.");
  assert.equal(text.className, "setup folded");
  await fireEvent.click(screen.getByRole("button", {name:"More"}));
  assert.equal(text.className, "setup");
  await fireEvent.click(screen.getByRole("button", {name:"Less"}));
  assert.equal(text.className, "setup folded");
});

test("a new key starts the next mechanic folded", async () => {
  const {rerender} = render(<SetupText key="a" text="He jumps." folded={true} />);
  await fireEvent.click(screen.getByRole("button", {name:"More"}));
  rerender(<SetupText key="b" text="He spins." folded={true} />);
  assert.equal(screen.getByText("He spins.").className, "setup folded");
});
