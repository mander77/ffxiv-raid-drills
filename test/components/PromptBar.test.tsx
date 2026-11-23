// @vitest-environment happy-dom
// PromptBar: the question and its buttons, then how the answer went, on every tab that asks.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { PromptBar } from "../../src/components/PromptBar";

afterEach(cleanup);

test("while the question is open, the bar shows the count, the question and the buttons", () => {
  const { container } = render(
    <PromptBar count="2/4" actions={<button type="button">Show me</button>}>
      Where do you stand?
    </PromptBar>,
  );
  assert.ok(screen.getByText("2/4"));
  assert.ok(screen.getByText("Where do you stand?"));
  assert.ok(screen.getByRole("button", { name: "Show me" }));
  assert.equal(container.querySelector("svg"), null, "no check mark or cross yet");
});

test("after the answer, a check mark when correct and a cross when not, and no count", () => {
  const { container } = render(
    <PromptBar tone="correct" count="2/4">
      Correct.
    </PromptBar>,
  );
  assert.ok(container.querySelector("svg.lucide-check"));
  assert.equal(screen.queryByText("2/4"), null);
  cleanup();
  const bad = render(<PromptBar tone="incorrect">Not there.</PromptBar>);
  assert.ok(bad.container.querySelector("svg.lucide-x"));
});
