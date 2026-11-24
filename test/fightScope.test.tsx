// @vitest-environment happy-dom
// The fight in the address, with the site's one fight today: the addresses need no fight, the
// fight's own addresses work too, and the header shows no fight picker.
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test } from "vitest";
import { App } from "../src/App";
import { M11S } from "../src/data/fights/m11s";
import { inFight, scopeOf, withoutFight } from "../src/fightScope";
import { tabOf } from "../src/tabs";

afterEach(cleanup);

test("an address names its fight, or the one fight when it names none", () => {
  assert.deepEqual(scopeOf("/m11s/learn/k-sword"), { fight: M11S, base: "/m11s" });
  assert.deepEqual(scopeOf("/learn/k-sword"), { fight: M11S, base: "" });
  assert.deepEqual(scopeOf("/"), { fight: M11S, base: "" });
});

test("the page of an address, with and without its fight", () => {
  assert.equal(withoutFight("/m11s/learn/k-sword"), "/learn/k-sword");
  assert.equal(withoutFight("/m11s"), "/");
  assert.equal(withoutFight("/learn"), "/learn");
  assert.equal(inFight("/m11s", "/learn"), "/m11s/learn");
  assert.equal(inFight("/m11s", "/"), "/m11s");
  assert.equal(inFight("", "/"), "/");
  assert.equal(tabOf("/m11s/practice/m-assault/K7Q2")?.label, "Practice");
  assert.equal(tabOf("/m11s")?.label, "Home");
});

function open(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

test("with one fight, the tabs link with no fight in the address, and there is no picker", () => {
  open("/learn/k-sword");
  assert.ok(screen.getByText("The boss jumps to the SWORD. Where do you go?"));
  const tabs = within(screen.getAllByRole("navigation", { name: "Tabs" })[0]).getAllByRole("link");
  assert.equal(tabs[1].getAttribute("href"), "/learn");
  assert.isNull(screen.queryByRole("button", { name: /Fight:/ }));
  assert.ok(within(screen.getByRole("list", { name: "Fight and strats" })).getByText("M11S The Tyrant (Savage)"));
});

test("with one fight, its own address opens the same page", () => {
  open("/m11s/learn/k-sword");
  assert.ok(screen.getByText("The boss jumps to the SWORD. Where do you go?"));
  const tabs = within(screen.getAllByRole("navigation", { name: "Tabs" })[0]).getAllByRole("link");
  assert.equal(tabs[1].getAttribute("href"), "/m11s/learn");
});
