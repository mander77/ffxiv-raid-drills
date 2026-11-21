// @vitest-environment happy-dom
import { test, assert, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { Marks } from "../../src/components/Marks";
import { CatKey } from "../../src/components/CatKey";
import { marks } from "../../src/views/tlnav";
import { CATS, type Cat } from "../../src/data/abilities";

afterEach(cleanup);

test("Marks draws the same markup as marks()", () => {
  const cats = Object.keys(CATS).slice(0, 2) as Cat[];
  assert.equal(render(<Marks cats={cats} />).container.innerHTML, marks(cats));
  cleanup();
  assert.equal(render(<Marks cats={[]} />).container.innerHTML, marks([]), "a grey mark for no category");
});

test("CatKey names every category", () => {
  const {container} = render(<CatKey />);
  assert.deepEqual([...container.querySelectorAll(".cmkey > span")].map(s => s.textContent), Object.values(CATS));
});
