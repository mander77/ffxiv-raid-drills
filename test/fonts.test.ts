// The fallback fonts in src/app.css against the web font files. Each fallback face resizes Arial
// to take the same space as its web font, so the page does not move when the web font arrives.
// fontaine reads the metrics from the font file and works out the values the same way. When a
// font package update changes the file, this test fails: copy the face it prints into app.css.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { generateFontFace, getMetricsForFamily, readMetrics } from "fontaine";
import { expect, test } from "vitest";

const require = createRequire(import.meta.url);
const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

/** The web fonts the site uses, with the Latin file the first screen draws with. */
const FONTS = [
  { family: "Source Sans 3 Variable", file: "@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2" },
  { family: "Saira Condensed", file: "@fontsource/saira-condensed/files/saira-condensed-latin-600-normal.woff2" },
];

/** The descriptors of one @font-face rule in app.css, by its family name. */
function fontFace(family: string): Record<string, string> {
  const rule = css.match(new RegExp(`@font-face\\s*{\\s*font-family:\\s*"${family}";([^}]*)}`));
  expect(rule, `no @font-face for "${family}" in app.css`).not.toBeNull();
  return Object.fromEntries(
    (rule?.[1] ?? "")
      .split(";")
      .map((line) => line.split(":").map((part) => part.trim()))
      .filter(([name]) => name),
  );
}

test.each(FONTS)("the $family fallback takes the same space as the web font", async ({ family, file }) => {
  const metrics = await readMetrics(pathToFileURL(require.resolve(file)));
  const arial = await getMetricsForFamily("Arial");
  expect(metrics).not.toBeNull();
  expect(arial).not.toBeNull();
  if (!metrics || !arial) return;
  const expected = generateFontFace(metrics, { name: `${family} fallback`, font: "Arial", metrics: arial });
  const face = fontFace(`${family} fallback`);
  for (const name of ["size-adjust", "ascent-override", "descent-override", "line-gap-override"]) {
    const value = expected.match(new RegExp(`${name}: ([^;]+);`))?.[1];
    expect(face[name], `${name} of "${family} fallback". fontaine writes:\n${expected}`).toBe(value);
  }
});

test.each(FONTS)("the $family fallback comes right after the web font in the theme", ({ family }) => {
  expect(css).toContain(`"${family}", "${family} fallback",`);
});
