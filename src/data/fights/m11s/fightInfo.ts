// The fight the site trains, and the strats its positions follow (the group's wtfdig guide). The
// header, Home and the page title show these names. The build writes the short name into the
// title in index.html (vite.config.ts), so link previews show it too.

export interface FightInfo {
  /** The fight's short name, such as "M11S". */
  short: string;
  /** The boss and the difficulty, such as "The Tyrant (Savage)". */
  full: string;
  /** The strats the positions follow, as wtfdig names them. */
  strats: readonly string[];
}

export const FIGHT_INFO: FightInfo = {
  short: "M11S",
  full: "The Tyrant (Savage)",
  strats: ["Hector (Toxic)", "Kindred No Buddies", "Fixed (3CJ)"],
};
