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
