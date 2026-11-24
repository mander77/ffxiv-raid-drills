// The M11S fight timeline and the phase labels.
import { bySlot } from "../../../util";
import { nearClock } from "../../../time";
import { cactbot, type LineName } from "./sources";
import type { TimelineEvent } from "../../../types";

/** The phases of the fight in order, by this app's names. Drills, cards and the ability list
    take their phase from here. */
export const PHASE_NAMES = ["Phase 1: Trophy Weapons", "Phase 2: Meteorain", "Phase 3: Arena Split", "Phase 4: Ecliptic Stampede"] as const;
// TS note: `(typeof PHASE_NAMES)[number]` is the union of the list's values: "Phase 1: Trophy
// Weapons" | "Phase 2: Meteorain" | ... It works because `as const` keeps each exact text. A
// misspelt phase in a drill or card is then a type error. P1 to P4 keep their exact types too.
export type Phase = (typeof PHASE_NAMES)[number];
export const [P1, P2, P3, P4] = PHASE_NAMES;

/* ---------- timeline (cactbot r11s timeline, rounded to the second) ---------- */
/** When the cactbot line `name` comes for the `n`th time, to the nearest second: "0:11". */
const at = (name: LineName, n = 1): string => nearClock(cactbot(name, n));
export const TIMELINE: readonly TimelineEvent[] = [
  {t:at("Crown of Arcadia"), n:"Crown of Arcadia", job:s=>["Physical raidwide.", "Mitigate it, then heal the party."]},
  {t:at("Raw Steel Trophy (Scythe/Axe)"), n:"Raw Steel Trophy (Axe or Scythe)", job:s=>[`Hits land at ${at("Raw Steel (Axe)")} to ${at("Heavy Hitter (Scythe)/Impact x6 (Axe)")}.`, "Axe: tanks stack, you spread " + bySlot(s, {H1:"SSW", H2:"SSE"}) + " far out.", "Scythe: tanks spread, party stacks south."]},
  {t:at("Trophy Weapons"), n:"Trophy Weapons, Then Assault Evolved", job:s=>[`Weapon hits at ${at("Assault Evolved 1")}, ${at("Assault Evolved 2")} and ${at("Assault Evolved 3")}.`, "The weapon he faces goes first, then clockwise.", "Every hit adds a vulnerability, so keep healing."]},
  {t:at("Trophy Weapons", 2), n:"Trophy Weapons and Void Stardust", job:s=>["Bait 3 puddles from north, each just outside the last, clockwise, in max melee.", `At ${at("Comet/Crushing Comet?")}: a spread (Comet) or a Party Stack on a healer (Crushing Comet).`, "Stack: one more step clockwise, just past the third puddle.", "Spread: any open spot. Tanks and melee own NW, NE, SW, SE.", "Look Ahead: find the first weapon of the next set.", "If it is far: use Sprint, a movement ability or Expedient."]},
  {t:at("Assault Evolved", 2), n:"Assault Evolved (Second Set)", job:s=>["The weapon with its flat side square to the boss goes first, then clockwise.", `Weapon hits at ${at("Assault Evolved 1", 2)}, ${at("Assault Evolved 2", 2)} and ${at("Assault Evolved 3", 2)}.`]},
  {t:at("Cometite 1", 2), n:"Void Stardust (Second Time)", job:s=>["Puddles again.", `The spread or stack at ${at("Comet", 2)} is the opposite of the first one.`]},
  {t:at("Crown of Arcadia", 2), n:"Crown of Arcadia", job:s=>["Raidwide.", "Heal the party fast. Dance of Domination is next."]},
  {t:at("Dance of Domination Trophy"), n:"Dance of Domination Trophy", job:s=>[`Seven raidwide hits from ${at("Dance of Domination 1")} to ${at("Dance of Domination 7")}. The last one is the biggest.`, `Pair Stacks at ${at("Eye of the Hurricane")}: you go relative ` + bySlot(s, {H1:"SW with R1", H2:"SE with R2"}) + "."]},
  {t:at("Raw Steel Trophy Axe", 2), n:"Raw Steel Trophy (Second Time)", job:s=>["The opposite of the first one.", "Mitigate it.", "You do not need to heal after it: Charybdistopia sets HP to 1."]},
  {t:at("Charybdistopia"), n:"Charybdistopia", job:s=>["Every player goes to 1 HP.", "Heal the party immediately, yourself too."]},
  {t:at("Ultimate Trophy Weapons"), n:"Ultimate Trophy Weapons", job:s=>[`Six weapons from ${at("Assault Evolved 1", 3)} to ${at("Assault Evolved 6")}.`, "Use strong heals here.", "A dead player must be up by the third weapon."]},
  {t:at("Powerful Gust"), n:"Powerful Gust (Tornadoes)", job:s=>["Bait your tornado: " + bySlot(s, {H1:"west tornado, north side", H2:"east tornado, south side"}) + "."]},
  {t:at("One and Only"), n:"One and Only", job:s=>["Heavy physical raidwide.", "Mitigate it."]},
  {t:at("Great Wall of Fire (castbar)"), n:"Great Wall of Fire", job:s=>["Two Shared Tank Busters.", "Shield and heal the tanks.", "Stay out of the fire trail it leaves."]},
  {t:at("Orbital Omen (castbar)"), n:"Orbital Omen and Fire and Fury", job:s=>["The boss faces north.", "Hector's dodge: stay in max melee, at his side.", "Cross under the boss to the middle square the next lines miss."]},
  {t:at("Meteorain"), n:"Meteorain", job:s=>[`Line Stacks at ${at("Fearsome Fireball")}, ${at("Fearsome Fireball", 2)}, ${at("Fearsome Fireball", 3)} and ${at("Fearsome Fireball", 4)}.`, "Healers bait the second meteors.", bySlot(s, {H1:"Drop yours NW, under the boss.", H2:"Drop yours SW, in a row with the first rock, farther out."})]},
  {t:at("Triple Tyrannhilation"), n:"Triple Tyrannhilation", job:s=>["Three hits.", "Hide SW behind the row of three rocks."]},
  {t:at("Flatliner (split)"), n:"Flatliner", job:s=>["Physical raidwide that splits the arena.", "Mitigate it.", "Go " + bySlot(s, {H1:"west (light party 1), north end", H2:"east (light party 2), south end"}) + "."]},
  {t:at("Majestic Meteor"), n:"Majestic Meteor", job:s=>[`Towers at ${at("Explosion", 6)} and ${at("Explosion", 7)}.`, `Fire Breath at ${at("Majestic Meteowrath/Majestic Meteorain/Fire Breath")} and ${at("Majestic Meteowrath/Majestic Meteorain/Fire Breath", 2)}.`, "Heal the party in the middle between sets."]},
  {t:at("Massive Meteor (castbar)"), n:"Massive Meteor", job:s=>["A five-hit stack on each platform.", "All four players stack.", "Mitigate and heal."]},
  {t:at("Arcadion Avalanche (castbar)"), n:"Arcadion Avalanche", job:s=>["Towers again.", "Get knocked to the platform the boss is not facing.", `Then run away from the side he swings from (hit at ${at("Arcadion Avalanche")}).`]},
  {t:at("Crown of Arcadia", 3), n:"Crown of Arcadia", job:s=>["Raidwide.", "The arena is whole again."]},
  {t:at("Great Wall of Fire (castbar)", 2), n:"Great Wall of Fire", job:s=>["Tanks share it with smaller cooldowns.", "Heal them."]},
  {t:at("Orbital Omen (castbar)", 2), n:"Orbital Omen and Fire and Fury", job:s=>["Same as before.", "Play it safe."]},
  {t:at("Crown of Arcadia", 4), n:"Crown of Arcadia", job:s=>["Raidwide.", "Heal the party before Ecliptic Stampede."]},
  {t:at("Ecliptic Stampede"), n:"Ecliptic Stampede", job:s=>["Start " + bySlot(s, {H1:"SW", H2:"SE"}) + ", outside.", `Puddles ${at("Atomic Impact 1")} to ${at("Atomic Impact 6")}.`, `Towers ${at("Cosmic Kiss", 4)}.`, `Tethers ${at("--tethers--", 5)}.`, `Two-way or Four-way Fireball ${at("Two-way Fireball / Four-way Fireball")}.`]},
  {t:at("Crown of Arcadia", 5), n:"Crown of Arcadia", job:s=>["Raidwide.", "Then the enrage sequence starts."]},
  {t:at("Heartbreak Kick"), n:"Heartbreak Kick (Three Towers)", job:s=>[`The tower hits 5, then 6, then 7 times (${at("Heartbreak Kick")}, ${at("Heartbreak Kick", 2)}, ${at("Heartbreak Kick", 3)}).`, "Heal the tanks between hits."]},
  {t:at("Heartbreaker (Enrage)"), n:"Heartbreaker (Enrage)", job:s=>["The boss must be dead before this."]}
];
