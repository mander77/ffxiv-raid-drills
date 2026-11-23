// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { StickyBar } from "../../src/components/StickyBar";

afterEach(cleanup);

test("a sticky bar holds its bar, and sticks only below lg", () => {
  render(
    <StickyBar>
      <p>The question.</p>
    </StickyBar>,
  );
  const band = screen.getByText("The question.").parentElement as HTMLElement;
  assert.include(band.className, "max-lg:sticky");
  assert.notInclude(band.className.replace(/max-lg:\S+/g, ""), "sticky");
});
