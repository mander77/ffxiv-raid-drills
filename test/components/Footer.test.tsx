// @vitest-environment happy-dom
// Footer: the bottom of every page, with links to the pages that are not tabs.
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test } from "vitest";
import { Footer } from "../../src/components/Footer";

afterEach(cleanup);

test("the footer links to the styles page", () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  const nav = screen.getByRole("navigation", { name: "More pages" });
  assert.equal(within(nav).getByRole("link", { name: "Styles" }).getAttribute("href"), "/styles");
});

test("the footer says what the site is for and that it is not official", () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  const footer = screen.getByRole("contentinfo");
  assert.ok(within(footer).getByText("Practice fights you already studied, without being in the game."));
  assert.ok(within(footer).getByText("A fan site. Not affiliated with Square Enix."));
});
