// @vitest-environment happy-dom
// The pieces that Learn, Practice and the full fight share.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, test } from "vitest";
import { ChipRow } from "../../src/components/ChipRow";
import { HudPrompt } from "../../src/components/HudPrompt";
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

test("LastAnswer says Right or Not there, with the question and the right answer", () => {
  render(<LastAnswer ok={true} question="Where?" answer="North." />);
  assert.ok(screen.getByText("Right"));
  assert.match(screen.getByRole("alert").textContent ?? "", /Where\? North\./);
  cleanup();
  render(<LastAnswer ok={false} question="Where?" answer="North." />);
  assert.ok(screen.getByText("Not there"));
});

test("StepChips marks each answered step and the step you are on", () => {
  render(<StepChips count={4} results={[{ ok: true }, { ok: false }]} />);
  const steps = screen.getAllByRole("listitem").map((li) => li.getAttribute("aria-label"));
  assert.deepEqual(steps, ["Step 1, right", "Step 2, wrong", "Step 3, now", "Step 4"]);
});

test("SetupText shows in full at first, then folds with More and Less", async () => {
  render(<SetupText text="He jumps." folded={false} />);
  assert.isNull(screen.queryByRole("button"));
  cleanup();
  render(<SetupText text="He jumps." folded={true} />);
  const user = userEvent.setup();
  const text = screen.getByText("He jumps.");
  assert.include(text.className, "line-clamp-2");
  await user.click(screen.getByRole("button", { name: "More" }));
  assert.notInclude(text.className, "line-clamp-2");
  assert.equal(screen.getByRole("button", { name: "Less" }).getAttribute("aria-expanded"), "true");
});

test("Tally shows each count under its name", () => {
  render(<Tally right={9} wrong={2} missed={1} missedLabel="Froze" />);
  const count = (name: string): string | null | undefined => screen.getByText(name).nextElementSibling?.textContent;
  assert.equal(count("Right"), "9");
  assert.equal(count("Wrong"), "2");
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

test("HudPrompt shows the count, the text and the button", () => {
  render(
    <HudPrompt count="2/4" text="Where do you stand?">
      <button type="button">Show me</button>
    </HudPrompt>,
  );
  assert.ok(screen.getByText("2/4"));
  assert.ok(screen.getByText("Where do you stand?"));
  assert.ok(screen.getByRole("button", { name: "Show me" }));
});
