// @vitest-environment happy-dom
// AnswerButton: one answer on a question card, before and after you answer.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, test, vi } from "vitest";
import { AnswerButton } from "../../src/components/quiz/AnswerButton";

afterEach(cleanup);

test("an open answer can be clicked", async () => {
  const onClick = vi.fn();
  render(<AnswerButton n={1} text="Go north" state="open" onClick={onClick} onPoint={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: /Go north/ }));
  assert.equal(onClick.mock.calls.length, 1);
});

test("after the answer, your incorrect pick says so and the correct one says why", () => {
  render(
    <>
      <AnswerButton n={1} text="Go north" state="incorrect" onClick={() => {}} onPoint={() => {}} />
      <AnswerButton
        n={2}
        text="Go south"
        state="correct"
        why={["The boss faces north.", "His back is safe."]}
        onClick={() => {}}
        onPoint={() => {}}
      />
    </>,
  );
  assert.ok(screen.getByRole("button", { name: /Go north.*Your pick/ }).hasAttribute("disabled"));
  assert.ok(screen.getByRole("button", { name: /Go south.*Correct answer\.\s*The boss faces north\.\s*His back is safe\./ }));
  // Each line of the explanation is its own list item.
  assert.include(screen.getByText("His back is safe.").className, "list-item");
});
