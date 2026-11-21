// Party slots: the light party and the role, and the short name they make (see types.ts).
import type { LightParty, MarkRole, PartySlot, Role, Slot, SlotName } from "./types";

/** Every role in the header, in party list order. `ready` is true once its drills exist. */
// TS note: `readonly` on an array type means the code cannot push to it or change its entries,
// like IReadOnlyList<T> in C#.
export const ROLES: readonly {role: Role; ready: boolean}[] = [
  {role:"Tank", ready:false},
  {role:"Healer", ready:true},
  {role:"Melee", ready:false},
  {role:"Ranged", ready:false}
];

// TS note: `satisfies` checks that the value fits the type, but keeps the value's own, narrower
// type. Here it makes sure every role has a pair of names, and none is left out.
const NAMES = {
  Tank:["MT", "OT"],
  Healer:["H1", "H2"],
  Melee:["M1", "M2"],
  Ranged:["R1", "R2"]
} as const satisfies Record<Role, readonly [SlotName, SlotName]>;

/** The short name of a slot: Healer in light party 2 is "H2". */
export const slotName = (p: PartySlot): SlotName => NAMES[p.role][p.lp - 1];

/** The two parts of a healer slot. */
export const partyOf = (s: Slot): PartySlot => ({lp:s === "H1" ? 1 : 2, role:"Healer"});

/** The healer slot of a light party. */
export const healerOf = (lp: LightParty): Slot => lp === 1 ? "H1" : "H2";

/** The colour of a role's player mark. */
export const markRole = (role: Role): MarkRole => role === "Tank" ? "T" : role === "Healer" ? "H" : "D";
