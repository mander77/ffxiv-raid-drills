import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // React (JSX and fast refresh in `npm run dev`) and Tailwind CSS.
  plugins: [react(), tailwindcss()],
  // "@/components/ui/button" means src/components/ui/button. shadcn/ui writes its imports this way.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Asset paths from the domain root (/assets/...). The app uses real paths such as /mech/k-sword,
  // so a relative path (./assets/...) would point inside that path and not find the files.
  base: "/",
  test: {
    // Unit and component tests. The Playwright browser tests in e2e/ run with `npm run e2e`.
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
