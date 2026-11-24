// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test } from "vitest";
import { TabNav } from "../../src/components/TabNav";
import { TABS } from "../../src/tabs";

afterEach(cleanup);

test("one link per tab, and the tab of the address is marked", () => {
  render(
    <MemoryRouter initialEntries={["/sheet"]}>
      <TabNav />
    </MemoryRouter>,
  );
  const links = screen.getAllByRole("link");
  assert.deepEqual(
    links.map((a) => a.textContent),
    TABS.map((t) => t.label),
  );
  const sheet = screen.getByRole("link", { name: "Cheat Sheet" });
  assert.equal(sheet.getAttribute("href"), "/sheet");
  assert.equal(sheet.getAttribute("aria-current"), "page");
});
