// Browser tests: `npm run e2e`. Playwright starts the site on its own port and opens it in
// Chromium, Firefox and WebKit (the engine of Safari).
// The first time on a computer, download the browsers: `npx playwright install`.
import { defineConfig, devices } from "@playwright/test";

/** A port of its own, so the tests can run next to `npm run dev`. */
const PORT = 5199;

/** GitHub Actions sets CI. */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  // Fail the run if a test.only was left in by mistake.
  forbidOnly: true,
  // Each test can go to any worker, not only each file, so the three browsers run side by side.
  fullyParallel: true,
  // The GitHub runner has 4 CPUs; Playwright's default uses half of them.
  workers: CI ? 4 : undefined,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // On CI, the built site, as it ships: the dev server builds each page on its first visit,
    // which made the first test in each browser slow. On your computer, the dev server.
    command: CI ? `npx vite build && npx vite preview --port ${PORT} --strictPort` : `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Use a server that is already running on that port, if there is one.
    reuseExistingServer: true,
  },
});
