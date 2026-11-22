// Shared shapes for drills, questions and app state.
// Arena units: the arena is 100 x 100, north is up, and y grows toward the south.
//
// TS note: this file has types only. TypeScript erases all types when it compiles,
// so nothing here exists at run time. Other files bring these names in with
// `import type { ... }`, which tells the compiler that the import is for type checking only.

/* ---------- party slots ---------- */
// A party slot has two parts: the light party (1 or 2) and the role in it. Its short name comes
// from both: Tank 1 and 2 are MT and OT, Healer 1 and 2 are H1 and H2, Melee M1 and M2, Ranged
// R1 and R2. Casters count as Ranged.
// TS note: a union of number literals. A LightParty can only be the number 1 or 2.
export type LightParty = 1 | 2;
// TS note: a union of string literals, like a small C# enum whose values stay plain strings.
export type Role = "Tank" | "Healer" | "Melee" | "Ranged";
export interface PartySlot { lp: LightParty; role: Role }
export type SlotName = "MT" | "OT" | "H1" | "H2" | "M1" | "M2" | "R1" | "R2";
/** The slots that have drills today: the two healers. Saved settings and links use these names. */
// TS note: Extract keeps the members of a union that fit the second type, so Slot is "H1" | "H2".
export type Slot = Extract<SlotName, "H1" | "H2">;
/** The colour of a player mark: tank, healer or DPS. */
export type MarkRole = "T" | "H" | "D";

// TS note: a tuple type. A Point is an array of exactly two numbers, [x, y].
// The closest C# match is a value tuple: (double X, double Y).
export type Point = [number, number];
type RectBox = [number, number, number, number];

/* ---------- answer zones ---------- */

// TS note: an interface describes the shape of an object, like a C# interface or record.
// TypeScript checks shapes, not class names: any object with these fields fits.
// The `?` in `look?` means the field is optional. Its type is `ZoneLook | undefined`.
/** The colour of a zone's area: "ok" (the correct spot, green), "bad" (the correct spot after an incorrect
    click, lighter green), "pick" (a preview or "Go here", blue), "other" (another slot's spot,
    grey), "later" (saved for later, purple) or "hit" (an area that gets hit, red). */
export type ZoneLook = "ok" | "bad" | "pick" | "other" | "later" | "hit";
export interface CircleZone { c: Point; r: number; look?: ZoneLook }
export interface RectZone { rect: RectBox; look?: ZoneLook }
interface PolyShape { poly: Point[]; look?: ZoneLook }
/** A zone decided by a rule. `show` is what the map draws after an answer. */
// TS note: `(p: Point) => boolean` is a function type, like Func<Point, bool> in C#.
export interface RuleZone { fn: (p: Point) => boolean; label: Point; show: Array<CircleZone | RectZone | PolyShape> }

// TS note: a union of object types. A Zone is one of the three shapes.
// Before you use a field that only one shape has, you must check which shape you hold,
// for example with `if ("fn" in z)`. See inZone() in geometry.ts. This is called narrowing.
export type Zone = CircleZone | RectZone | RuleZone;
export type ZoneShape = CircleZone | RectZone | PolyShape | RuleZone;

/* ---------- things drawn on the arena ---------- */

interface At { x: number; y: number }
interface Line extends At { x2: number; y2: number }

// TS note: a "discriminated union". Every member has a `t` field with a different literal value.
// In `switch (o.t)`, TypeScript knows which member you hold in each case, so `o.r` is allowed
// in the "aoe" case but is an error in the "tag" case. C# gets close with a sealed record
// hierarchy and pattern matching. The `&` joins two types into one (an intersection).
type OverlayShape =
  | ({ t: "aoe"; r: number } & At)
  | ({ t: "donut"; r1: number; r2: number } & At)
  | ({ t: "lineaoe"; w?: number } & Line)
  | ({ t: "band"; w: number } & Line)
  | ({ t: "guide" } & Line)
  | ({ t: "tornado" } & At)
  | ({ t: "rock" } & At)
  | ({ t: "tower"; r?: number } & At)
  | ({ t: "target" } & At)
  /** ux, uy turn the weapon: its long side on the floor, from the handle end to the tip. `held`
      is a weapon in the boss's hand, drawn without the cut in the floor. */
  | ({ t: "axe"; ux?: number; uy?: number; held?: boolean } & At)
  | ({ t: "sword"; ux?: number; uy?: number; held?: boolean } & At)
  | ({ t: "puddle"; r: number } & At)
  | ({ t: "tag"; s: string } & At)
  | ({ t: "mark"; l: string; r: MarkRole } & At)
  | ({ t: "portal"; vert: boolean; n: number } & At)
  | ({ t: "scythe"; ux: number; uy: number; dx: number; dy: number; held?: boolean } & At)
  | { t: "lane"; rect: RectBox; soft?: boolean }
  | { t: "poly"; pts: Point[] }
  // The inner edge of the scythe's donut, drawn as a green outline.
  | ({ t: "safe"; r: number } & At);
/** `spawn` groups a weapon's pieces so the map can fade or animate them together. */
export type Overlay = OverlayShape & { spawn?: number };
// TS note: Extract is a built-in helper type. It keeps the union members that match,
// so ScytheOverlay is only the "scythe" member of Overlay.
export type ScytheOverlay = Extract<Overlay, { t: "scythe" }>;

/** The boss marker. `f` is the facing in degrees clockwise from north; null hides the arrow. */
// TS note: `number | null` must be stated. With "strict" on, null is not a valid number,
// much like C# nullable reference types with warnings treated as errors.
export interface Boss { x: number; y: number; f: number | null; d?: Point }

/* ---------- map drills ---------- */

/** One answered step. In the full fight, `missed` means time ran out with no click. */
export interface StepResult { p: Point; ok: boolean; z: Zone; drop: Point | null; missed?: boolean }

export interface Step {
  q: string;
  a: string;
  /** A fixed zone, or zf to build the zone from earlier answers. */
  z?: Zone;
  zf?: (results: StepResult[]) => Zone;
  drop?: boolean;
  /** A look-ahead step: you click to show what you have spotted (a weapon, for example), but you
      do not move there. The moving marker in "Watch the correct moves" skips it. */
  lookAhead?: boolean;
  /** The best spot to stand when the zone has one, for example a few steps in from the
      sword pocket's inner corner. The moving marker goes there instead of
      the middle of the zone. */
  stand?: Point;
  /** The puddles dropped before this step are gone from the moment it is asked. After Void
      Stardust, the puddles stay only until the weapons start. */
  clearDrops?: boolean;
  /** Drawn after this step is answered. */
  reveal?: Overlay[];
  /** Drawn from the moment this step's question shows until the drill ends. */
  cue?: Overlay[];
  leave?: Overlay | null;
}

export interface Scene {
  setup: string;
  rule: string;
  steps: Step[];
  overlays: Overlay[];
  boss?: Boss;
  bossAt?: (n: number) => Boss;
  split?: boolean;
  spawnPlay?: boolean;
  /** How many weapons show before the first hit. Each answered step shows one more. */
  spawnAhead?: number;
}

/** What you do in a Practice mechanic: spread out, stack, stack in a line from the boss, stand in
    pairs, bait an attack (bring it to your spot, then step out), dodge, dodge a set order of
    attacks, take a tower, hide behind something, act on what the boss showed earlier (saved for
    later), or get knocked back to your spot. Practice's list of mechanics shows it as an icon. */
export type DrillKind =
  | "spread"
  | "stack"
  | "lineStack"
  | "pairs"
  | "bait"
  | "dodge"
  | "sequence"
  | "tower"
  | "hide"
  | "later"
  | "knockback";

export interface Drill {
  id: string;
  order: number;
  phase: string;
  time: string;
  title: string;
  /** What you do in it. */
  kind: DrillKind;
  /** The arena turns a random number of quarter turns. */
  rotate?: boolean;
  /** One variant is picked at random for each run. */
  variants?: string[];
  /** The build itself picks random parts, such as weapon spots or line patterns. */
  random?: boolean;
  /** The fight pattern picks this drill follows (keys of Picks in data/fight.ts): `variant`
      chooses its variant, and `pick` goes to build as its third argument. */
  follows?: { variant?: string; pick?: string };
  // TS note: a drill's build function may take fewer parameters than this type lists.
  // `s => ({...})` still fits `(s, v, pick) => Scene`, just as JavaScript ignores extra arguments.
  build: (s: Slot, v: string | null, pick?: string) => Scene;
}

/* ---------- questions ---------- */

/** What one answer looks like on the arena, correct or incorrect: the pieces it adds, and the spots
    it marks. All answers draw in the same neutral colour, so a preview never gives away the answer. */
export interface Preview { pieces: Overlay[]; zones?: ZoneShape[] }

/** An arena picture for a quiz question. `overlays` and `boss` always show. `before` shows
    until you answer, unless an answer preview replaces it. After the answer, `after` draws what
    the mechanic does and the green `answer` zones show the correct spot. `options` holds one
    preview per answer, in the order the question lists them. `note` is a caption. */
export interface Picture { overlays: Overlay[]; boss?: Boss; split?: boolean; before?: Overlay[]; after?: Overlay[]; answer?: ZoneShape[]; options?: Preview[]; note?: string }

export interface Option { t: string; ok?: boolean }
export interface Question { prompt: string; options: Option[]; why: string; rule: string; src?: string }
export interface QuizItem {
  id: string;
  order: number;
  phase: string;
  time: string;
  build: (s: Slot) => Question;
}

/* ---------- timeline ---------- */

/** One row of the cheat-sheet timeline. Its categories come from the ability list (timelineCategories). */
export interface TimelineEvent { t: string; n: string; job: (s: Slot) => string }
