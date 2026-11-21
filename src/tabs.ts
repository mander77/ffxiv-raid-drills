// The tabs of the site, in the order a player learns the fight. Each rebuild step adds its tab
// here, with its page in src/pages/ and its route in App.tsx.

export interface TabInfo {
  /** The address of the tab, such as "/sheet". */
  path: string;
  label: string;
  /** The tab's one-line intro, at the top of its page. */
  lede: string;
}

export const TABS: readonly TabInfo[] = [{ path: "/sheet", label: "Cheat sheet", lede: "The rules and your timeline on one page." }];

/** The tab of an address: "/sheet" is on the Cheat sheet tab. */
export const tabOf = (pathname: string): TabInfo | undefined => TABS.find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`));
