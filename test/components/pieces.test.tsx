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

test("RuleBox shows the rule under its heading", () => {
  render(<RuleBox rule="Stand <south>." />);
  assert.ok(screen.getByRole("alert"));
  assert.ok(screen.getByText("Rule"));
  assert.ok(screen.getByText("Stand <south>."), "text, not HTML");
});

test("LastAnswer says Correct or Not there, with the question and the correct answer", () => {
  render(<LastAnswer ok={true} question="Where?" answer="North." />);
  assert.ok(screen.getByText("Correct"));
  assert.match(screen.getByRole("alert").textContent ?? "", /Where\? North\./);
  cleanup();
  render(<LastAnswer ok={false} question="Where?" answer="North." />);
  assert.ok(screen.getByText("Not there"));
});

test("StepChips marks each answered step and the step you are on", () => {
  render(<StepChips count={4} results={[{ ok: true }, { ok: false }]} />);
  const steps = screen.getAllByRole("listitem").map((li) => li.getAttribute("aria-label"));
  assert.deepEqual(steps, ["Step 1, correct", "Step 2, incorrect", "Step 3, now", "Step 4"]);
});

test("SetupText shows in full at first, then folds with More and Less", async () => {
  render(<SetupText text="He jumps." folded={false} />);
  assert.isNull(screen.queryByRole("button"));
  cleanup();
  render(<SetupText text="He jumps." folded={true} />);
  const user = userEvent.setup();
  assert.include(screen.getByText("He jumps.").className, "line-clamp-2");
  assert.equal(screen.getByRole("button", { name: "More" }).getAttribute("aria-expanded"), "false");
  await user.click(screen.getByRole("button", { name: "More" }));
  assert.notInclude(screen.getByText("He jumps.").className, "line-clamp-2");
  const less = screen.getByRole("button", { name: "Less" });
  assert.equal(less.getAttribute("aria-expanded"), "true");
  assert.ok(
    document.getElementById(less.getAttribute("aria-controls") ?? "")?.textContent?.includes("He jumps."),
    "the button controls the text",
  );
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
    <ChipRow label="Go to a mechanic">
      <button type="button">A</button>
    </ChipRow>,
  );
  const row = screen.getByRole("group", { name: "Go to a mechanic" });
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
