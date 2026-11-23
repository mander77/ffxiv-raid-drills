// @vitest-environment happy-dom
// LineList: mechanic text as a list, one short line each.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { LineList } from "../../src/components/LineList";

afterEach(cleanup);

test("shows each line as a bulleted list item", () => {
  render(<LineList lines={["Stack north.", "Then spread."]} />);
  assert.equal(screen.getByRole("list").tagName, "UL");
  assert.deepEqual(
    screen.getAllByRole("listitem").map((li) => li.textContent),
    ["Stack north.", "Then spread."],
  );
});

test("numbers the lines when they happen in order", () => {
  render(<LineList lines={["Stack north.", "Then spread."]} ordered />);
  assert.equal(screen.getByRole("list").tagName, "OL");
});
