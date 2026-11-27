// M11S, The Tyrant (Savage), as the site reads it: one FightData built from the files in this
// folder. The files keep their own names and shapes; this file only joins them up.
import type { Choices, Fight, Slot } from "../../../types";
import type { FightData } from "../types";
import { ABILITIES, categoriesAt, ENRAGE, PHASES, timelineCategories } from "./abilities";
import {
  busterPieces,
  floorAttacks,
  HITBOX,
  PLATFORM_X,
  PORTAL_OUT,
  SCYTHE_SAFE,
  SPLIT_HALF_W,
  TETHER_STRETCH,
  TORNADO_R,
  TOWER_R,
} from "./attacks";
import { DRILLS } from "./drills";
import { buildFight, buildHits, CHOICE_ROWS, cleanChoices, RANDOM } from "./fight";
import { FIGHT_INFO } from "./fightInfo";
import { LEARN_PICTURES } from "./pictures";
import { LEARN_CARDS, LEARN_GROUPS, TIMELINE_CARDS } from "./questions";
import { REFERENCE } from "./reference";
import { BOSSMOD, CACTBOT, SOURCES, WTFDIG } from "./sources";
import { TIMELINE } from "./timeline";

/** The three weapons, for the weapon order picks: each one's value and its name. */
const WEAPONS = [
  ["sword", "Sword"],
  ["axe", "Axe"],
  ["scythe", "Scythe"],
] as const;

/** The full fight as the engine uses it: every hit, and each timeline line with the categories
    of its abilities. */
function build(s: Slot, code: string, choices: Choices): Fight {
  const f = buildFight(s, code, cleanChoices(choices));
  return {
    segs: f.segs,
    events: f.events.map((e) => ({ ...e, cats: categoriesAt(e.t) })),
    hits: buildHits(f),
    end: f.end,
    split: f.split,
    join: f.join,
    gone: f.gone,
    summary: f.summary,
    code: f.code,
    choices: f.choices,
  };
}

export const M11S: FightData = {
  id: "m11s",
  info: FIGHT_INFO,
  links: { guide: WTFDIG, cactbot: CACTBOT, bossmod: BOSSMOD },
  sources: SOURCES,
  arena: {
    hitbox: HITBOX,
    tower: TOWER_R,
    scytheSafe: SCYTHE_SAFE,
    tornado: TORNADO_R,
    split: { platformX: PLATFORM_X, halfWidth: SPLIT_HALF_W, portalOut: PORTAL_OUT, tetherStretch: TETHER_STRETCH },
  },
  drills: DRILLS,
  learnCards: LEARN_CARDS,
  learnGroups: LEARN_GROUPS,
  hero: { card: "k-raw-first", label: "Raw Steel Trophy on the arena: your spot is the green area" },
  pictures: LEARN_PICTURES,
  timelineCards: TIMELINE_CARDS,
  timeline: TIMELINE,
  timelineNote: "Times are from the cactbot fight timeline. Some phase 1 times move by a second or two with the axe or scythe opener.",
  reference: REFERENCE,
  phases: PHASES,
  abilities: ABILITIES,
  timelineCategories,
  enrage: ENRAGE,
  clock: {
    random: RANDOM,
    rows: CHOICE_ROWS.map((r) => (r.key === "set1" || r.key === "set2" ? { ...r, order: WEAPONS } : r)),
    help: "Pick a part to practice it on purpose. For a weapon order, press Set order, then drag the cards into the order the boss takes them.",
    clean: cleanChoices,
    build,
    busterPieces,
    floorAttacks,
  },
};
