// Where this fight's facts come from. Fight times come from the cactbot timeline, attack sizes
// from the BossMod module, and positions from the group's guide on wtfdig. The data files read
// each fight time and size from source.gen.ts (`npm run import:sources` writes it) through
// `cactbot` and `bossmod` below, so a time or a size is never typed by hand.
import { BOSSMOD_ABILITIES, CACTBOT_LINES } from "./source.gen";
import { sourceLookups } from "../../sourceLookups";
export { tenth } from "../../sourceLookups";

// TS note: `(typeof CACTBOT_LINES)[number]["name"]` is the union of every line name in the
// generated list, because the list is `as const`. A misspelt name is then a type error.
/** The name of a line on the cactbot timeline. */
export type LineName = (typeof CACTBOT_LINES)[number]["name"];

/** `cactbot(name, n)`: when a line comes. `bossmod(ability)`: its cast and shape. `castStart`
    and `numberedAfter`: see data/sourceLookups.ts. */
export const { cactbot, bossmod, castStart, lineEnd, numberedAfter } = sourceLookups(CACTBOT_LINES, BOSSMOD_ABILITIES);

/** The group's guide on wtfdig, opened with its strats picked: Hector (Toxic), Hector No Buddies, Fixed (3CJ). */
export const WTFDIG = "https://wtfdig.info/74/m11s#hector:hector:fixed";
/** cactbot, and its M11S timeline: the source of every fight time. */
export const CACTBOT = "https://github.com/OverlayPlugin/cactbot";
export const CACTBOT_TIMELINE = "https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/raid/r11s.txt";
/** BossMod, and its M11S module: the source of every attack size and shape. */
export const BOSSMOD = "https://github.com/awgil/ffxiv_bossmod";
export const BOSSMOD_MODULE = "https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Modules/Dawntrail/Savage/RM11STheTyrant";

/** The guides and sources the Cheat Sheet lists, each with an optional note after it. */
export const SOURCES: readonly { href: string; label: string; note?: string }[] = [
  { href: WTFDIG, label: "wtfdig M11S", note: "Your strats: Hector (Toxic), Hector No Buddies, Fixed (3CJ)" },
  { href: "https://www.youtube.com/watch?v=w1uuwzhyf5A", label: "Hector's video guide" },
  { href: "https://www.youtube.com/watch?v=p8cL88OKEWE", label: "Hector's Fixed Stampede mini-guide", note: "Ecliptic Stampede" },
  { href: "https://raidplan.io/plan/HJAbE7fuWodELUSB", label: "Toxic Friends raidplan", note: "Phases 1 and 2" },
  { href: "https://naurffxiv.com/savage/m11s", label: "naurffxiv M11S", note: "Waymark presets: Kindred Outside" },
  { href: "https://raidplan.io/plan/KXVlSGwV3zqON3CJ", label: "Fixed Stampede raidplan", note: "Ecliptic Stampede" },
  {
    href: "https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide",
    label: "Icy Veins M11S guide",
    note: "Mechanic details, enrage at 11:00",
  },
  { href: CACTBOT_TIMELINE, label: "cactbot r11s timeline", note: "Times" },
  { href: BOSSMOD_MODULE, label: "BossMod M11S module", note: "Attack sizes" },
];
