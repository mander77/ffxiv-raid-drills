// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, assert, test } from "vitest";
import { TabMenu } from "../../src/components/TabMenu";
import { TABS } from "../../src/tabs";

afterEach(cleanup);

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

test("the button names the tab you are on, and opens every tab", async () => {
  render(
    <MemoryRouter initialEntries={["/learn/k-sword"]}>
      <TabMenu />
      <Where />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const button = screen.getByRole("button", { name: /You are on Learn/ });
  assert.equal(button.textContent, "Learn");
  await user.click(button);
  const links = screen.getAllByRole("link");
  assert.deepEqual(
    links.map((a) => a.textContent),
    TABS.map((t) => t.label),
  );
  assert.equal(screen.getByRole("link", { name: "Learn" }).getAttribute("aria-current"), "page");
});

test("a tap on a tab goes there and closes the list", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <TabMenu />
      <Where />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /You are on Home/ }));
  await user.click(screen.getByRole("link", { name: "Cheat sheet" }));
  assert.equal(screen.getByTestId("where").textContent, "/sheet");
  assert.equal(screen.queryByRole("dialog"), null);
  assert.ok(screen.getByRole("button", { name: /You are on Cheat sheet/ }));
});

test("a page that is not a tab shows Tabs on the button", () => {
  render(
    <MemoryRouter initialEntries={["/styles"]}>
      <TabMenu />
    </MemoryRouter>,
  );
  assert.equal(screen.getByRole("button", { name: "Tabs" }).textContent, "Tabs");
});
