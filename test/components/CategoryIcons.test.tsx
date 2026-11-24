// @vitest-environment happy-dom
// The icons of the ability categories: each category has its own icon, so no place tells them
// apart by colour alone.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { CATEGORY_ICON, CategoryIcons } from "../../src/components/CategoryIcons";
import { CategoryKey } from "../../src/components/CategoryKey";
import { CATEGORIES, type Category } from "../../src/data/abilities";

afterEach(cleanup);

const ALL = Object.keys(CATEGORIES) as Category[];

/** The lucide classes of the icons drawn in a container: what tells two icons apart. */
function iconClasses(container: HTMLElement): string[] {
  return [...container.querySelectorAll("svg")].map((svg) => [...svg.classList].find((c) => c.startsWith("lucide-")) ?? "");
}

test("every category has an icon, and no two categories share one", () => {
  const icons = ALL.map((c) => CATEGORY_ICON[c]);
  assert.equal(new Set(icons).size, ALL.length);
  const { container } = render(<CategoryIcons cats={ALL} />);
  assert.equal(new Set(iconClasses(container)).size, ALL.length);
});

test("a row with two categories shows both icons, in order", () => {
  const { container } = render(<CategoryIcons cats={["tank", "dodge"]} />);
  assert.deepEqual(iconClasses(container), ["lucide-tank-damage", "lucide-circle-arrow-up-right-exit"]);
});

test("a row with no category shows no icon", () => {
  const { container } = render(<CategoryIcons cats={[]} />);
  assert.equal(container.querySelector("svg"), null);
});

test("the key names every category beside its icon", () => {
  const { container } = render(<CategoryKey />);
  for (const c of ALL) assert.ok(screen.getByText(CATEGORIES[c]), c);
  assert.equal(container.querySelectorAll("svg").length, ALL.length);
});
