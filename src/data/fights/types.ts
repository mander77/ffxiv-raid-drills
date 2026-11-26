// What a fight gives the site: everything the tabs, the arena and the full fight read from it.
// Each fight has its own folder in src/data/fights/ and builds one FightData in its index.ts. The
// shared code never imports a fight's files; it reads the fight you are on (useFight) or the
// list of fights (FIGHTS in index.ts).
import type {
  Ability,
  Category,
  Choices,
  Drill,
  Fight,
  Overlay,
  Phase,
  Picture,
  Point,
  QuizItem,
  ReferenceEntry,
  Slot,
  TimelineEvent,
} from "../../types";

/** The fight's names, and the strats its positions follow (the group's wtfdig guide). */
export interface FightInfo {
  /** The fight's short name, such as "M11S". */
  short: string;
  /** The boss and the difficulty, such as "The Tyrant (Savage)". */
  full: string;
  /** The strats the positions follow, as wtfdig names them. */
  strats: readonly string[];
}

/** A guide or source the Cheat Sheet lists, with an optional note after it. */
export interface SourceLink {
  href: string;
  label: string;
  note?: string;
}

/** The sizes the shared arena drawing needs, in arena units (100 across). */
export interface ArenaSizes {
  /** The boss's hitbox ring. */
  hitbox: number;
  /** A tower's radius, when a tower overlay gives none. */
  tower: number;
  /** The safe square under a scythe weapon (half its side). */
  scytheSafe: number;
  /** A tornado's radius: the voidzone it puts on the floor. */
  tornado: number;
  /** When the arena splits in two: each platform's left and right edge, the half width of the
      drawing that shows both, how far outside the outer walls the tether portals stand, and how
      long a tether is before it counts as stretched. */
  split?: {
    platformX: Readonly<Record<"west" | "east", readonly [number, number]>>;
    halfWidth: number;
    portalOut: number;
    tetherStretch: number;
  };
}

/** One pick of the full fight in the player's Settings: its key, its label, and each value it
    can take with its text. An `order` pick (the order of the three weapons, for example) has its
    values as items joined by "-", and lists the items with their names. */
export interface ChoiceRow {
  key: string;
  label: string;
  options: readonly (readonly [string, string])[];
  order?: readonly (readonly [string, string])[];
}

/** The full fight on the clock, for Pressure. */
export interface FightClock {
  /** Every pick on "random". */
  random: Choices;
  /** The picks, in fight order. */
  rows: readonly ChoiceRow[];
  /** The line of the Settings sheet under "Fight <code>.": how to use the picks. */
  help: string;
  /** Choices from saved settings or a link. Anything unknown becomes "random". */
  clean: (x: unknown) => Choices;
  /** One fight. The same code and choices always build the same fight. */
  build: (s: Slot, code: string, choices: Choices) => Fight;
  /** The tanks and the hit on them, for a tank buster's name, with the boss at `boss`. */
  busterPieces: (name: string, boss: Point) => Overlay[];
}

/** One fight of the site. */
export interface FightData {
  /** Its name in an address, such as "m11s" in /m11s/learn. */
  id: string;
  info: FightInfo;
  /** Home's links: the strat guide, and the two sources of times and sizes. */
  links: { guide: string; cactbot: string; bossmod: string };
  /** The Cheat Sheet's guides and sources. */
  sources: readonly SourceLink[];
  arena: ArenaSizes;
  /** Practice. */
  drills: readonly Drill[];
  /** Learn: the cards, and the chips over a card (one per mechanic). */
  learnCards: readonly QuizItem[];
  learnGroups: readonly { name: string; ids: string[] }[];
  /** The Learn card whose answer picture Home shows, and the picture's name for a screen reader. */
  hero: { card: string; label: string };
  /** Learn's pictures, by card id. */
  pictures: Partial<Record<string, (s: Slot) => Picture>>;
  /** Timeline: the cards, and the rows of the cheat-sheet timeline. */
  timelineCards: readonly QuizItem[];
  timeline: readonly TimelineEvent[];
  /** The line under the Cheat Sheet's timeline: where its times come from. */
  timelineNote: string;
  /** The Cheat Sheet: every mechanic in fight order. */
  reference: readonly ReferenceEntry[];
  /** The ability list, one entry per phase, and every row with its phase. */
  phases: readonly { name: Phase; rows: Ability[] }[];
  abilities: readonly (Ability & { phase: Phase })[];
  /** A timeline row's categories, in the order of the colour key. */
  timelineCategories: (row: number) => Category[];
  /** The enrage, in seconds into the fight. */
  enrage: number;
  /** The full fight on the clock. */
  clock: FightClock;
}
