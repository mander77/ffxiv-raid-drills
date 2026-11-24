// The fights of the site, in the order the fight picker lists them. To add a fight, give it a
// folder here with an index.ts that exports its FightData, and add it to FIGHTS.
import { M11S } from "./m11s";
import type { FightData } from "./types";

export const FIGHTS: readonly FightData[] = [M11S];

/** The fight with this id (the part of the address, such as "m11s"), if there is one. */
export const fightById = (id: string | undefined): FightData | undefined => FIGHTS.find((f) => f.id === id);
