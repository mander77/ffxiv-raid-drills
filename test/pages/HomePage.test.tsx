// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test } from "vitest";
import { HomePage } from "../../src/pages/HomePage";
import { useSlotStore } from "../../src/stores/slot";

afterEach(cleanup);

test("Home links to the tabs that exist, in order, and shows your slot", () => {
  useSlotStore.setState({ slot: "H2" });
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  const cards = screen.getAllByRole("listitem").map((li) => li.querySelector("a")?.getAttribute("href"));
  assert.deepEqual(cards, ["/learn", "/practice", "/timeline", "/pressure", "/sheet"]);
  assert.match(screen.getByText(/You are set as/).textContent ?? "", /You are set as H2./);
  assert.ok(screen.getByRole("img", { name: /your spot is the green area/ }));
  assert.ok(screen.getByRole("img", { name: /My character/ }));
  assert.ok(screen.getByText(/The answers follow Hector \(Toxic\), Hector No Buddies and Fixed \(3CJ\)\.$/));
  assert.ok(screen.getByText("Today: M11S healers. Coming later: ranged, melee, tanks and more fights."));
});
