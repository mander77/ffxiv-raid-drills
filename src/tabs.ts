// The tabs of the site, in the order a player learns the fight. Each rebuild step adds its tab
// here, with its page in src/pages/ and its route in App.tsx.

import { withoutFight } from "./fightScope";

export interface TabInfo {
  /** The address of the tab, such as "/sheet". */
  path: string;
  label: string;
  /** The tab's one-line intro, at the top of its page. */
  lede: string;
}

export const TABS: readonly TabInfo[] = [
  { path: "/", label: "Home", lede: "Practice a raid fight for your role, away from the raid." },
  { path: "/learn", label: "Learn", lede: "What each mechanic does, and what you do in it. Pick an answer to see it on the picture." },
  { path: "/practice", label: "Practice", lede: "Click where you stand. One mechanic at a time, no timer." },
  { path: "/timeline", label: "Timeline", lede: "Which mechanic comes next in the fight." },
  { path: "/pressure", label: "Pressure", lede: "The same questions, fast: timed questions, or the whole fight on the clock." },
  { path: "/sheet", label: "Cheat Sheet", lede: "Every mechanic with its picture, and your timeline, on one page." },
];

/** The tab of an address, with or without its fight: "/learn/k-sword" and "/m11s/learn/k-sword"
    are on the Learn tab, and only "/" and "/m11s" are on Home. */
export function tabOf(pathname: string): TabInfo | undefined {
  const page = withoutFight(pathname);
  return TABS.find((t) => (t.path === "/" ? page === "/" : page === t.path || page.startsWith(`${t.path}/`)));
}
