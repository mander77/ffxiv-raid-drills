import { defineConfig } from "vitest/config";

export default defineConfig({
  // Asset paths from the domain root (/assets/...). The app uses real paths such as /mech/k-sword,
  // so a relative path (./assets/...) would point inside that path and not find the files.
  base: "/",
  test: {
    include: ["test/**/*.test.ts"]
  }
});
