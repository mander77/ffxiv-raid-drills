// Links for every screen: what the address bar shows, and what a link opens.
//
// Each screen has a real path, for example https://ffxiv-raid-drills.app/mech/k-sword. For any path
// that is not a file, Cloudflare serves index.html (see "not_found_handling" in wrangler.jsonc),
// and the app reads the path itself. Vite's dev server does the same.
//
//   /                              the landing screen
//   /mech/<card id>                a Mechanics card (/next, /death and /job work the same way)
//   /map/<drill id>[/<CODE>]       a drill in Step by step, with its pattern code if given
//   /map/ability/<n>               the card for row n of the fight list (counted from 1)
//   /fight[/<CODE>[/<picks>]]      Real time, with a fight code and fight pattern picks
//   /pressure, /sheet              the Pressure round and the Cheat sheet
//
// Anything else opens the landing screen. Old links put the route after a # (/#mech/k-sword,
// /#map/m-assault/K3PZ, /#fight/K3PZ/raw=axe). They still open the same screen, and the address
// bar then shows the real path.
//
// TS note: this file imports only types from core.ts (`import type`), so it has no code that
// needs a page and the tests can run it.
import { isCode } from "./util";
import type { QuizCat } from "./core";

// TS note: Route is a discriminated union on `tab`, like Overlay in types.ts. After a check such
// as `r.tab === "map"`, TypeScript knows that r has `drill` and `code`.
export type Route =
  | { tab: "home" | "pressure" | "sheet" }
  | { tab: QuizCat; card?: string }
  | { tab: "map"; drill?: string; code?: string; ability?: number }
  | { tab: "fight"; code?: string; picks?: string };

const QUIZ_TABS: readonly string[] = ["mech", "next", "death", "job"];
// TS note: a type predicate (`name is QuizCat`). Where it returns true, TypeScript narrows
// `name` from string to QuizCat.
const isQuiz = (name: string): name is QuizCat => QUIZ_TABS.includes(name);

/** Drop the fields a link did not give, so a route holds only what the link names. */
// TS note: <T extends object> keeps the caller's exact type. Object.entries loses it, so the
// result is asserted back to T; that is safe here because only fields are removed.
function only<T extends object>(r: T): T {
  return Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== "")) as T;
}

/** Read a link into a route: a path (/mech/k-sword) or an old # link (#mech/k-sword). */
export function parseRoute(link: string): Route {
  const parts = link.replace(/^[#/]+/, "").replace(/\/+$/, "").split("/").map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  const [name = "", a = "", b = ""] = parts;
  if(name === "map" && a === "ability") return /^[1-9]\d*$/.test(b) ? {tab:"map", ability:Number(b)} : {tab:"map"};
  if(name === "map") return only({tab:"map" as const, drill:a, code:isCode(b) ? b.toUpperCase() : undefined});
  if(name === "fight") return isCode(a) ? only({tab:"fight" as const, code:a.toUpperCase(), picks:b}) : {tab:"fight"};
  if(isQuiz(name)) return only({tab:name, card:a});
  if(name === "pressure" || name === "sheet") return {tab:name};
  return {tab:"home"};
}

/** The route in the address bar. An old link keeps its route after the #, so the # wins over the path. */
export function currentRoute(): Route {
  return parseRoute(location.hash.length > 1 ? location.hash : location.pathname);
}

/** Write a route as a path, starting with /. */
export function routeLink(r: Route): string {
  // Card ids, codes and picks use only letters, digits and - = , which a path can hold as they are.
  const add = (...parts: Array<string | undefined>): string => parts.filter(Boolean).map(p => "/" + p).join("");
  switch(r.tab){
    case "home": return "/";
    case "map": return r.ability ? "/map/ability/" + r.ability : "/map" + add(r.drill, r.drill ? r.code : undefined);
    case "fight": return "/fight" + add(r.code, r.code ? r.picks : undefined);
    case "pressure": case "sheet": return "/" + r.tab;
    default: return "/" + r.tab + add(r.card);
  }
}

/** Show a route in the address bar. With `push`, it adds a history entry, so the Back button
    returns to the screen before (a tab, a link). Without it, it replaces the entry (the next card
    of the same tab). It never draws the screen again. */
export function showRoute(r: Route, push = false): void {
  const link = routeLink(r);
  if(location.pathname === link && !location.hash) return;
  try {
    if(push) history.pushState(null, "", link);
    else history.replaceState(null, "", link);
  } catch { /* a sandboxed frame */ }
}
