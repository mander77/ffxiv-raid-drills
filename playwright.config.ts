// Browser tests: `npm run e2e`. Playwright starts the dev server on its own port and opens the site
// in Chromium, Firefox and WebKit (the engine of Safari).
// The first time on a computer, download the browsers: `npx playwright install`.
import { defineConfig, devices } from "@playwright/test";

/** A port of its own, so the tests can run next to `npm run dev`. */
const PORT = 5199;

export default defineConfig({
  testDir: "e2e",
  // Fail the run if a test.only was left in by mistake.
  forbidOnly: true,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Use a dev server that is already running on that port, if there is one.
    reuseExistingServer: true,
  },
});
