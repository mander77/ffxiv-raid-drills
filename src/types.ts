// Shared shapes for drills, questions and app state.
// Arena units: the arena is 100 x 100, north is up, and y grows toward the south.
//
// TS note: this file has types only. TypeScript erases all types when it compiles,
// so nothing here exists at run time. Other files bring these names in with
// `import type { ... }`, which tells the compiler that the import is for type checking only.

// TS note: a union of string literals. A Slot can only be the text "H1" or "H2".
// It works like a small C# enum, but the values are plain strings at run time.
export type Slot = "H1" | "H2";
export type Job = "whm" | "sge";

// TS note: a tuple type. A Point is an array of exactly two numbers, [x, y].
// The closest C# match is a value tuple: (double X, double Y).
export type Point = [number, number];
export type RectBox = [number, number, number, number];

/* ---------- answer zones ---------- */

// TS note: an interface describes the shape of an object, like a C# interface or record.
// TypeScript checks shapes, not class names: any object with these fields fits.
// The `?` in `cls?` means the field is optional. Its type is `string | undefined`.
export interface CircleZone { c: Point; r: number; cls?: string }
export interface RectZone { rect: RectBox; cls?: string }
export interface PolyShape { poly: Point[]; cls?: string }
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
  /** A tilted weapon seen from above: x,y is its base, x2,y2 its tip. Flatter = longer. */
  | ({ t: "lean" } & Line)
  | ({ t: "tornado" } & At)
  | ({ t: "rock" } & At)
  | ({ t: "tower" } & At)
  | ({ t: "target" } & At)
  | ({ t: "puddle"; r: number } & At)
  | ({ t: "tag"; s: string } & At)
  | ({ t: "mark"; l: string; r: "T" | "D" | "H" } & At)
  | ({ t: "portal"; vert: boolean; n: number } & At)
  | ({ t: "scythe"; ux: number; uy: number; dx: number; dy: number } & At)
  | { t: "lane"; rect: RectBox; soft?: boolean }
  | { t: "poly"; pts: Point[] };
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

export interface StepResult { p: Point; ok: boolean; z: Zone; drop: Point | null }

export interface Step {
  q: string;
  a: string;
  /** A fixed zone, or zf to build the zone from earlier answers. */
  z?: Zone;
  zf?: (results: StepResult[]) => Zone;
  drop?: boolean;
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

export interface MapDrill {
  id: string;
  order: number;
  phase: string;
  time: string;
  title: string;
  rotate?: boolean;
  variants?: string[];
  // TS note: a drill's build function may take fewer parameters than this type lists.
  // `s => ({...})` still fits `(s, v) => Scene`, just as JavaScript ignores extra arguments.
  build: (s: Slot, v: string | null) => Scene;
}

/* ---------- questions ---------- */

export interface Option { t: string; ok?: boolean }
export interface Question { prompt: string; options: Option[]; why: string; rule: string; src?: string }
export interface QuizItem {
  id: string;
  order: number;
  phase: string;
  time: string;
  job?: Job;
  build: (s: Slot) => Question;
}

/* ---------- timeline ---------- */

export type Kind = "raidwide" | "buster" | "heal" | "mech" | "enrage";
export interface TimelineEvent { t: string; n: string; k: Kind; job: (s: Slot) => string }
