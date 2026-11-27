// The other players: where each one stands at each step of a mechanic, in Practice, and the route
// each one runs in the full fight, beside your own (route.ts).
//
// The rule: while a step is asked, the others stand where they were for the step before. They go
// to the step's spot once you answer it, so a mark never gives the answer away. A step's `early`
// players go as soon as it is asked.
import { dist, inArena, inZone, polar, rot, zoneCenter } from "../geometry";
import { SLOT_NAMES } from "../party";
import type { Boss, Fight, FightSeg, PartySpot, Point, Scene, SlotName, Step, StepResult, Zone } from "../types";
import { type Stop, showOf } from "./route";

/** The rest formation, as [degrees clockwise from the boss's front, units out from his middle]:
    where the others stand before a mechanic that has no start of its own, and in the full
    fight's quiet stretches. The app's choice (the owner's OK, to check): the tanks just in front
    of his hitbox, the melee in max melee behind him, the healers and ranged about 12 yalms out
    behind him, light party 1 on his left. */
const REST: Record<SlotName, [number, number]> = {
  MT: [345, 15],
  OT: [15, 15],
  M1: [225, 19],
  M2: [135, 19],
  R1: [205, 30],
  H1: [190, 30],
  H2: [170, 30],
  R2: [155, 30],
};

/** Where player x rests around a boss at (x, y), facing f. */
export const restSpot = (who: SlotName, boss: Pick<Boss, "x" | "y" | "f"> = { x: 50, y: 50, f: 0 }): Point => {
  const [deg, r] = REST[who];
  return polar((boss.f ?? 0) + deg, r, [boss.x, boss.y]);
};

/** How far from the middle of a stack another player stands, so every mark shows.
    The app's choice: a mark is 4.8 units across. */
const WITH_YOU = 6;

/** Where player `who` stands in a stack at `spot` (with you, or with another player there): on a
    small ring around it, each slot at its own angle, so the marks do not cover each other or the
    player in the middle. */
export const stackedAt = (who: SlotName, spot: Point): Point => polar(22.5 + 45 * SLOT_NAMES.indexOf(who), WITH_YOU, spot);

/** How far apart two players in a stack stand, at least: as far as on the ring of stackedAt. */
const APART = 4.6;
/** How close two players in a tight area may stand: their marks overlap a little, and both show. */
const TIGHT = 2.6;
/** The rings tried around a stack, in arena units, and the step between the spots on each, in degrees. */
const RINGS = [TIGHT, APART, WITH_YOU, 9, 12, 15, 18], ARC = 15;

/** Where the players `who` stand in a stack at `spot`: each on the free spot nearest to it, at
    least APART from the others and from the middle, and inside `inside` (the step's correct area)
    so they share the answer and stay out of what it dodges. Where the area has no room, a player
    stands on their own ring spot (stackedAt). */
export function packAround(who: readonly SlotName[], spot: Point, inside?: (p: Point) => boolean): Map<SlotName, Point> {
  // The plain ring around the stack, when it fits in the area.
  const plain = who.map((x): [SlotName, Point] => [x, stackedAt(x, spot)]);
  if (!inside || plain.every(([, p]) => inside(p))) return new Map(plain);
  // The spots on each ring, nearest ring first; and those of them inside the area.
  const ring = RINGS.map((r) => Array.from({ length: 360 / ARC }, (_x, i) => polar(i * ARC, r, spot)));
  const free = ring.map((ps) => ps.filter((p) => inside(p)));
  const taken: Point[] = [spot], out = new Map<SlotName, Point>();
  for (const x of who) {
    // Each slot looks from its own angle first, so the same stack looks the same every time.
    const own = stackedAt(x, spot);
    /** The open spot on the nearest ring that has one, the one nearest this slot's own angle. */
    const open = (rings: Point[][], gap: number): Point | undefined => {
      for (const ps of rings) {
        let best: Point | undefined;
        for (const p of ps) if (taken.every((q) => dist(p, q) >= gap) && (!best || dist(p, own) < dist(best, own))) best = p;
        if (best) return best;
      }
      return undefined;
    };
    // Inside the area, closer together if it is tight (a rock's shadow): out of it is where the
    // attack hits. Only an area with no room at all sends a player around it.
    const p = open(free, APART) ?? open(free, TIGHT) ?? open(ring, APART) ?? own;
    taken.push(p);
    out.set(x, p);
  }
  return out;
}

/** Where you went for a step, and its correct area, for the players who stand with you. */
export interface YouAt { p: Point; z?: Zone }

/** Where the party went for an answer: your click when it was correct, else the correct spot. */
export const partyWent = (r: StepResult): Point => (r.ok ? r.p : zoneCenter(r.z));

/** The players drawn with you: every slot but yours. */
export const othersOf = (sc: Scene): SlotName[] => (sc.party ? SLOT_NAMES.filter((x) => x !== sc.party?.slot) : []);

/** Where every player who stands with you at step `st` goes: packed around where you went,
    inside the step's correct area. */
export const withYouAt = (st: Step, you: YouAt): Map<SlotName, Point> => {
  const who = SLOT_NAMES.filter((x) => st.party?.[x] === "you");
  const z = you.z;
  return packAround(who, you.p, z ? (p) => inArena(p) && inZone(p, z) : inArena);
};

/** A party spot on the arena, turned k quarter turns; "you" from the stack around you. */
const placed = (who: SlotName, spot: PartySpot, k: number, stack: Map<SlotName, Point> | null): Point | null =>
  spot === "you" ? (stack?.get(who) ?? null) : rot(spot, k);

/** Where each other player stands before the first step: the scene's start, or the rest formation
    around the boss. In arena units, turned k quarter turns. */
export function partyStart(sc: Scene, k: number): Map<SlotName, Point> {
  const boss = sc.bossAt ? sc.bossAt(0) : (sc.boss ?? { x: 50, y: 50, f: 0 });
  return new Map(othersOf(sc).map((who) => [who, rot(sc.party?.start?.[who] ?? restSpot(who, boss), k)]));
}

/** Where each other player stands once `results` are in, in arena units: their spot for the last
    step answered, and the `early` players of the step asked already at theirs. Empty when the
    scene does not draw the party. */
export function partyNow(sc: Scene, k: number, results: readonly StepResult[]): Map<SlotName, Point> {
  const at = partyStart(sc, k);
  const move = (j: number, only?: readonly SlotName[]): void => {
    const st = sc.steps[j], party = st?.party ?? {};
    const r = results[j], stack = st && r ? withYouAt(st, { p: partyWent(r), z: r.z }) : null;
    for (const who of at.keys()) {
      const spot = party[who];
      if (spot == null || (only && !only.includes(who))) continue;
      const p = placed(who, spot, k, stack);
      if (p) at.set(who, p);
    }
  };
  results.forEach((_r, j) => {
    move(j);
  });
  const asked = sc.steps[results.length];
  if (asked?.early) move(results.length, asked.early);
  return at;
}

/** Each other player's route through the full fight, from the party spots of every mechanic that
    draws the party. `youAt` is where the party went for step j of mechanic si: the correct spot
    on the player, or your answer in the run. `answeredAt` is when you answered it in the run
    (undefined while it is not answered yet, so the players wait); the player leaves it out. */
export function partyRoutes(
  f: Fight,
  youAt: (si: number, j: number) => YouAt | null,
  answeredAt?: (si: number, j: number) => number | undefined,
): Map<SlotName, Stop[]> {
  const routes = new Map<SlotName, Stop[]>(SLOT_NAMES.map((who) => [who, []]));
  f.segs.forEach((g, si) => {
    if (!g.scene.party) return;
    for (const who of othersOf(g.scene)) routes.get(who)?.push(...segStops(g, si, who, youAt, answeredAt));
  });
  for (const r of routes.values()) r.sort((a, b) => a.hit - b.hit);
  return routes;
}

/** One player's stops in one mechanic. A start spot of the mechanic is a stop of its own: they go
    there once the mechanic appears, not before, since the spot can tell what the mechanic is (the
    tanks' spots for the scythe). */
function segStops(
  g: FightSeg,
  si: number,
  who: SlotName,
  youAt: (si: number, j: number) => YouAt | null,
  answeredAt?: (si: number, j: number) => number | undefined,
): Stop[] {
  const start = g.scene.party?.start?.[who];
  // On the split arena the rest formation is the gap between the platforms, so there they go
  // straight to their start, where the last mechanic left them, and never rest.
  const out: Stop[] = start
    ? [{ p: rot(start, g.k), hit: g.from, show: g.from, si, j: -1, ...(g.scene.split ? { pre: rot(start, g.k) } : {}) }]
    : [];
  g.scene.steps.forEach((st, j) => {
    const spot = st.party?.[who];
    if (spot == null) return;
    const you = spot === "you" ? youAt(si, j) : null;
    const p = placed(who, spot, g.k, you && withYouAt(st, you));
    if (!p) return;
    const early = st.early?.includes(who) ?? false;
    // In the run a player goes only once you answered the step; until then they wait.
    const click = answeredAt && !early ? (answeredAt(si, j) ?? Number.POSITIVE_INFINITY) : undefined;
    // The pre-position of the whole party, known in advance, when they go with you first.
    const pre = out.length === 0 && spot === "you" ? g.pre : undefined;
    // A knockback throws them too, from the step's source or from their own (each tower its soakers).
    const knock = st.knock ? { knock: { from: rot(st.partyKnock?.[who] ?? st.knock.from, g.k), dist: st.knock.dist } } : {};
    out.push({ p, hit: g.due[j], show: showOf(g, j), si, j, ...(pre ? { pre } : {}), ...(click != null ? { click } : {}), ...knock });
  });
  return out;
}
