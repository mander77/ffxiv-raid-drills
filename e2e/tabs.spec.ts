// The site in every browser: each tab opens, a Learn card and a Timeline card can be answered,
// and the Group switch changes the slot.
import { expect, test } from "@playwright/test";
import { TABS } from "../src/tabs";

test("each tab opens from the header", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Tabs" });
  for (const t of TABS) {
    await tabs.getByRole("link", { name: t.label, exact: true }).click();
    // The link of the tab you are on is marked, and its page shows.
    await expect(tabs.getByRole("link", { name: t.label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("main")).not.toBeEmpty();
    // Every tab but Home starts with its one-line intro.
    if (t.path !== "/") await expect(page.getByText(t.lede)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("an address with no page opens Home", async ({ page }) => {
  await page.goto("/map/m-raw-axe");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Start here" })).toBeVisible();
});

test("a Learn card: pick an answer, lock it in, and go on", async ({ page }) => {
  await page.goto("/mech");
  await expect(page).toHaveURL(/\/mech\/[\w-]+$/);
  const first = page.url();
  // Wait for the card, so its keys listen before the test presses one.
  await expect(page.getByRole("button", { name: "Lock in answer" })).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByRole("img", { name: "Arena picture of answer 1." })).toBeVisible();
  await page.getByRole("button", { name: "Lock in answer" }).click();
  await expect(page.getByRole("img", { name: "Arena picture. The green area shows the answer." })).toBeVisible();
  await expect(page.getByText("Right answer.")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).not.toHaveURL(first);
});

test("a Timeline card: one click answers, and the coming names show", async ({ page }) => {
  await page.goto("/next");
  await expect(page.getByText("? ? ?").first()).toBeVisible();
  await page.getByRole("button", { name: /^1/ }).click();
  await expect(page.getByText("? ? ?")).toHaveCount(0);
  await expect(page.getByText("Right answer.")).toBeVisible();
});

test("the Group switch changes the slot on the Cheat sheet", async ({ page }) => {
  await page.goto("/sheet");
  await expect(page.getByText("Your timeline as H1")).toBeVisible();
  await page.getByRole("radio", { name: "2" }).click();
  await expect(page.getByText("Your timeline as H2")).toBeVisible();
  // The slot stays after a reload.
  await page.reload();
  await expect(page.getByText("Your timeline as H2")).toBeVisible();
});
