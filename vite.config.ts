import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { FIGHTS } from "./src/data/fights/index.ts";

/** Writes the fights' short names into the page title in index.html, before Vite reads the page.
    The title stays in the HTML file, so link previews show it without running the app. */
function fightTitle(): Plugin {
  return {
    name: "fight-title",
    transformIndexHtml: { order: "pre", handler: (html) => html.replaceAll("%FIGHT_SHORT%", FIGHTS.map((f) => f.info.short).join(", ")) },
  };
}

/** The font files the first screen draws with: the Latin files of the two fonts in src/main.tsx. */
const FIRST_SCREEN_FONTS = [/^assets\/source-sans-3-latin-wght-normal-.+\.woff2$/, /^assets\/saira-condensed-latin-600-normal-.+\.woff2$/];

/** Adds a preload link for each first-screen font to the built page, so the browser fetches the
    fonts with the page and not only after it has run the JavaScript and read the CSS. The build
    gives the files hashed names, so the links come from the bundle. `npm run dev` gets none. */
function preloadFonts(): Plugin {
  return {
    name: "preload-fonts",
    transformIndexHtml: (_html, { bundle }) => {
      const files = Object.keys(bundle ?? {}).filter((file) => FIRST_SCREEN_FONTS.some((font) => font.test(file)));
      // A renamed font file would drop its preload without a word, so the build stops instead.
      if (bundle && files.length !== FIRST_SCREEN_FONTS.length) {
        throw new Error(`preload-fonts: expected ${FIRST_SCREEN_FONTS.length} font files, found: ${files.join(", ")}`);
      }
      return files.map((file) => ({
        tag: "link",
        attrs: { rel: "preload", href: `/${file}`, as: "font", type: "font/woff2", crossorigin: "" },
        injectTo: "head",
      }));
    },
  };
}

export default defineConfig({
  // React (JSX and fast refresh in `npm run dev`), Tailwind CSS, the fight's name in the title,
  // and the font preloads.
  plugins: [react(), tailwindcss(), fightTitle(), preloadFonts()],
  // "@/components/ui/button" means src/components/ui/button. shadcn/ui writes its imports this way.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Asset paths from the domain root (/assets/...). The app uses real paths such as /learn/<card>,
  // so a relative path (./assets/...) would point inside that path and not find the files.
  base: "/",
  test: {
    // Unit and component tests. The Playwright browser tests in e2e/ run with `npm run e2e`.
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
