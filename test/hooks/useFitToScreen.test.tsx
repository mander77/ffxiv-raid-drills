// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test, vi } from "vitest";
import { useFitToScreen } from "../../src/hooks/useFitToScreen";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Box() {
  const [ref, height] = useFitToScreen<HTMLDivElement>(50);
  return (
    <div ref={ref} data-testid="box">
      {height ?? "none"}
    </div>
  );
}

test("the room from the element's top to the bottom of the screen, less the room under it", () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 300, 100, 100));
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  render(<Box />);
  assert.equal(screen.getByTestId("box").textContent, "450");
  // A taller window gives more room.
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
  assert.equal(screen.getByTestId("box").textContent, "550");
});
