// The fight you are on, from the address. With one fight, the addresses have no fight in them
// (/learn/k-sword). With more than one, each fight's pages start with its id (/m11s/learn/k-sword),
// and an address without one asks you to pick a fight first. App.tsx reads the scope once and
// passes it down in FightContext; components read it with useFight (src/hooks/useFight.ts).
import { createContext } from "react";
import { FIGHTS, fightById } from "./data/fights";
import type { FightData } from "./data/fights/types";

export interface FightScope {
  /** The fight, or null when the address names none and there is more than one to pick from. */
  fight: FightData | null;
  /** What each address of this fight starts with: "/m11s", or "" when the address has no fight. */
  base: string;
}

/** The first part of an address, such as "m11s" in "/m11s/learn". */
const firstPart = (pathname: string): string => pathname.split("/")[1] ?? "";

/** The fight scope of an address. */
export function scopeOf(pathname: string): FightScope {
  const named = fightById(firstPart(pathname));
  if (named) return { fight: named, base: `/${named.id}` };
  return { fight: FIGHTS.length === 1 ? FIGHTS[0] : null, base: "" };
}

/** The address without its fight: "/m11s/learn/k-sword" gives "/learn/k-sword", and "/m11s"
    gives "/". An address with no fight stays as it is. */
export function withoutFight(pathname: string): string {
  if (!fightById(firstPart(pathname))) return pathname;
  const rest = pathname.slice(firstPart(pathname).length + 1);
  return rest === "" ? "/" : rest;
}

/** The fight address of a page: "/learn" in the fight with base "/m11s" is "/m11s/learn", and
    Home is "/m11s". With no base, the page address stays as it is. */
export const inFight = (base: string, path: string): string => (path === "/" ? base || "/" : base + path);

// TS note: createContext makes a value that a component high in the tree provides
// (<FightContext value={...}>) and any component below reads with useContext, without passing
// it through every component in between. The value here is what a component reads when no
// provider is above it, as in a test of a single component: the first fight.
export const FightContext = createContext<FightScope>({ fight: FIGHTS[0], base: "" });
