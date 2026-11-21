// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import { StepChips } from "../../src/components/StepChips";

afterEach(cleanup);

test("one chip per step: ticks and crosses for answered steps, a mark on the next one", () => {
  render(<StepChips count={4} results={[{ok:true}, {ok:false}]} />);
  const chips = screen.getAllByRole("listitem").map(li => li.textContent);
  assert.deepEqual(chips, ["1 ✓", "2 ✗", "3", "4"]);
  assert.equal(screen.getByText("3").className, "chip now");
  assert.equal(screen.getByText("4").className, "chip");
});

test("draws the same markup as the text screens", () => {
  const {container} = render(<StepChips count={2} results={[{ok:true}]} />);
  assert.equal(container.innerHTML,
    '<ol class="chips" aria-label="Steps"><li><span class="chip ok">1 ✓</span></li><li><span class="chip now">2</span></li></ol>');
});
