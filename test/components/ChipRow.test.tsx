// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/preact";
import { ChipRow } from "../../src/components/ChipRow";

afterEach(cleanup);

test("is a labelled group that holds its chips", () => {
  render(<ChipRow label="Go to a mechanic"><button type="button">A</button><button type="button">B</button></ChipRow>);
  const row = screen.getByRole("group", {name:"Go to a mechanic"});
  assert.equal(row.className, "qchips");
  assert.equal(screen.getAllByRole("button").length, 2);
});

test("fades each edge that has more chips past it", async () => {
  render(<ChipRow label="Chips"><button type="button">A</button></ChipRow>);
  const row = screen.getByRole("group");
  // happy-dom does no layout, so give the row a size: 100 wide, with 300 of chips.
  Object.defineProperty(row, "clientWidth", {value:100});
  Object.defineProperty(row, "scrollWidth", {value:300});
  row.scrollLeft = 0;
  await fireEvent.scroll(row);
  assert.equal(row.className, "qchips fr", "more past the right edge only");
  row.scrollLeft = 100;
  await fireEvent.scroll(row);
  assert.equal(row.className, "qchips fl fr", "more past both edges");
  row.scrollLeft = 200;
  await fireEvent.scroll(row);
  assert.equal(row.className, "qchips fl", "more past the left edge only");
});
