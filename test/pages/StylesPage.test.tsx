// @vitest-environment happy-dom
// The styles page: every icon of icons.tsx is on it, so a new icon cannot be left off.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, test } from "vitest";
import * as icons from "../../src/components/icons";
import { KINDS } from "../../src/components/MechanicIcon";
import { StylesPage } from "../../src/pages/StylesPage";

afterEach(cleanup);

/** The lucide class of an icon, "lucide-check" for the check mark: what tells two icons apart. */
function lucideClass(Icon: icons.LucideIcon): string {
  const { container } = render(<Icon />);
  const name = [...(container.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-"));
  cleanup();
  assert.ok(name, "an icon has a lucide- class");
  return name;
}

test("the styles page shows every icon of icons.tsx", () => {
  // TS note: Object.entries of a module gives each named export with its name. LucideIcon is only
  // a type, so it is not among them.
  const wanted = Object.entries(icons).map(([name, Icon]) => [name, lucideClass(Icon as icons.LucideIcon)]);
  const { container } = render(<StylesPage />);
  for (const [name, cls] of wanted) assert.ok(container.querySelector(`svg.${cls}`), `${name} is on the page`);
});

test("the styles page shows how an answer looks, with the site's own components", () => {
  render(<StylesPage />);
  for (const name of ["Answers Before You Answer", "Answers After You Answer", "Prompt Bar", "Last Answer", "Steps", "Rule", "Tally"])
    assert.ok(screen.getByRole("heading", { name }));
  assert.ok(screen.getByRole("button", { name: /Your incorrect pick.*Your pick/ }));
  assert.ok(screen.getByRole("list", { name: "Steps" }));
});

test("the styles page names every kind of mechanic and the boss's weapons", () => {
  render(<StylesPage />);
  for (const { name } of Object.values(KINDS)) assert.ok(screen.getByRole("heading", { name }));
  for (const name of ["Axe", "Scythe", "Sword"]) assert.ok(screen.getByRole("heading", { name }));
});

test("related kinds of mechanic sit together, under one heading", () => {
  render(<StylesPage />);
  const tethers = screen.getByRole("heading", { level: 2, name: "Tethers" }).closest("section");
  assert.ok(tethers);
  const names = [...tethers.querySelectorAll("h3")].map((h) => h.textContent);
  assert.deepEqual(names, ["Chains (Break Your Chains)", "Pair Tether"]);
});

test("a click on an icon's card opens it zoomed in, in a dialog named after it", async () => {
  render(<StylesPage />);
  await userEvent.click(screen.getByRole("button", { name: "Wild Charge" }));
  const dialog = screen.getByRole("dialog", { name: "Wild Charge" });
  assert.ok(dialog.querySelector("svg.lucide-wild-charge"));
});

test("the styles page shows the tether beside the guide, short and stretched", () => {
  render(<StylesPage />);
  const lines = screen.getByRole("heading", { level: 2, name: "Lines on the Arena" }).closest("section");
  assert.ok(lines);
  assert.deepEqual(
    [...lines.querySelectorAll("h3")].map((h) => h.textContent),
    ["Guide", "Tether", "Stretched Tether", "Portal"],
  );
  assert.ok(lines.querySelector(".tether:not(.stretched)"), "a red tether");
  assert.ok(lines.querySelector(".tether.stretched"), "a blue tether");
  assert.ok(lines.querySelector(".guide"), "a guide");
});

test("the styles page draws each standard attack, and the mark of an unknown size", () => {
  render(<StylesPage />);
  const attacks = screen.getByRole("heading", { level: 2, name: "Standard Attacks" }).closest("section");
  assert.ok(attacks);
  assert.deepEqual(
    [...attacks.querySelectorAll("h3")].map((h) => h.textContent),
    [
      "Raidwide",
      "Circle",
      "Donut",
      "Cone",
      "Proteans",
      "Line",
      "Cross",
      "Half Arena",
      "Knockback Arrows",
      "Puddle",
      "Tower to Soak",
      "Size Unknown",
    ],
  );
  assert.ok(attacks.querySelector(".unknown"), "the size unknown mark");
  assert.equal(attacks.querySelector(".tower text")?.textContent, "2", "a tower shows its soak count");
});

test("a kind of mechanic shows the standard attack it resolves with, where one fits", () => {
  render(<StylesPage />);
  const card = (name: string) => screen.getByRole("heading", { level: 3, name }).closest("li");
  assert.ok(card("Line Stack")?.textContent?.includes("Attack: Line"));
  assert.ok(card("Puddle Drop Sequence")?.querySelector(".puddle"), "the puddle beside the icon");
  const proteans = card("Proteans (Clock Spots)");
  assert.equal(proteans?.querySelectorAll("polygon.aoe").length, 8, "eight cones beside the icon");
  assert.ok(proteans?.querySelector(".bosscore"), "out from the boss");
  assert.notInclude(card("Pair Tether")?.textContent ?? "", "Attack:", "a tether has no one attack");
});
