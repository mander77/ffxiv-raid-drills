// @vitest-environment happy-dom
// The shared components must draw the same markup as the text versions the screens use today, so
// a screen looks the same when it moves to them.
import { test, assert, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/preact";
import type { ComponentChild } from "preact";
import { RuleBox, LastAnswer, StepChips, SetupText, Tally, ChipRow, HudPrompt } from "../src/views/parts";

// common.ts loads core.ts, which looks up the #view element when it loads.
let hudPrompt: (count: string, text: string, button?: string) => string;
beforeAll(async () => {
  document.body.innerHTML = '<main id="view"></main>';
  ({ hudPrompt } = await import("../src/views/common"));
});
afterEach(cleanup);

/** The HTML that a component draws. */
const html = (node: ComponentChild): string => render(node).container.innerHTML;

test("RuleBox draws the rule and escapes its text", () => {
  assert.equal(html(<RuleBox text="Stand <here>" />), '<div class="rule"><span>Rule</span><strong>Stand &lt;here&gt;</strong></div>');
});

test("LastAnswer draws a right and a wrong answer", () => {
  assert.equal(html(<LastAnswer ok={true} q="Where?" a="North." />), '<div class="lastans ok"><span class="tag">Right</span><b>Where?</b> North.</div>');
  cleanup();
  assert.equal(html(<LastAnswer ok={false} q="Where?" a="North." />), '<div class="lastans bad"><span class="tag">Not there</span><b>Where?</b> North.</div>');
});

test("StepChips marks answered steps and the step you are on", () => {
  assert.equal(html(<StepChips count={3} results={[{ok:true}]} />),
    '<ol class="chips" aria-label="Steps">' +
    '<li><span class="chip ok">1 ✓</span></li><li><span class="chip now">2</span></li><li><span class="chip">3</span></li></ol>');
  cleanup();
  assert.equal(html(<StepChips count={2} results={[{ok:true}, {ok:false}]} />),
    '<ol class="chips" aria-label="Steps"><li><span class="chip ok">1 ✓</span></li><li><span class="chip bad">2 ✗</span></li></ol>');
});

test("SetupText shows in full at first, then folds with More and Less", async () => {
  assert.equal(html(<SetupText text="He jumps." folded={false} />), '<p class="setup">He jumps.</p>');
  assert.isNull(screen.queryByRole("button"));
  cleanup();
  const {container} = render(<SetupText text="He jumps." folded={true} />);
  assert.equal(container.querySelector("p")?.className, "setup folded");
  await fireEvent.click(screen.getByRole("button", {name:"More"}));
  assert.equal(container.querySelector("p")?.className, "setup");
  await fireEvent.click(screen.getByRole("button", {name:"Less"}));
  assert.equal(container.querySelector("p")?.className, "setup folded");
});

test("Tally draws the three counts with the name of the third", () => {
  assert.equal(html(<Tally right={9} wrong={2} missed={1} missedLabel="Froze" />),
    '<div class="tally"><div class="ok"><span>Right</span><div class="big">9</div></div><div class="bad"><span>Wrong</span><div class="big">2</div></div>' +
    '<div class="slow"><span>Froze</span><div class="big">1</div></div></div>');
});

test("ChipRow scrolls the current chip to the middle and fades the edges with more past them", () => {
  const {container} = render(<ChipRow label="Go to a mechanic">
    <button type="button" class="qchip">A</button><button type="button" class="qchip" aria-current="true">B</button>
  </ChipRow>);
  const row = container.querySelector<HTMLElement>(".qchips");
  if(!row) throw new Error("no row");
  assert.equal(row.getAttribute("role"), "group");
  assert.equal(row.getAttribute("aria-label"), "Go to a mechanic");
  assert.equal(row.children.length, 2);
  // happy-dom does no layout, so give the row a size: 100 wide, 300 of content, scrolled to 0.
  Object.defineProperty(row, "clientWidth", {value:100});
  Object.defineProperty(row, "scrollWidth", {value:300});
  row.scrollLeft = 0;
  row.dispatchEvent(new Event("scroll"));
  assert.isFalse(row.classList.contains("fl"), "nothing past the left edge");
  assert.isTrue(row.classList.contains("fr"), "more past the right edge");
  row.scrollLeft = 200;
  row.dispatchEvent(new Event("scroll"));
  assert.isTrue(row.classList.contains("fl"));
  assert.isFalse(row.classList.contains("fr"));
});

test("HudPrompt draws the same as hudPrompt", () => {
  assert.equal(html(<HudPrompt count="2/4" text="Where do you stand?" />), hudPrompt("2/4", "Where do you stand?"));
  cleanup();
  assert.equal(html(<HudPrompt count="1/1" text="Go"><button type="button" class="btn ghost">Show me</button></HudPrompt>),
    hudPrompt("1/1", "Go", '<button type="button" class="btn ghost">Show me</button>'));
});
