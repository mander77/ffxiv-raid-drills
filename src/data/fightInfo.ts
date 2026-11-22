// The fight the site trains, and the strats its positions follow (the group's wtfdig guide). The
// header, Home and the page title in index.html show these names; index.html writes them out by
// hand, so change it too.

export interface FightInfo {
  /** The fight's short name, such as "M11S". */
  short: string;
  /** The boss and the difficulty, such as "The Tyrant (Savage)". */
  full: string;
  /** The strats the positions follow, in the order wtfdig picks them. */
  strats: readonly string[];
}

export const FIGHT_INFO: FightInfo = {
  short: "M11S",
  full: "The Tyrant (Savage)",
  strats: ["Hector/Toxic", "Kindred No Buddies split", "Fixed (3CJ) Ecliptic"],
};
