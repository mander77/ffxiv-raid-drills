// @vitest-environment happy-dom
// The pieces that Learn, Practice and the full fight share.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, test } from "vitest";
import { ChipRow } from "../../src/components/ChipRow";
import { LastAnswer } from "../../src/components/LastAnswer";
import { RuleBox } from "../../src/components/RuleBox";
import { SetupText } from "../../src/components/SetupText";
import { StepChips } from "../../src/components/StepChips";
import { Tally } from "../../src/components/Tally";

afterEach(cleanup);

test("RuleBox shows the rule under its heading, one list item per line", () => {
  render(<RuleBox rule={["Stand <south>.", "Then go west."]} />);
  assert.ok(screen.getByRole("alert"));
  assert.ok(screen.getByText("Rule"));
  assert.ok(screen.getByText("Stand <south>."), "text, not HTML");
  const lines = screen.getAllByRole("listitem").map((li) => li.textContent);
  assert.deepEqual(lines, ["Stand <south>.", "Then go west."]);
});

test("LastAnswer says Correct or Not there, with the correct move as a list", () => {
  render(<LastAnswer ok={true} answer={["North.", "Stack on H1."]} />);
  assert.ok(screen.getByText("Correct"));
  assert.deepEqual(
    screen.getAllByRole("listitem").map((li) => li.textContent),
    ["North.", "Stack on H1."],
  );
  cleanup();
  render(<LastAnswer ok={false} answer={["North."]} />);
  assert.ok(screen.getByText("Not there"));
});

test("StepChips marks each answered step and the step you are on", () => {
  render(<StepChips count={4} results={[{ ok: true }, { ok: false }]} />);
  const steps = screen.getAllByRole("listitem").map((li) => li.getAttribute("aria-label"));
  assert.deepEqual(steps, ["Step 1, correct", "Step 2, incorrect", "Step 3, now", "Step 4"]);
});

test("StepChips in review are buttons: a click or an arrow key goes to a step, and the one shown is marked", async () => {
  const picked: number[] = [];
  render(<StepChips count={3} results={[{ ok: true }, { ok: false }]} at={1} onPick={(i) => picked.push(i)} />);
  const chips = screen.getAllByRole("button");
  assert.deepEqual(
    chips.map((b) => b.getAttribute("aria-label")),
    ["Step 1, correct", "Step 2, incorrect", "Step 3"],
  );
  assert.equal(chips[1].getAttribute("aria-current"), "step");
  const user = userEvent.setup();
  await user.click(chips[0]);
  await user.keyboard("{ArrowRight}");
  await user.keyboard("{ArrowLeft}{ArrowLeft}");
  assert.deepEqual(picked, [0, 1, 0], "an arrow before the first step does nothing");
});

test("SetupText shows every line at once, with no button to open it", () => {
  render(<SetupText lines={["He jumps.", "He cleaves."]} />);
  assert.isNull(screen.queryByRole("button"));
  const list = screen.getByRole("list");
  assert.equal(list.tagName, "UL", "bulleted");
  assert.deepEqual(
    screen.getAllByRole("listitem").map((li) => li.textContent),
    ["He jumps.", "He cleaves."],
  );
});

test("SetupText numbers the lines when they happen in order", () => {
  render(<SetupText lines={["He jumps.", "He cleaves."]} ordered />);
  assert.equal(screen.getByRole("list").tagName, "OL");
});

test("Tally shows each count under its name", () => {
  render(<Tally correct={9} incorrect={2} missed={1} missedLabel="Froze" />);
  const count = (name: string): string | null | undefined => screen.getByText(name).nextElementSibling?.textContent;
  assert.equal(count("Correct"), "9");
  assert.equal(count("Incorrect"), "2");
  assert.equal(count("Froze"), "1");
});

test("ChipRow fades each edge that has more chips past it", async () => {
  render(
    <ChipRow label="Go to a Mechanic">
      <button type="button">A</button>
    </ChipRow>,
  );
  const row = screen.getByRole("group", { name: "Go to a Mechanic" });
  // happy-dom does no layout, so give the row a size: 100 wide, with 300 of chips.
  Object.defineProperty(row, "clientWidth", { value: 100 });
  Object.defineProperty(row, "scrollWidth", { value: 300 });
  row.scrollLeft = 0;
  fireEvent.scroll(row);
  assert.include(row.className, "to_left");
  row.scrollLeft = 100;
  fireEvent.scroll(row);
  assert.include(row.className, "calc(100%-2rem)", "both edges");
  row.scrollLeft = 200;
  fireEvent.scroll(row);
  assert.include(row.className, "to_right,transparent,black_2rem)]");
});
