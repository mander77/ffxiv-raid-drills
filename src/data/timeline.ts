// The M11S fight timeline and the phase labels.
import { S } from "../util";
import type { Kind, TimelineEvent } from "../types";

export const P1 = "Phase 1: Trophy Weapons", P2 = "Phase 2: Meteorain", P3 = "Phase 3: Arena Split", P4 = "Phase 4: Ecliptic Stampede";

/* ---------- timeline (cactbot r11s timeline, rounded to the second) ---------- */
export const TL: TimelineEvent[] = [
  {t:"0:11", n:"Crown of Arcadia", k:"raidwide", job:s=>"Physical raidwide. Mitigate it, then heal up."},
  {t:"0:18", n:"Raw Steel Trophy (axe or scythe)", k:"buster", job:s=>"Hits land at 0:24 to 0:25. Axe: tanks stack, you spread " + S(s,"SSW","SSE") + " far out. Scythe: tanks spread, party stacks south."},
  {t:"0:38", n:"Trophy Weapons, then Assault Evolved", k:"mech", job:s=>"Weapon hits at 0:50, 0:55 and 1:00. The weapon he faces goes first, then clockwise. Every hit adds a vulnerability, so keep healing."},
  {t:"1:13", n:"Trophy Weapons and Void Stardust", k:"mech", job:s=>"Bait 3 puddles from north, each just outside the last, clockwise. Then a spread (Comet) or a stack on a healer (Crushing Comet) at 1:30. Spread: any open spot; tanks and melee own NW, NE, SW, SE. Find the first weapon of the next set early: a sword or scythe first means stack or spread toward it."},
  {t:"1:33", n:"Assault Evolved (second set)", k:"mech", job:s=>"The weapon with its flat side square to the boss goes first, then clockwise. Weapon hits at 1:35, 1:40 and 1:45."},
  {t:"1:50", n:"Void Stardust (second time)", k:"mech", job:s=>"Puddles again. The spread or stack at 1:56 is the opposite of the first one."},
  {t:"2:02", n:"Crown of Arcadia", k:"raidwide", job:s=>"Raidwide. Heal up fast, Dance of Domination is next."},
  {t:"2:15", n:"Dance of Domination Trophy", k:"raidwide", job:s=>"Seven raidwide hits from 2:21 to 2:26, the last one is the biggest. Pair stacks at 2:31: you go relative " + S(s,"SW with R1","SE with R2") + "."},
  {t:"2:36", n:"Raw Steel Trophy (the other weapon)", k:"buster", job:s=>"The opposite of the first one. Mitigate it. You do not need to heal after it, because Charybdistopia sets HP to 1."},
  {t:"2:59", n:"Charybdistopia", k:"heal", job:s=>"Every player goes to 1 HP. Heal the whole party right away, yourself too."},
  {t:"3:05", n:"Ultimate Trophy Weapons", k:"mech", job:s=>"Six weapons from 3:14 to 3:40. Use strong heals here. A dead player must be up by the 3rd weapon."},
  {t:"3:46", n:"Powerful Gust (tornadoes)", k:"mech", job:s=>"Bait your tornado: " + S(s,"west tornado, north side","east tornado, south side") + "."},
  {t:"4:00", n:"One and Only", k:"raidwide", job:s=>"Heavy physical raidwide. Stack mitigation on it."},
  {t:"4:13", n:"Great Wall of Fire", k:"buster", job:s=>"Two shared tank busters. Shield and heal the tanks. Stay out of the fire line it leaves."},
  {t:"4:26", n:"Orbital Omen and Fire and Fury", k:"mech", job:s=>"The boss faces north. Hector's dodge: stay against his hitbox at his side, and cross it to the middle square the next lines miss."},
  {t:"4:52", n:"Meteorain", k:"mech", job:s=>"Line stacks at 5:00, 5:10, 5:20 and 5:30. Healers bait the 2nd meteors: " + S(s,"drop yours NW, inside the boss hitbox","drop yours SW, in line with the first, farther out") + "."},
  {t:"5:43", n:"Triple Tyrannhilation", k:"raidwide", job:s=>"Three hits. Hide SW behind the three rocks."},
  {t:"6:02", n:"Flatliner", k:"raidwide", job:s=>"Physical raidwide that splits the arena. Mitigate it. Go " + S(s,"west (G1), north end","east (G2), south end") + "."},
  {t:"6:16", n:"Majestic Meteor", k:"mech", job:s=>"Towers at 6:29 and 7:01. Fire Breath at 6:44 and 7:16. Heal everyone in the middle between sets."},
  {t:"7:25", n:"Massive Meteor", k:"raidwide", job:s=>"A five-hit stack on each platform. All four players stack. Mitigate and heal."},
  {t:"7:39", n:"Arcadion Avalanche", k:"mech", job:s=>"Towers again. Get knocked to the platform the boss is not facing, then run away from the side he swings from (hit at 7:49)."},
  {t:"7:59", n:"Crown of Arcadia", k:"raidwide", job:s=>"Raidwide. The arena is whole again."},
  {t:"8:10", n:"Great Wall of Fire", k:"buster", job:s=>"Tanks share it with smaller cooldowns. Heal them."},
  {t:"8:24", n:"Orbital Omen and Fire and Fury", k:"mech", job:s=>"Same as before. Play it safe."},
  {t:"8:42", n:"Crown of Arcadia", k:"raidwide", job:s=>"Raidwide. Heal up before Ecliptic Stampede."},
  {t:"8:54", n:"Ecliptic Stampede", k:"mech", job:s=>"Start " + S(s,"SW","SE") + ", outside. Puddles 9:01 to 9:16, towers 9:17, tethers 9:20, Two-way or Four-way Fireball 9:31."},
  {t:"9:39", n:"Crown of Arcadia", k:"raidwide", job:s=>"Raidwide. Then the enrage sequence starts."},
  {t:"9:53", n:"Heartbreak Kick (three towers)", k:"buster", job:s=>"The tower hits 5, then 6, then 7 times (9:53, 10:12, 10:33). Heal the tanks between hits."},
  {t:"11:00", n:"Heartbreaker (enrage)", k:"enrage", job:s=>"The boss must be dead before this."}
];
export const KIND: Record<Kind, string> = {raidwide:"Raidwide", buster:"Tank buster", heal:"Heal-up", mech:"Mechanic", enrage:"Enrage"};
