import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { FIGHT_INFO } from "./src/data/fightInfo.ts";

/** Writes the fight's short name into the page title in index.html, before Vite reads the page.
    The title stays in the HTML file, so link previews show it without running the app. */
function fightTitle(): Plugin {
  return {
    name: "fight-title",
    transformIndexHtml: { order: "pre", handler: (html) => html.replaceAll("%FIGHT_SHORT%", FIGHT_INFO.short) },
  };
}

export default defineConfig({
  // React (JSX and fast refresh in `npm run dev`), Tailwind CSS, and the fight's name in the title.
  plugins: [react(), tailwindcss(), fightTitle()],
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
