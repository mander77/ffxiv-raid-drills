// The fight you are on, for a component: its data, and the address of each of its pages.
import { useCallback, useContext } from "react";
import { FIGHTS } from "../data/fights";
import type { ArenaSizes, FightData } from "../data/fights/types";
import { FightContext, type FightScope, inFight } from "../fightScope";

/** The fight scope: the fight (or null on an address that names none, when there are several)
    and the base of its addresses. */
export const useFightScope = (): FightScope => useContext(FightContext);

/** The fight you are on. The pages that read it only open once a fight is known (FightGate), so
    it is never null there. */
export function useFight(): FightData {
  const { fight } = useFightScope();
  if (!fight) throw new Error("useFight needs a fight in the address");
  return fight;
}

/** The address of a page in the fight you are on: link("/learn/k-sword"). */
export function useFightLink(): (path: string) => string {
  const { base } = useFightScope();
  return useCallback((path: string) => inFight(base, path), [base]);
}

/** The arena's sizes for the fight you are on. A page with no fight (the styles page, with more
    than one fight) draws with the first fight's sizes. */
export const useArenaSizes = (): ArenaSizes => (useFightScope().fight ?? FIGHTS[0]).arena;
