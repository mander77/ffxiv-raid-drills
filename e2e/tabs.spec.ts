// The site in every browser: each tab opens, the header scrolls away on a phone, a Learn card and a Timeline card can be answered,
// the Group switch changes the slot, a click on Practice's list of mechanics opens one, and Pressure runs a quick round and a shared link to the player.
import { expect, type Locator, test } from "@playwright/test";
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

test("on a phone the header scrolls away, so the whole arena is in view", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/practice");
  // Scroll the arena to the top of the screen, where a sticky header would cover it.
  const arena = page.getByRole("img", { name: /^Arena/ }).first();
  await arena.evaluate((el) => el.scrollIntoView({ block: "start" }));
  // The page may end before the header is all gone; it is enough that it moved up out of the way.
  await expect(arena).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("banner")).not.toBeInViewport({ ratio: 0.5 });
});

test("on a phone one button opens the tabs, and a tab goes there", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/learn");
  // The row of tabs is hidden; the button names the tab you are on.
  await expect(page.getByRole("navigation", { name: "Tabs" })).toBeHidden();
  const button = page.getByRole("button", { name: "Tabs. You are on Learn" });
  await expect(button).toBeInViewport();
  await button.click();
  const sheet = page.getByRole("dialog", { name: "Tabs" });
  await sheet.getByRole("link", { name: "Cheat sheet" }).click();
  await expect(page).toHaveURL(/\/sheet$/);
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Tabs. You are on Cheat sheet" })).toBeVisible();
});

test("on a phone the tab button and the slot switch share one row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sheet");
  const button = await page.getByRole("button", { name: "Tabs. You are on Cheat sheet" }).boundingBox();
  const group = await page.getByRole("radiogroup", { name: "Group" }).boundingBox();
  // The same row: the switch sits on the button's line, not above it.
  expect(Math.abs((group?.y ?? 0) - (button?.y ?? 0))).toBeLessThan(8);
});

test("on a tall wide screen, Practice's list of mechanics runs on to the bottom of the screen", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.goto("/practice");
  const list = page.getByRole("navigation", { name: "Mechanics" });
  await expect(list).toBeVisible();
  const box = await list.boundingBox();
  // The arena is about 360 pixels tall here; the list goes on to the screen's bottom margin.
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(900);
  // The footer starts below it.
  const footer = await page.getByRole("contentinfo").boundingBox();
  expect(footer?.y ?? 0).toBeGreaterThanOrEqual((box?.y ?? 0) + (box?.height ?? 0));
});

test("on a wide screen, Next stays in view after a Learn card's answer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/learn/k-raw-first");
  await expect(page.getByRole("button", { name: "Lock in answer" })).toBeVisible();
  await page.keyboard.press("1");
  await page.getByRole("button", { name: "Lock in answer" }).click();
  // The card's own Next, under the answers: not the Next card button at the top.
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeInViewport({ ratio: 1 });
});

test("on a wide screen the header stays at the top", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/sheet");
  await page.evaluate(() => window.scrollBy(0, 600));
  await expect(page.getByRole("banner")).toBeInViewport();
});

test("an address with no page opens Home", async ({ page }) => {
  await page.goto("/mech/k-sword");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Start here" })).toBeVisible();
});

test("a Learn card: pick an answer, lock it in, and go on", async ({ page }) => {
  await page.goto("/learn");
  await expect(page).toHaveURL(/\/learn\/[\w-]+$/);
  const first = page.url();
  // Wait for the card, so its keys listen before the test presses one.
  await expect(page.getByRole("button", { name: "Lock in answer" })).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByRole("img", { name: "Arena picture of answer 1." })).toBeVisible();
  await page.getByRole("button", { name: "Lock in answer" }).click();
  await expect(page.getByRole("img", { name: "Arena picture. The green area shows the answer." })).toBeVisible();
  await expect(page.getByText("Correct answer.")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).not.toHaveURL(first);
});

test("in dark mode, the correct answer shows green and an incorrect pick red", async ({ page }) => {
  // With no saved choice, the site follows the computer's setting: dark here.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/learn/k-raw-first");
  await page.getByRole("button", { name: /The party stacks north/ }).click();
  await page.getByRole("button", { name: "Lock in answer" }).click();
  // The dark values of --success and --danger in app.css.
  await expect
    .poll(() => oklchOf(page.getByRole("button", { name: /Tanks spread, and the party stacks south/ })))
    .toEqual(closeTo(0.317, 0.05, 161.729));
  await expect.poll(() => oklchOf(page.getByRole("button", { name: /The party stacks north/ }))).toEqual(closeTo(0.27, 0.046, 24.727));
});

// The numbers of an element's oklch background colour. Browsers write them with more or fewer
// digits (WebKit: 161.729004), so the test compares them to 3 decimal places, as app.css writes them.
async function oklchOf(locator: Locator): Promise<number[]> {
  const color = await locator.evaluate((el) => getComputedStyle(el).backgroundColor);
  return (color.match(/^oklch\((.*)\)$/)?.[1] ?? "").split(" ").map(Number);
}

function closeTo(...numbers: number[]) {
  return numbers.map((n) => expect.closeTo(n, 3));
}

test("a Timeline card: one click answers, and the coming names show", async ({ page }) => {
  await page.goto("/timeline");
  await expect(page.getByText("? ? ?").first()).toBeVisible();
  await page.getByRole("button", { name: /^1/ }).click();
  await expect(page.getByText("? ? ?")).toHaveCount(0);
  await expect(page.getByText("Correct answer.")).toBeVisible();
});

test("on the Cheat sheet, the corner buttons go to the next section, the one before and the top", async ({ page }) => {
  await page.goto("/sheet");
  const go = page.getByRole("navigation", { name: "Go to a section" });
  await expect(go).toHaveCount(0);
  await page.getByText("Ecliptic puddles", { exact: true }).scrollIntoViewIfNeeded();
  await go.getByRole("link", { name: "↓ Panic reset" }).click();
  await expect(page.getByText("Feet: go to your spot for the next mechanic.")).toBeInViewport();
  await go.getByRole("link", { name: "↑ Phase 4" }).click();
  await expect(page.getByRole("heading", { name: "Phase 4: Ecliptic Stampede" })).toBeInViewport();
  await go.getByRole("link", { name: "↑ Top" }).click();
  await expect(page.getByRole("heading", { name: "Every mechanic as H1" })).toBeInViewport();
  await expect(go).toHaveCount(0);
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

test("Practice: a correct click and an incorrect click on the arena", async ({ page }) => {
  const { DRILLS } = await import("../src/data/drills");
  const { buildPattern } = await import("../src/lib/practice");
  const { rotZone, stepZone, zoneCenter } = await import("../src/geometry");
  const drill = DRILLS.find((m) => m.id === "m-raw-axe");
  if (!drill) throw new Error("no m-raw-axe");
  const code = "K7Q2";
  const pattern = buildPattern(drill, "H1", code);
  const zone = stepZone(pattern.scene.steps[0], []);
  if (!zone) throw new Error("no zone");
  const correct = zoneCenter(rotZone(zone, pattern.k));

  const arena = page.getByRole("img", { name: "Arena map. Click where you stand." });
  /** Click a spot given in arena units: the picture's own screen matrix turns it into pixels. */
  const clickAt = async (p: number[]): Promise<void> => {
    const at = await arena.evaluate((svg: SVGSVGElement, q) => {
      const m = svg.getScreenCTM();
      const s = new DOMPoint(q[0], q[1]).matrixTransform(m ?? undefined);
      return [s.x, s.y];
    }, p);
    await page.mouse.click(at[0], at[1]);
  };

  await page.goto(`/practice/${drill.id}/${code}`);
  await clickAt(correct);
  await expect(page.getByRole("status")).toHaveText("Correct");
  await page.getByRole("button", { name: "Reset" }).click();
  await clickAt([-3, -5]);
  await expect(page.getByRole("status")).toHaveText("Not there");
});

for (const [screen, width] of [
  ["a wide screen", 1280],
  ["a phone", 375],
] as const) {
  test(`Practice on ${screen}: a click on the list of mechanics opens one and leaves the list still`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/practice/m-assault/K7Q2");
    // One line shows at a time: beside the arena on a wide screen, sideways under it on a phone.
    const line = page.getByRole("navigation", { name: "Mechanics" }).filter({ visible: true });
    const link = line.getByRole("link", { name: "Raw Steel Trophy: scythe" });
    /** Where the mechanic sits inside the line, whatever the page's scroll. */
    const inLine = () =>
      link.evaluate((a: HTMLElement) => {
        const nav = a.closest("nav");
        return [a.offsetLeft - (nav?.scrollLeft ?? 0), a.offsetTop - (nav?.scrollTop ?? 0)];
      });
    const before = await inLine();
    await link.click();
    await expect(page).toHaveURL(/\/practice\/m-raw-scythe\/[^/]+$/);
    await expect(line.locator("[aria-current=step]")).toHaveText(/scythe/);
    // The mechanic you clicked stays under your pointer: the line does not move.
    expect(await inLine()).toEqual(before);
    // With a mouse, a drag along the line scrolls it, and opens nothing.
    const box = await line.boundingBox();
    if (!box) throw new Error("no line");
    const scroll = () => line.evaluate((el) => el.scrollTop + el.scrollLeft);
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(width === 375 ? x - 120 : x, width === 375 ? y : y - 120, { steps: 10 });
    await page.mouse.up();
    expect(await scroll()).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/practice\/m-raw-scythe\/[^/]+$/);
    // The page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test("Pressure: a quick round asks timed cards", async ({ page }) => {
  await page.goto("/pressure");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText("Card 1 of 12")).toBeVisible();
  await expect(page.getByText("Read", { exact: true })).toBeVisible();
  await page.getByRole("group", { name: "Answers" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Card 2 of 12")).toBeVisible();
});

test("Pressure: a shared link opens the player paused at its moment, and Space plays it", async ({ page }) => {
  await page.goto("/pressure/K7Q2?t=46");
  await expect(page.getByRole("heading", { name: "Assault Evolved" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Fight time" })).toHaveAttribute("aria-valuenow", "46");
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  // Playing, the address no longer holds a moment.
  await expect(page).toHaveURL(/\/pressure\/K7Q2$/);
});

test("Pressure: in the player, a click on a cast coming up pauses 3 seconds before it", async ({ page }) => {
  await page.goto("/pressure/K7Q2?t=25");
  await page.getByRole("region", { name: "Casts coming up" }).getByRole("button", { name: "Go to Assault Evolved 1" }).click();
  // Assault Evolved 1 goes off at 50.4, so the clock stops at 47.4.
  await expect(page).toHaveURL(/\/pressure\/K7Q2\?t=47\.4$/);
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});
