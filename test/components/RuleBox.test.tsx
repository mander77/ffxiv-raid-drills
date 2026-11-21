// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import { RuleBox } from "../../src/components/RuleBox";

afterEach(cleanup);

test("shows the rule as text, not as HTML", () => {
  render(<RuleBox text="Stand <here>" />);
  assert.ok(screen.getByText("Rule"));
  assert.ok(screen.getByText("Stand <here>"));
});

test("draws the same markup as the text screens", () => {
  const {container} = render(<RuleBox text="Stand south." />);
  assert.equal(container.innerHTML, '<div class="rule"><span>Rule</span><strong>Stand south.</strong></div>');
});
