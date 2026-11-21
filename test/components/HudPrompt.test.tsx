// @vitest-environment happy-dom
import { test, assert, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import { HudPrompt } from "../../src/components/HudPrompt";

// common.ts loads core.ts, which looks up the #view element when it loads.
let hudPrompt: (count: string, text: string, button?: string) => string;
beforeAll(async () => {
  document.body.innerHTML = '<main id="view"></main>';
  ({ hudPrompt } = await import("../../src/views/common"));
});
afterEach(cleanup);

test("shows the count, the text and the button", () => {
  render(<HudPrompt count="2/4" text="Where do you stand?"><button type="button">Show me</button></HudPrompt>);
  assert.ok(screen.getByText("2/4"));
  assert.ok(screen.getByText("Where do you stand?"));
  assert.ok(screen.getByRole("button", {name:"Show me"}));
});

test("draws the same markup as hudPrompt", () => {
  const {container} = render(<HudPrompt count="1/1" text="Go"><button type="button" class="btn ghost">Show me</button></HudPrompt>);
  assert.equal(container.innerHTML, hudPrompt("1/1", "Go", '<button type="button" class="btn ghost">Show me</button>'));
});
