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
  { path: "/learn", label: "Learn", lede: "What each mechanic does, and what you do in it. Pick an answer to see it on the picture." },
  { path: "/practice", label: "Practice", lede: "Click where you stand. One mechanic at a time, no timer." },
  { path: "/timeline", label: "Timeline", lede: "Which mechanic comes next in the fight." },
  { path: "/pressure", label: "Pressure", lede: "The same questions, fast: timed questions, or the whole fight on the clock." },
  { path: "/sheet", label: "Cheat sheet", lede: "Every mechanic with its picture, and your timeline, on one page." },
];

/** The tab of an address: "/learn/k-sword" is on the Learn tab, and only "/" is on Home. */
export const tabOf = (pathname: string): TabInfo | undefined =>
  TABS.find((t) => (t.path === "/" ? pathname === "/" : pathname === t.path || pathname.startsWith(`${t.path}/`)));
