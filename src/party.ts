// Party slots: the light party and the role, and the short name they make (see types.ts).
import type { MarkRole, PartySlot, Role, Slot, SlotName } from "./types";

/** Every role in the header, in party list order. `short` is the letter a narrow screen shows, the same
    letter as in the slot names. `ready` is true once its drills exist. */
// TS note: `readonly` on an array type means the code cannot push to it or change its entries,
// like IReadOnlyList<T> in C#.
export const ROLES: readonly { role: Role; short: string; ready: boolean }[] = [
  { role: "Tank", short: "T", ready: false },
  { role: "Healer", short: "H", ready: true },
  { role: "Melee", short: "M", ready: false },
  { role: "Ranged", short: "R", ready: false },
];

// TS note: `satisfies` checks that the value fits the type, but keeps the value's own, narrower
// type. Here it makes sure every role has a pair of names, and none is left out.
const NAMES = {
  Tank: ["MT", "OT"],
  Healer: ["H1", "H2"],
  Melee: ["M1", "M2"],
  Ranged: ["R1", "R2"],
} as const satisfies Record<Role, readonly [SlotName, SlotName]>;

/** The short name of a slot: Healer in light party 2 is "H2". */
export const slotName = (p: PartySlot): SlotName => NAMES[p.role][p.lp - 1];

// Every slot by its short name: "OT" is Tank in light party 2.
// TS note: Object.fromEntries builds an object from [key, value] pairs, but its type only says
// "string keys". `as` tells the compiler the keys are the eight slot names, which they are: the
// pairs come from every role in NAMES, in both light parties.
const PARTS = Object.fromEntries(
  ROLES.flatMap(({ role }) => ([1, 2] as const).map((lp): [SlotName, PartySlot] => [slotName({ lp, role }), { lp, role }])),
) as Record<SlotName, PartySlot>;

/** Every slot, in party list order. */
export const SLOT_NAMES: readonly SlotName[] = Object.keys(PARTS) as SlotName[];

/** The two parts of a slot: "H2" is Healer in light party 2. */
export const partyOf = (s: SlotName): PartySlot => PARTS[s];

/** True when a value is the name of a slot whose role has drills. A saved setting can hold any
    value, so the slot store checks it with this. */
// TS note: the return type `s is Slot` makes this a type guard. Where it returns true, the
// compiler treats `s` as a Slot, like `if (x is Slot s)` in C#. Keep Slot and the roles that are
// `ready` in step, or the guard says more than it checks.
export const isSlot = (s: unknown): s is Slot => ROLES.some((r) => r.ready && NAMES[r.role].some((n) => n === s));

/** The colour of a role's player mark. */
export const markRole = (role: Role): MarkRole => (role === "Tank" ? "T" : role === "Healer" ? "H" : "D");
