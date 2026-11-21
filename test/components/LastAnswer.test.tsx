// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import { LastAnswer } from "../../src/components/LastAnswer";

afterEach(cleanup);

test("a right answer says Right, with the question and the answer", () => {
  render(<LastAnswer ok={true} q="Where?" a="North." />);
  assert.ok(screen.getByText("Right"));
  assert.ok(screen.getByText("Where?"));
  assert.match(screen.getByText("Where?").parentElement?.textContent ?? "", /North\.$/);
});

test("a wrong answer says Not there", () => {
  render(<LastAnswer ok={false} q="Where?" a="North." />);
  assert.ok(screen.getByText("Not there"));
});

test("draws the same markup as the text screens", () => {
  const {container} = render(<LastAnswer ok={false} q="Where?" a="North." />);
  assert.equal(container.innerHTML, '<div class="lastans bad"><span class="tag">Not there</span><b>Where?</b> North.</div>');
});
