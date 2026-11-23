// @vitest-environment happy-dom
// ResultBar: how you did, over a Practice mechanic.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { ResultBar } from "../../src/components/ResultBar";

afterEach(cleanup);

test("a result bar shows what it says, with a check mark when correct and a cross when not", () => {
  const { container } = render(<ResultBar ok>All steps correct</ResultBar>);
  assert.ok(screen.getByText("All steps correct"));
  assert.ok(container.querySelector("svg.lucide-check"));
  cleanup();
  const bad = render(<ResultBar ok={false}>Not there.</ResultBar>);
  assert.ok(bad.container.querySelector("svg.lucide-x"));
});
