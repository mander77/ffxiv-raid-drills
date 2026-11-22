// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { useSectionInView } from "../../src/hooks/useSectionInView";

afterEach(cleanup);

/** Where each heading's top is on the screen, in pixels; the test moves them to "scroll". */
const tops: Record<string, number> = { a: 500, b: 1500 };

function Page() {
  const inView = useSectionInView(["a", "b"], 100);
  return (
    <>
      <h2 id="a">A</h2>
      <h2 id="b">B</h2>
      <p data-testid="in-view">{inView ?? "none"}</p>
    </>
  );
}

/** Put the headings at these tops, as if the page scrolled, and tell the page. */
function scrollTo(a: number, b: number): void {
  tops.a = a;
  tops.b = b;
  for (const id of ["a", "b"]) {
    const el = document.getElementById(id);
    if (el) el.getBoundingClientRect = () => new DOMRect(0, tops[id], 100, 20);
  }
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

test("no section until the first heading reaches the offset, then the last one reached", () => {
  render(<Page />);
  scrollTo(500, 1500);
  assert.equal(screen.getByTestId("in-view").textContent, "none");
  scrollTo(100, 1100);
  assert.equal(screen.getByTestId("in-view").textContent, "a");
  scrollTo(-900, 50);
  assert.equal(screen.getByTestId("in-view").textContent, "b");
  // Back up above the first heading.
  scrollTo(400, 1400);
  assert.equal(screen.getByTestId("in-view").textContent, "none");
});
