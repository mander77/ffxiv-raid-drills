// Where this fight's facts come from. Fight times come from the cactbot timeline, attack sizes
// from the BossMod module, and positions from the group's guide on wtfdig. The data files read
// each fight time and size from source.gen.ts (`npm run import:sources` writes it) through
// `cactbot` and `bossmod` below, so a time or a size is never typed by hand.
import { BOSSMOD_ABILITIES, CACTBOT_LINES } from "./source.gen";

// TS note: `(typeof CACTBOT_LINES)[number]["name"]` is the union of every line name in the
// generated list, because the list is `as const`. A misspelt name is then a type error.
/** The name of a line on the cactbot timeline. */
export type LineName = (typeof CACTBOT_LINES)[number]["name"];

/** When the cactbot line `name` comes for the `n`th time (1 is the first), in seconds into the
    fight. The same line in two branches at the same time counts once. */
export function cactbot(name: LineName, n = 1): number {
  const times = CACTBOT_LINES.filter(l => l.name === name).map(l => l.t);
  const t = times[n - 1];
  if(t === undefined) throw new Error(`cactbot has ${times.length} lines "${name}", not ${n}`);
  return t;
}

// TS note: `K extends keyof typeof X` and the return type `(typeof X)[K]` keep the exact type of
// the one entry asked for, so `bossmod("AssaultEvolvedSwordAOE").width` is known to exist (10),
// and asking a circle for its width is a type error.
/** BossMod's ability `name`: its cast in seconds and its shape, in yalms. */
export const bossmod = <K extends keyof typeof BOSSMOD_ABILITIES>(name: K): (typeof BOSSMOD_ABILITIES)[K] => BOSSMOD_ABILITIES[name];

/** A time to one decimal, as cactbot writes its times, so a time worked out from two source
    times (a line minus a cast) is exact. */
export const tenth = (t: number): number => Math.round(t * 10) / 10;

/** When BossMod's cast `ability` starts, for the `n`th cactbot line `name`, where the cast ends. */
export const castStart = (ability: keyof typeof BOSSMOD_ABILITIES, name: LineName, n = 1): number =>
  tenth(cactbot(name, n) - bossmod(ability).cast);

/** The numbered lines after the `n`th line `name`, up to the next one, as [time, name]: after the
    second "Heartbreak Kick", its hits "Heartbreak Kick 1" to "Heartbreak Kick 6". */
export function numberedAfter(name: LineName, n: number): Array<[number, string]> {
  const from = cactbot(name, n), to = CACTBOT_LINES.find(l => l.name === name && l.t > from)?.t ?? Infinity;
  const numbered = (line: string): boolean => line.startsWith(name + " ") && /^\d+$/.test(line.slice(name.length + 1));
  return CACTBOT_LINES.filter(l => l.t > from && l.t < to && numbered(l.name)).map((l): [number, string] => [l.t, l.name]);
}

/** The group's guide on wtfdig, opened with its strats picked: Hector (Toxic), Kindred No Buddies, Fixed (3CJ). */
export const WTFDIG = "https://wtfdig.info/74/m11s#hector:nobuddies:fixed";
/** cactbot, and its M11S timeline: the source of every fight time. */
export const CACTBOT = "https://github.com/OverlayPlugin/cactbot";
export const CACTBOT_TIMELINE = "https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/raid/r11s.txt";
/** BossMod, and its M11S module: the source of every attack size and shape. */
export const BOSSMOD = "https://github.com/awgil/ffxiv_bossmod";
export const BOSSMOD_MODULE = "https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Modules/Dawntrail/Savage/RM11STheTyrant";

/** The guides and sources the Cheat Sheet lists, each with an optional note after it. */
export const SOURCES: readonly { href: string; label: string; note?: string }[] = [
  { href: WTFDIG, label: "wtfdig M11S", note: "Your strats: Hector (Toxic), Kindred No Buddies, Fixed (3CJ)" },
  { href: "https://www.youtube.com/watch?v=w1uuwzhyf5A", label: "Hector's video guide" },
  { href: "https://raidplan.io/plan/HJAbE7fuWodELUSB", label: "Toxic Friends raidplan", note: "Phases 1 and 2" },
  { href: "https://raidplan.io/plan/hvbysrfwvrc55ahz", label: "Kindred raidplan", note: "Arena Split" },
  { href: "https://raidplan.io/plan/KXVlSGwV3zqON3CJ", label: "Fixed Stampede raidplan", note: "Ecliptic Stampede" },
  {
    href: "https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide",
    label: "Icy Veins M11S guide",
    note: "Mechanic details, enrage at 11:00",
  },
  { href: CACTBOT_TIMELINE, label: "cactbot r11s timeline", note: "Times" },
  { href: BOSSMOD_MODULE, label: "BossMod M11S module", note: "Attack sizes" },
];
