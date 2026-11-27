// Shared shapes for drills, questions and app state.
// Arena units: the arena is 100 x 100, north is up, and y grows toward the south.
//
// TS note: this file has types only. TypeScript erases all types when it compiles,
// so nothing here exists at run time. Other files bring these names in with
// `import type { ... }`, which tells the compiler that the import is for type checking only.

/** A phase of a fight, by its full name: "Phase 1: Trophy Weapons". Each fight lists its own. */
export type Phase = string;

/* ---------- party slots ---------- */
// A party slot has two parts: the light party (1 or 2) and the role in it. Its short name comes
// from both: Tank 1 and 2 are MT and OT, Healer 1 and 2 are H1 and H2, Melee M1 and M2, Ranged
// R1 and R2. Casters count as Ranged.
// TS note: a union of number literals. A LightParty can only be the number 1 or 2.
export type LightParty = 1 | 2;
// TS note: a union of string literals, like a small C# enum whose values stay plain strings.
export type Role = "Tank" | "Healer" | "Melee" | "Ranged";
export interface PartySlot {
  lp: LightParty;
  role: Role;
}
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
    grey), "later" (look ahead, purple) or "hit" (an area that gets hit, red). */
export type ZoneLook = "ok" | "bad" | "pick" | "other" | "later" | "hit";
export interface CircleZone {
  c: Point;
  r: number;
  look?: ZoneLook;
}
export interface RectZone {
  rect: RectBox;
  look?: ZoneLook;
}
/** A polygon. A ring (the arena out of a tower) has its inner edge as a `hole`, so no line joins
    the two edges. */
export interface PolyShape {
  poly: Point[];
  hole?: Point[];
  look?: ZoneLook;
}
/** A zone decided by a rule. `show` is what the map draws after an answer. */
// TS note: `(p: Point) => boolean` is a function type, like Func<Point, bool> in C#.
export interface RuleZone {
  fn: (p: Point) => boolean;
  label: Point;
  show: Array<CircleZone | RectZone | PolyShape>;
}

// TS note: a union of object types. A Zone is one of the three shapes.
// Before you use a field that only one shape has, you must check which shape you hold,
// for example with `if ("fn" in z)`. See inZone() in geometry.ts. This is called narrowing.
export type Zone = CircleZone | RectZone | RuleZone;
export type ZoneShape = CircleZone | RectZone | PolyShape | RuleZone;

/* ---------- things drawn on the arena ---------- */

interface At {
  x: number;
  y: number;
}
interface Line extends At {
  x2: number;
  y2: number;
}

// TS note: a "discriminated union". Every member has a `t` field with a different literal value.
// In `switch (o.t)`, TypeScript knows which member you hold in each case, so `o.r` is allowed
// in the "aoe" case but is an error in the "tag" case. C# gets close with a sealed record
// hierarchy and pattern matching. The `&` joins two types into one (an intersection).
type OverlayShape =
  | ({ t: "aoe"; r: number } & At)
  /* A raidwide: the whole floor is hit. A tint over the floor, with a glow inside its edge.
     `cover` is ground the attack does not reach, such as the shadow behind a rock. */
  | { t: "raidwide"; cover?: Point[] }
  | ({ t: "donut"; r1: number; r2: number } & At)
  | ({ t: "lineaoe"; w?: number } & Line)
  | ({ t: "band"; w: number } & Line)
  | ({ t: "guide" } & Line)
  // A tether: from its portal (x, y) to the player (x2, y2). It shows stretched when it is long enough.
  // `fixed` is a tether that is never stretched (Foregone Fatality's, which a tank picks up).
  | ({ t: "tether"; fixed?: boolean } & Line)
  // Where a cone points: an arrow from its source (x, y) out to (x2, y2).
  | ({ t: "aim" } & Line)
  /** The boss turning: an arrow along an arc of radius `r` around (x, y), from the facing `from`
      to the facing `to`, in degrees clockwise from north. */
  | ({ t: "turn"; r: number; from: number; to: number } & At)
  // Where a knockback pushes you: a bold dark arrow from (x, y) out to (x2, y2).
  | ({ t: "knockback" } & Line)
  | ({ t: "tornado" } & At)
  /* A rock: a meteor on the floor. `state` changes the rock at the same spot: "broken" draws it
     cracked, as a hit breaks it; "gone" leaves it off the arena, after the next hit. */
  | ({ t: "rock"; state?: "broken" | "gone" } & At)
  /** `soak` is how many players the tower needs: one dot on its ring for each. `tank` is a tower
      only tanks soak: a "T" in place of each dot. */
  | ({ t: "tower"; r?: number; soak?: number; tank?: boolean } & At)
  | ({ t: "target" } & At)
  /** A stack marker on the player at (x, y): four arrows pointing in at them. `n` is how many
      times the stack hits, shown under the player. */
  | ({ t: "stackMark"; n?: number } & At)
  /** ux, uy turn the weapon: its long side on the floor, from the handle end to the tip. `held`
      is a weapon in the boss's hand, drawn without the cut in the floor. */
  | ({ t: "axe"; ux?: number; uy?: number; held?: boolean } & At)
  | ({ t: "sword"; ux?: number; uy?: number; held?: boolean } & At)
  /** `life` is how many seconds the puddle stays before it goes off; with none, it stays. */
  | ({ t: "puddle"; r: number; life?: number } & At)
  // An attack whose size no source gives yet: a dashed grey ring with a "?".
  | ({ t: "unknown" } & At)
  | ({ t: "tag"; s: string } & At)
  | ({ t: "mark"; l: string; r: MarkRole } & At)
  /** `n` numbers Orbital Omen's portals; the Arena Split's tether portals have none. */
  | ({ t: "portal"; vert: boolean; n?: number } & At)
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
export interface Boss {
  x: number;
  y: number;
  f: number | null;
  d?: Point;
}

/* ---------- map drills ---------- */

/** One answered step. In the full fight, `missed` means time ran out with no click. */
export interface StepResult {
  p: Point;
  ok: boolean;
  z: Zone;
  drop: Point | null;
  missed?: boolean;
  /** Why an incorrect click is not correct, when its step can say: what hits you there. */
  why?: string;
}

/** A puddle that drops where a player stands: its radius in arena units, and how many seconds it
    stays on the floor before it goes off. */
export interface Puddle {
  r: number;
  life: number;
}

export interface Step {
  q: string;
  /** The correct move, one short line each. The first line is the move itself: a prompt bar or
      the HUD shows only that line. The other lines add details. */
  a: Lines;
  /** A fixed zone, or zf to build the zone from earlier answers. */
  z?: Zone;
  zf?: (results: StepResult[]) => Zone;
  /** A puddle drops where you click: its size and how long it stays. */
  drop?: Puddle;
  /** A look-ahead step: you click to show what you have spotted (a weapon, for example), but you
      do not move there. The moving marker in "Watch the Correct Moves" skips it. */
  lookAhead?: boolean;
  /** The best spot to stand when the zone has one, for example a few steps in from the
      sword pocket's inner corner. The moving marker goes there instead of
      the middle of the zone. */
  stand?: Point;
  /** The puddles dropped before this step are gone from the moment it is asked. After Void
      Stardust, the puddles stay only until the weapons start. */
  clearDrops?: boolean;
  /** Every puddle dropped before this step has gone off by the time it is asked, so Practice
      fades them then. The full fight times each puddle itself. */
  puddlesOff?: boolean;
  /** A knockback at this step's hit: it throws you `dist` units straight away from `from`. The
      full fight's moving marker shows the throw. */
  knock?: { from: Point; dist: number };
  /** Drawn after this step is answered. */
  reveal?: Overlay[];
  /** Drawn after this step is answered, at the spot the party went: your click when it was
      correct, else the correct spot. For an attack that follows the party, such as a stack whose
      spot depends on your earlier answers. */
  revealAt?: (spot: Point) => Overlay[];
  /** The attacks of this step that the correct spot must stay out of, when they are not all of
      `reveal`: `reveal` can also show an attack the player takes on purpose, such as a stack, a
      bait or their own protean cone. Without it, every attack in `reveal` counts. Only
      test/answers.test.ts reads it; nothing draws it. */
  hits?: Overlay[];
  /** Why a click at p is not correct, as one short sentence ("OT's Fire Breath hits you there."),
      or undefined when it cannot say. p is in the scene's own units, before the arena turns. */
  whyNot?: (p: Point, results: StepResult[]) => string | undefined;
  /** Drawn from the moment this step's question shows until the drill ends. */
  cue?: Overlay[];
  leave?: Overlay | null;
}

/** Text in short lines, one step or fact each. A screen shows it as a list.
    TS note: `readonly string[]` is an array that the code may read but not change, like
    IReadOnlyList<string> in C#. */
export type Lines = readonly string[];

export interface Scene {
  /** What happens in the mechanic, one step per line. */
  setup: Lines;
  /** True when the setup lines happen in order: the screen numbers them. */
  ordered?: boolean;
  rule: Lines;
  steps: Step[];
  overlays: Overlay[];
  boss?: Boss;
  bossAt?: (n: number) => Boss;
  split?: boolean;
  /** With `split`: the arena stays whole until step `splitAfter` goes off, then splits (Flatliner
      splits it as its knockback lands). Practice splits it once that step is answered. */
  splitAfter?: number;
  spawnPlay?: boolean;
  /** How many weapons show before the first hit. Each answered step shows one more. The full
      fight shows them at their spawn times instead (FightSeg.spawns). */
  spawnAhead?: number;
  /** Your tether: it runs from its portal to where you stand, from step `from` (the first step
      when left out). Before your first answer you stand at your mark `you`. A `fixed` tether is
      never shown as stretched (no source gives its stretch distance). */
  tether?: { portal: Point; you: Extract<Overlay, { t: "mark" }>; from?: number; fixed?: boolean };
  /** A stack marker on one player (Massive Meteor's), from the start until the step is answered:
      then the stack is where the party went. `on` is the player who has it, where they stand.
      `you` says it is yours: the full fight puts it on your moving marker. `n` is its hits. */
  headMark?: { on: Extract<Overlay, { t: "mark" }>; you: boolean; n: number };
}

/** What you do in a Practice mechanic: spread out, stack (the whole party, in pairs, in light
    parties, with the four on your platform, or by role), stack in a line from the boss, bait an attack (bring it to where it should
    go), drop puddles in order, take your clock spot for proteans, dodge a set order of attacks, soak a tower (one that knocks
    you back, or one for a tank), line up behind a blocker for a wild charge, act on what the boss showed earlier
    (look ahead), get knocked back to your spot, stretch a tether, stay close to the player
    you are tethered to, or take a tank buster alone or shared. Practice's list of mechanics shows it as an icon. */
export type DrillKind =
  | "spread"
  | "stack"
  | "pairStack"
  | "lightPartyStack"
  | "platformStack"
  | "roleStack"
  | "lineStack"
  | "bait"
  | "puddles"
  | "protean"
  | "sequence"
  | "tower"
  | "towerKnockback"
  | "tankTower"
  | "wildCharge"
  | "later"
  | "knockback"
  | "chains"
  | "pairTether"
  | "tankBuster"
  | "sharedTankBuster";

export interface Drill {
  id: string;
  order: number;
  phase: Phase;
  time: string;
  title: string;
  /** What you do in it. A mechanic that can end in more than one way (a weapon is a party stack,
      proteans or a light party stack) lists each kind it can be, in the order the list shows them.
      kindsOf (lib/practice.ts) gives the list either way. */
  // TS note: `A | readonly A[]` is a union type: one value, or a list. C# would need two
  // properties or an overload; here the code checks which one it has (Array.isArray).
  kind: DrillKind | readonly DrillKind[];
  /** A tower: how many players soak each tower. Its icon shows the number. */
  soak?: number;
  /** The arena turns a random number of quarter turns. */
  rotate?: boolean;
  /** One variant is picked at random for each run. */
  variants?: string[];
  /** The build itself picks random parts, such as weapon spots or line patterns. */
  random?: boolean;
  /** The fight pattern picks this drill follows (keys of the fight's pick rows): `variant`
      chooses its variant, and `pick` goes to build as its third argument. */
  follows?: { variant?: string; pick?: string };
  // TS note: a drill's build function may take fewer parameters than this type lists.
  // `s => ({...})` still fits `(s, v, pick) => Scene`, just as JavaScript ignores extra arguments.
  build: (s: Slot, v: string | null, pick?: string) => Scene;
}

/* ---------- questions ---------- */

/** What one answer looks like on the arena, correct or incorrect: the pieces it adds, and the spots
    it marks. All answers draw in the same neutral colour, so a preview never gives away the answer. */
export interface Preview {
  pieces: Overlay[];
  zones?: ZoneShape[];
}

/** An arena picture for a quiz question. `overlays` and `boss` always show. `before` shows
    until you answer, unless an answer preview replaces it. After the answer, `after` draws what
    the mechanic does and the green `answer` zones show the correct spot. `options` holds one
    preview per answer, in the order the question lists them. `note` is a caption. */
export interface Picture {
  overlays: Overlay[];
  boss?: Boss;
  split?: boolean;
  before?: Overlay[];
  after?: Overlay[];
  answer?: ZoneShape[];
  options?: Preview[];
  note?: string;
}

export interface Option {
  t: string;
  ok?: boolean;
}
export interface Question {
  prompt: string;
  options: Option[];
  why: Lines;
  rule: Lines;
  src?: string;
}
export interface QuizItem {
  id: string;
  order: number;
  /** The phase of a Learn card, or "Timeline" on every Timeline card. */
  phase: Phase | "Timeline";
  time: string;
  build: (s: Slot) => Question;
}

/* ---------- timeline ---------- */

/** One row of the cheat-sheet timeline. Its categories come from the ability list (timelineCategories). */
export interface TimelineEvent {
  t: string;
  n: string;
  /** What you do, one short line each. */
  job: (s: Slot) => Lines;
}

/* ---------- abilities ---------- */

/** The colour categories of the ability list (the keys of CATEGORIES in data/categories.ts).
    "spot" is "Positioning Required". */
export type Category = "raid" | "tank" | "spot" | "dodge" | "target" | "mech" | "enrage";

/** How the full fight shows an ability's hits, where its categories alone do not say it.
    `shared`: the party shares the hit (a stack or a tower), so it flashes softer.
    `times`: its hits, each with its own time (a timeline line) and name.
    `lines`: each timeline line named `lines` and a number, up to the next ability, is one hit.
    `area`: the circle it hits, when that is not the whole floor (a tower), so only it flashes. */
export interface HitRule {
  shared?: boolean;
  times?: readonly { t: number; name: string }[];
  lines?: string;
  area?: CircleZone;
}

/** One row of the ability list. `t` is when it hits, in seconds into the fight. */
export interface Ability {
  t: number;
  name: string;
  cats: Category[];
  note: string;
  hit?: HitRule;
}

/* ---------- the full fight ---------- */

/** One line on the fight timeline: `name` happens at `t`, in seconds into the fight. */
export interface TLEvent {
  t: number;
  name: string;
  raidwide?: boolean;
  cast?: boolean;
}

/** One stretch of the fight with a scene on the arena. `due[i]` is when step i resolves. */
export interface FightSeg {
  title: string;
  /** The Practice drills this stretch tests. Its result counts toward the first one's score,
      and the end screen links to it with "Practice It". */
  drills: string[];
  scene: Scene;
  /** Quarter turns of the arena, for mechanics that turn (Dance of Domination). */
  k: number;
  /** When the scene appears on the arena. */
  from: number;
  due: number[];
  /** While the boss stands in the middle: no facing arrow until `at`, when his cast starts
      and he turns to the first weapon (facing `f`, degrees clockwise from north). The last
      `weapons` steps are the weapons: before he turns, the player cannot know where to go for
      them, so the watched run shows no spot for them until then. */
  turn?: { at: number; f: number; weapons: number };
  /** When each weapon spawns, in seconds into the fight, for a scene whose weapons come in one
      at a time (Ultimate Trophy Weapons). A weapon shows from its time, and nobody can know its
      spot before then. Left out, the scene's spawnAhead rule shows them. */
  spawns?: readonly number[];
  /** Where to pre-position before this stretch, when the first move is known in advance (the
      first Void Stardust puddle is always north, the second one is at the boss's butt). The
      player goes there just after the last hit before it. Without it, the player waits up close
      to the boss in a quiet stretch (see data/route.ts). */
  pre?: Point;
  /** The first hit of an attack that hits several times until the last due (Massive Meteor's
      five): Watch the Correct Moves shows the last answer from then, while the attack goes off. */
  firstHit?: number;
}

/** How the full fight shows a hit: a raidwide flashes the arena floor, a tank buster draws the
    tanks and the hit on them, a shared hit (a stack or a tower the party shares) flashes softer,
    the enrage flashes long and dark, and any other AoE only shows its name. A hit with an `area`
    flashes only that circle. */
export type HitKind = "raid" | "tank" | "shared" | "enrage" | "aoe";
export interface Hit {
  t: number;
  name: string;
  kind: HitKind;
  cat: Category;
  area?: CircleZone;
}

/** Your pattern picks for the full fight: each pick's key and its value, or "random". The
    fight's pick rows say which keys and values it knows. */
export type Choices = Readonly<Record<string, string>>;

/** One full fight on the clock, as the engine (lib/fight.ts) and the screens use it. `code`
    rebuilds the same fight. `split` is when the arena is two platforms, in seconds ([0, 0] when
    it never splits). `hits` is every hit in time order. Each line of `events` carries the
    categories of the abilities at its time. `choices` is what the player asked for, so a link
    can carry it. */
export interface Fight {
  segs: FightSeg[];
  events: Array<TLEvent & { cats: Category[] }>;
  hits: Hit[];
  end: number;
  split: [number, number];
  summary: string;
  code: string;
  choices: Choices;
}

/* ---------- the Cheat Sheet ---------- */

/** One mechanic of the reference. */
export interface ReferenceEntry {
  name: string;
  /** The Learn card whose answer picture it shows. Its time and phase are the entry's. */
  picture: string;
  /** The Learn cards whose rules it lists, in order (the picture's card among them). */
  cards: readonly string[];
  /** The Practice drills where you click your spot for it. */
  drills: readonly string[];
  /** The Timeline card whose answer is this mechanic ("... just happened. What comes next?"),
      when it has its own row in the timeline. */
  timeline?: string;
}
