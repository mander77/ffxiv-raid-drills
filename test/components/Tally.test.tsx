// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import { Tally } from "../../src/components/Tally";

afterEach(cleanup);

test("shows each count under its name", () => {
  render(<Tally right={9} wrong={2} missed={1} missedLabel="Too slow" />);
  const count = (name: string): string | null | undefined => screen.getByText(name).nextElementSibling?.textContent;
  assert.equal(count("Right"), "9");
  assert.equal(count("Wrong"), "2");
  assert.equal(count("Too slow"), "1");
});

test("draws the same markup as the text screens", () => {
  const {container} = render(<Tally right={9} wrong={2} missed={1} missedLabel="Froze" />);
  assert.equal(container.innerHTML,
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">9</div></div><div class="bad"><span>Wrong</span><div class="big">2</div></div>' +
    '<div class="slow"><span>Froze</span><div class="big">1</div></div></div>');
});
