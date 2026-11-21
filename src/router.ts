// Links for every screen: what the address bar shows, and what a link opens.
//
// Each screen has a real path, for example https://ffxiv-raid-drills.app/mech/k-sword. For any path
// that is not a file, Cloudflare serves index.html (see "not_found_handling" in wrangler.jsonc),
// and the app reads the path itself. Vite's dev server does the same.
//
//   /                              the landing screen
//   /mech/<card id>                a Mechanics card (/next works the same way)
//   /map[/<mechanic>[/<CODE>]]     Practice: a mechanic, with its pattern code if given
//   /pressure[/<CODE>[/<picks>]][?t=s]
//                                  Pressure; with a code, the full fight, its fight pattern picks
//                                  (raw=axe,set2=...) and, if paused, the moment in seconds
//   /sheet                         the Cheat sheet
//
// Anything else opens the landing screen. React Router (App.tsx) reads the path, and parseRoute
// turns it into a route for the old screens.
//
// TS note: this file imports only types from core.ts (`import type`), so it has no code that
// needs a page and the tests can run it.
import { FIGHT_END } from "./data/abilities";
import { isCode } from "./util";
import type { QuizCat } from "./core";

// TS note: Route is a discriminated union on `tab`, like Overlay in types.ts. After a check such
// as `r.tab === "map"`, TypeScript knows that r has `drill` and `code`.
export type Route =
  | { tab: "home" | "sheet" }
  | { tab: QuizCat; card?: string }
  | { tab: "map"; drill?: string; code?: string }
  | { tab: "pressure"; code?: string; picks?: string; t?: number };

const QUIZ_TABS: readonly string[] = ["mech", "next"];
// TS note: a type predicate (`name is QuizCat`). Where it returns true, TypeScript narrows
// `name` from string to QuizCat.
const isQuiz = (name: string): name is QuizCat => QUIZ_TABS.includes(name);

/** Drop the fields a link did not give, so a route holds only what the link names. */
// TS note: <T extends object> keeps the caller's exact type. Object.entries loses it, so the
// result is asserted back to T; that is safe here because only fields are removed.
function only<T extends object>(r: T): T {
  return Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== "")) as T;
}

/** The moment in a full-fight link, "?t=48.2", in seconds. Anything that is not a time in the fight
    (after the pull, up to the end of the fight clock) is left out. */
function parseT(query: string): number | undefined {
  const t = Number(new URLSearchParams(query).get("t") ?? "");
  return Number.isFinite(t) && t > 0 && t <= FIGHT_END ? t : undefined;
}

/** Read a link into a route: a path (/mech/k-sword), with a query if any. */
export function parseRoute(link: string): Route {
  const [path = "", query = ""] = link.split("?");
  const parts = path.replace(/^[#/]+/, "").replace(/\/+$/, "").split("/").map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  const [name = "", a = "", b = ""] = parts;
  // A pattern code only means something with its mechanic. The picks and the moment only mean
  // something with the exact fight, so they need the fight code.
  if(name === "map") return a && !isCode(a) ? only({tab:"map" as const, drill:a, code:isCode(b) ? b.toUpperCase() : undefined}) : {tab:"map"};
  if(name === "pressure") return isCode(a) ? only({tab:"pressure" as const, code:a.toUpperCase(), picks:b, t:parseT(query)}) : {tab:"pressure"};
  if(isQuiz(name)) return only({tab:name, card:a});
  if(name === "sheet") return {tab:name};
  return {tab:"home"};
}

/** Write a route as a path, starting with /. */
export function routeLink(r: Route): string {
  // Card ids, codes and picks use only letters, digits and - = , which a path can hold as they are.
  const add = (...parts: Array<string | undefined>): string => parts.filter(Boolean).map(p => "/" + p).join("");
  switch(r.tab){
    case "home": return "/";
    case "map": return "/map" + add(r.drill, r.drill ? r.code : undefined);
    case "pressure": return "/pressure" + add(r.code, r.code ? r.picks : undefined) + (r.code && r.t ? "?t=" + r.t : "");
    case "sheet": return "/" + r.tab;
    default: return "/" + r.tab + add(r.card);
  }
}

/** Show a route in the address bar, in place of the entry there now. An old screen calls it when it
    moves to another card of the same tab. It keeps the history entry's state, which React Router
    uses, and it never draws the screen again. */
export function showRoute(r: Route): void {
  const link = routeLink(r);
  if(location.pathname + location.search === link) return;
  try { history.replaceState(history.state, "", link); } catch { /* a sandboxed frame */ }
}

/** The tab a path belongs to: "/mech/k-sword" is on "mech". */
export const tabOf = (pathname: string): Route["tab"] => parseRoute(pathname).tab;

/** The link to a tab's first screen: "/" for Home, "/mech" for Learn. */
export const tabLink = (tab: Route["tab"]): string => tab === "home" ? "/" : "/" + tab;
