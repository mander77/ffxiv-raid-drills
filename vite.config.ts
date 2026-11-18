import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths, so the same build works at a domain root or under a sub-path.
  base: "./",
  test: {
    include: ["test/**/*.test.ts"]
  }
});
