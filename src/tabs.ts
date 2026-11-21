// The tabs of the site, in the order a player learns the fight. Each rebuild step adds its tab
// here, with its page in src/pages/ and its route in App.tsx.

export interface TabInfo {
  /** The address of the tab, such as "/sheet". */
  path: string;
  label: string;
  /** The tab's one-line intro, at the top of its page. */
  lede: string;
}

export const TABS: readonly TabInfo[] = [
  { path: "/", label: "Home", lede: "Practice M11S, The Tyrant (Savage), as a healer, away from the raid." },
  { path: "/mech", label: "Learn", lede: "What each mechanic does, and what you do in it. Pick an answer to see it on the picture." },
  { path: "/next", label: "Timeline", lede: "Which mechanic comes next in the fight." },
  { path: "/sheet", label: "Cheat sheet", lede: "The rules and your timeline on one page." },
];

/** The tab of an address: "/mech/k-sword" is on the Learn tab, and only "/" is on Home. */
export const tabOf = (pathname: string): TabInfo | undefined =>
  TABS.find((t) => (t.path === "/" ? pathname === "/" : pathname === t.path || pathname.startsWith(`${t.path}/`)));
