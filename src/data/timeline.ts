// The M11S fight timeline and the phase labels.
import { bySlot } from "../util";
import type { TimelineEvent } from "../types";

/** The phases of the fight in order, by this app's names. Drills, cards and the ability list
    take their phase from here. */
export const PHASE_NAMES = ["Phase 1: Trophy Weapons", "Phase 2: Meteorain", "Phase 3: Arena Split", "Phase 4: Ecliptic Stampede"] as const;
// TS note: `(typeof PHASE_NAMES)[number]` is the union of the list's values: "Phase 1: Trophy
// Weapons" | "Phase 2: Meteorain" | ... It works because `as const` keeps each exact text. A
// misspelt phase in a drill or card is then a type error. P1 to P4 keep their exact types too.
export type Phase = (typeof PHASE_NAMES)[number];
export const [P1, P2, P3, P4] = PHASE_NAMES;

/* ---------- timeline (cactbot r11s timeline, rounded to the second) ---------- */
export const TIMELINE: readonly TimelineEvent[] = [
  {t:"0:11", n:"Crown of Arcadia", job:s=>["Physical raidwide.", "Mitigate it, then heal the party."]},
  {t:"0:18", n:"Raw Steel Trophy (axe or scythe)", job:s=>["Hits land at 0:24 to 0:25.", "Axe: tanks stack, you spread " + bySlot(s, {H1:"SSW", H2:"SSE"}) + " far out.", "Scythe: tanks spread, party stacks south."]},
  {t:"0:38", n:"Trophy Weapons, then Assault Evolved", job:s=>["Weapon hits at 0:50, 0:55 and 1:00.", "The weapon he faces goes first, then clockwise.", "Every hit adds a vulnerability, so keep healing."]},
  {t:"1:13", n:"Trophy Weapons and Void Stardust", job:s=>["Bait 3 puddles from north, each just outside the last, clockwise.", "At 1:30: a spread (Comet) or a party stack on a healer (Crushing Comet).", "Spread: any open spot. Tanks and melee own NW, NE, SW, SE.", "Look ahead: find the first weapon of the next set.", "Sword or scythe first: stack or spread toward it."]},
  {t:"1:33", n:"Assault Evolved (second set)", job:s=>["The weapon with its flat side square to the boss goes first, then clockwise.", "Weapon hits at 1:35, 1:40 and 1:45."]},
  {t:"1:50", n:"Void Stardust (second time)", job:s=>["Puddles again.", "The spread or stack at 1:56 is the opposite of the first one."]},
  {t:"2:02", n:"Crown of Arcadia", job:s=>["Raidwide.", "Heal the party fast. Dance of Domination is next."]},
  {t:"2:15", n:"Dance of Domination Trophy", job:s=>["Seven raidwide hits from 2:21 to 2:26. The last one is the biggest.", "Pair stacks at 2:31: you go relative " + bySlot(s, {H1:"SW with R1", H2:"SE with R2"}) + "."]},
  {t:"2:36", n:"Raw Steel Trophy (second time)", job:s=>["The opposite of the first one.", "Mitigate it.", "You do not need to heal after it: Charybdistopia sets HP to 1."]},
  {t:"2:59", n:"Charybdistopia", job:s=>["Every player goes to 1 HP.", "Heal the party immediately, yourself too."]},
  {t:"3:05", n:"Ultimate Trophy Weapons", job:s=>["Six weapons from 3:14 to 3:40.", "Use strong heals here.", "A dead player must be up by the third weapon."]},
  {t:"3:46", n:"Powerful Gust (tornadoes)", job:s=>["Bait your tornado: " + bySlot(s, {H1:"west tornado, north side", H2:"east tornado, south side"}) + "."]},
  {t:"4:00", n:"One and Only", job:s=>["Heavy physical raidwide.", "Mitigate it."]},
  {t:"4:13", n:"Great Wall of Fire", job:s=>["Two shared tank busters.", "Shield and heal the tanks.", "Stay out of the fire trail it leaves."]},
  {t:"4:26", n:"Orbital Omen and Fire and Fury", job:s=>["The boss faces north.", "Hector's dodge: stay in max melee, at his side.", "Cross under the boss to the middle square the next lines miss."]},
  {t:"4:52", n:"Meteorain", job:s=>["Line stacks at 5:00, 5:10, 5:20 and 5:30.", "Healers bait the second meteors.", bySlot(s, {H1:"Drop yours NW, under the boss.", H2:"Drop yours SW, in a row with the first rock, farther out."})]},
  {t:"5:43", n:"Triple Tyrannhilation", job:s=>["Three hits.", "Hide SW behind the row of three rocks."]},
  {t:"6:02", n:"Flatliner", job:s=>["Physical raidwide that splits the arena.", "Mitigate it.", "Go " + bySlot(s, {H1:"west (light party 1), north end", H2:"east (light party 2), south end"}) + "."]},
  {t:"6:16", n:"Majestic Meteor", job:s=>["Towers at 6:29 and 7:01.", "Fire Breath at 6:44 and 7:16.", "Heal the party in the middle between sets."]},
  {t:"7:25", n:"Massive Meteor", job:s=>["A five-hit stack on each platform.", "All four players stack.", "Mitigate and heal."]},
  {t:"7:39", n:"Arcadion Avalanche", job:s=>["Towers again.", "Get knocked to the platform the boss is not facing.", "Then run away from the side he swings from (hit at 7:49)."]},
  {t:"7:59", n:"Crown of Arcadia", job:s=>["Raidwide.", "The arena is whole again."]},
  {t:"8:10", n:"Great Wall of Fire", job:s=>["Tanks share it with smaller cooldowns.", "Heal them."]},
  {t:"8:24", n:"Orbital Omen and Fire and Fury", job:s=>["Same as before.", "Play it safe."]},
  {t:"8:42", n:"Crown of Arcadia", job:s=>["Raidwide.", "Heal the party before Ecliptic Stampede."]},
  {t:"8:54", n:"Ecliptic Stampede", job:s=>["Start " + bySlot(s, {H1:"SW", H2:"SE"}) + ", outside.", "Puddles 9:01 to 9:16.", "Towers 9:17.", "Tethers 9:20.", "Two-way or Four-way Fireball 9:31."]},
  {t:"9:39", n:"Crown of Arcadia", job:s=>["Raidwide.", "Then the enrage sequence starts."]},
  {t:"9:53", n:"Heartbreak Kick (three towers)", job:s=>["The tower hits 5, then 6, then 7 times (9:53, 10:12, 10:33).", "Heal the tanks between hits."]},
  {t:"11:00", n:"Heartbreaker (enrage)", job:s=>["The boss must be dead before this."]}
];
