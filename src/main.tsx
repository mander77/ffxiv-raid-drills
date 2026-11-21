// Start-up. index.html loads this file. It draws the React app into <div id="root">.
// TS note: the browser cannot run TypeScript or JSX, so Vite compiles this file: on the fly for
// `npm run dev`, and into dist/assets/*.js for `npm run build`.

// TS note: importing a CSS file is a Vite feature, not TypeScript. Vite adds the styles to the page
// in development and writes them to one CSS file in the build.
import "./app.css";
// The fonts, bundled with the site so no request goes to a font service: the body text, and the
// condensed face for names, tabs and headings in one weight.
import "@fontsource-variable/source-sans-3";
import "@fontsource/saira-condensed/600.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// StrictMode runs extra checks during `npm run dev` only, such as drawing each component twice to
// find side effects. The built site skips them.
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
