// Arena pictures for the Mechanics questions. Each one shows the setup. Before you lock in an
// answer, you can see each answer drawn on it, right or wrong, in one neutral colour, together
// with the boss attack that answer assumes: a spread draws one AoE on each player, a stack one
// shared AoE, clock spots draw protean cones, and so on. So the quiz also asks what the boss
// does, not only where you go. After you answer, the picture shows what the mechanic really
// does and the right spot in green. Where a map drill already draws the same moment, the
// picture is built from that drill, so the two always agree.
import { bySlot, withSeed } from "../util";
import { markRole, partyOf } from "../party";
import { angOf, polar, rotOverlay, zoneCenter } from "../geometry";
import { DRILLS, BOSS, AXE_TANKS, AXE_SPREAD_SPOTS, CLOCK, DANCE_PAIRS, faceApproach, nextPuddle, FIXED_SPREAD_MARKS, SCYTHE_CLEAVES, HELD_TAG, heldWeapon, buildRun, buildOrbital, atAngle, cometSpread, type WeaponRun, type Weapon, type WeaponType } from "./drills";
import { PUDDLE_R, RAIDWIDE_R, SPREAD_R, PROTEAN_HALF, PROTEAN_LEN, WALL_W, TOWER_R, METEOR_R, RAW_TANK_HALF, RAW_STACK_HALF, aoe, axeHit, cleave, donut, lineTo, swordCross } from "./attacks";
import type { Boss, Picture, MarkRole, Overlay, Point, Preview, RectZone, Slot, StepResult, Zone, ZoneShape } from "../types";

type Who = [string, MarkRole];
const tag = (x: number, y: number, s: string): Overlay => ({t:"tag", x, y, s});
const mark = (x: number, y: number, l: string, r: MarkRole): Overlay => ({t:"mark", x, y, l, r});
const target = (p: Point): Overlay => ({t:"target", x:p[0], y:p[1]});
const guide = (a: Point, b: Point): Overlay => ({t:"guide", x:a[0], y:a[1], x2:b[0], y2:b[1]});
const puddle = (p: Point, r = PUDDLE_R): Overlay => ({t:"puddle", x:p[0], y:p[1], r});
const circle = (c: Point, r: number): ZoneShape => ({c, r});
// TS note: the return type is RectZone, not the wider ZoneShape, so a rectangle can also go
// where only a Zone fits (youIn takes a Zone, and a polygon is not one).
const rect = (x0: number, y0: number, x1: number, y1: number): RectZone => ({rect:[x0, y0, x1, y1]});
/** The point r units from c, a degrees clockwise from north. */
const at = polar;
/** A line of text on the map, for answers that are not a place. */
const say = (text: string, y = 94): Overlay => tag(50, y, text);
/** The boss with no facing arrow. */
const STILL: Boss = {x:50, y:50, f:null};
const CENTER: Point = [50, 50];

/* ---------- the party ---------- */
const ALL: Who[] = [["MT", "T"], ["OT", "T"], ["M1", "D"], ["M2", "D"], ["H1", "H"], ["H2", "H"], ["R1", "D"], ["R2", "D"]];
const TANKS = ALL.slice(0, 2), NONTANK = ALL.slice(2);
const G1: Who[] = [["MT", "T"], ["H1", "H"], ["M1", "D"], ["R1", "D"]], G2: Who[] = [["OT", "T"], ["H2", "H"], ["M2", "D"], ["R2", "D"]];
/** Everyone but the healers, who are busy with their own markers. */
const NO_HEALERS: Who[] = ALL.filter(([l]) => l[0] !== "H");
/** Pairs: a support with a DPS. */
const PAIRED: Who[] = [["MT", "T"], ["M1", "D"], ["OT", "T"], ["M2", "D"], ["H1", "H"], ["R1", "D"], ["H2", "H"], ["R2", "D"]];
/** Role marks packed in rows of `cols` around c: a stack. */
function cluster(c: Point, who: Who[] = ALL, cols = 4): Overlay[] {
  const rows = Math.ceil(who.length / cols), gap = 5.6;
  return who.map(([l, r], i) => {
    const row = Math.floor(i / cols), n = Math.min(cols, who.length - row * cols);
    return mark(c[0] + (i % cols - (n - 1) / 2) * gap, c[1] + (row - (rows - 1) / 2) * gap, l, r);
  });
}
// TS note: `mark(...at(a, r, c), l, role)` spreads the Point tuple into the x and y parameters.
// TypeScript allows it because it knows a Point has exactly two numbers.
/** Role marks on a ring of radius r around c, from angle a0, `step` degrees apart. */
const ring = (who: Who[], r: number, a0 = 0, step = 360 / who.length, c: Point = CENTER): Overlay[] =>
  who.map(([l, role], i) => mark(...at(a0 + i * step, r, c), l, role));
/** Everyone on their clock spot, r units from c, for a boss facing f (degrees clockwise from north). */
const clockRing = (r: number, c: Point = CENTER, f = 0): Overlay[] => ALL.map(([l, role]) => mark(...at(f + CLOCK[l], r, c), l, role));
/** The pairs, two marks side by side at each spot. */
const pairsAt = (spots: Point[]): Overlay[][] => spots.map((p, i) => cluster(p, PAIRED.slice(i * 2, i * 2 + 2), 2));

/* ---------- the boss attacks an answer assumes ---------- */
const RAIDWIDE = aoe(CENTER, RAIDWIDE_R);
/* Made-up attacks, drawn only in wrong answers. They are not in the fight, so BossMod has no
   size for them. The real sizes are in data/attacks.ts. */
const FAKE = {buster:7, platformBuster:6, circle:35, bigCircle:40, smallCircle:9, axeDonut:18, voidDonut:11, tripleDonut:12, line:10};
/** Where the role marks in a list stand. */
const spotsOf = (os: Overlay[]): Point[] => os.flatMap((o): Point[] => o.t === "mark" ? [[o.x, o.y]] : []);
/** A spread: one AoE on every player. */
const spreadHits = (os: Overlay[], r = SPREAD_R): Overlay[] => spotsOf(os).map(p => aoe(p, r));
/** A stack: one AoE that the whole group shares, centered on the group, never smaller than the
    6-yalm stack. */
function stackHit(os: Overlay[], pad = 4.5): Overlay {
  const ps = spotsOf(os), c: Point = [ps.reduce((n, p) => n + p[0], 0) / ps.length, ps.reduce((n, p) => n + p[1], 0) / ps.length];
  return aoe(c, Math.max(SPREAD_R, Math.max(0, ...ps.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))) + pad));
}
/** Proteans: a cone from `from` toward every player. */
const proteans = (from: Point, os: Overlay[]): Overlay[] => spotsOf(os).map(p => cleave(from, angOf([p[0] - from[0], p[1] - from[1]]), PROTEAN_HALF, PROTEAN_LEN));
/** A cone from `from` toward one spot. */
const coneTo = (from: Point, to: Point, half = 12, r = 60): Overlay => cleave(from, angOf([to[0] - from[0], to[1] - from[1]]), half, r);
/** One half of the arena, as a cleave: front is "north" for a boss facing north. */
const half = (side: "north" | "south"): Overlay => ({t:"lane", rect:side === "north" ? [0, 0, 100, 50] : [0, 50, 100, 100]});

/* ---------- answer previews ---------- */
const other = (s: Slot): Slot => s === "H1" ? "H2" : "H1";
const show = (pieces: Overlay[], zones: ZoneShape[] = []): Preview => ({pieces, zones});
/** A preview with the attack it assumes drawn under it. */
const hit = (p: Preview, attack: Overlay[]): Preview => ({pieces:[...attack, ...p.pieces], zones:p.zones});
/** Your own mark. */
const you = (s: Slot, p: Point): Overlay => mark(p[0], p[1], s, markRole(partyOf(s).role));
/** You at p, with that spot circled. */
const youAt = (s: Slot, p: Point, r = 5, more: Overlay[] = []): Preview => show([you(s, p), ...more], [circle(p, r)]);
/** You in zone z: at `p` when the zone has a best spot (see Step.stand), else at its shown spot. */
const youIn = (s: Slot, z: Zone, p?: Point): Preview => show([you(s, p ?? zoneCenter(z))], [z]);

/** One step of a map drill as a picture: its floor, boss and pieces, then what it hits and its
    answer zone, with you on your spot (on top of the boss's ring, which can cover a close spot). */
function fromDrill(id: string, s: Slot, v: string | null = null, k = 0): Picture & {zone: Zone; hits: Overlay[]} {
  const m = DRILLS.find(x => x.id === id);
  if(!m) throw new Error("missing drill " + id);
  const sc = m.build(s, v), st = sc.steps[k];
  if(!st.z) throw new Error(id + " step " + k + " has no fixed zone");
  // `hits` is what the step hits, without you, for previews that draw their own players.
  const hits = st.reveal ?? [];
  return {overlays:sc.overlays, boss:sc.boss ?? sc.bossAt?.(k), split:sc.split, after:[...hits, you(s, st.stand ?? zoneCenter(st.z))], answer:[st.z], zone:st.z, hits};
}

/** The boss jumps from the middle to one weapon. `zone` is your spot, `zoneOther` your co-healer's,
    and `hits` what the weapon really does. The question names the weapon, so its name tag is
    left out: the boss stands on it anyway. */
function jump(s: Slot, type: WeaponType, a: number) {
  const W: Weapon[] = [{a, p:atAngle(a), type}], R = buildRun(s, W), st = R.steps[0], b = R.states[1], st2 = buildRun(other(s), W).steps[0];
  if(!st.z || !st2.z) throw new Error("a weapon step has no zone");
  // The answer shows you on your spot, on top of the boss's ring: a close spot is under it.
  const fig: Picture = {overlays:[guide(CENTER, [b.x, b.y]), ...R.overlays.filter(o => o.t !== "tag")], boss:b,
    after:[...(st.reveal ?? []), you(s, st.stand ?? zoneCenter(st.z))], answer:[st.z]};
  return {fig, b, at:[b.x, b.y] as Point, zone:st.z, zoneOther:st2.z, hits:st.reveal ?? [], stand:st.stand, standOther:st2.stand};
}

/** A run's pieces with each weapon's name outside it (41 units out), clear of the order
    numbers that go between the weapon and the boss. */
const named = (R: WeaponRun): Overlay[] => [...R.overlays.filter(o => o.t !== "tag"),
  ...R.W.map((w, i): Overlay => ({...tag(...at(w.a, 41), w.type.toUpperCase()), spawn:i}))];

// TS note: Array<[number, WeaponType]> is an array of pairs. Each `[a, type]` in map() unpacks
// one pair, so the code reads like the data.
const weapons = (list: Array<[number, WeaponType]>): Weapon[] => list.map(([a, type]): Weapon => ({a, p:atAngle(a), type}));
/** A second-set weapon, turned `turn` degrees away from lying square across the line to the boss. */
/** A label between weapon w and the boss: its place in the order, or "?". */
const numAt = (w: Weapon, l: string): Overlay => tag(...at(w.a, 16), l);
/** The boss's jumps, from the middle through the given spots in turn. */
const path = (spots: Point[]): Overlay[] => spots.map((p, i) => guide(i ? spots[i - 1] : CENTER, p));
/** Order labels on weapons, given as places in W (order[0] goes first), and his jumps in that order. */
const inOrder = (W: Weapon[], order: number[]): Overlay[] => [...path(order.map(i => W[i].p)), ...order.map((i, n) => numAt(W[i], String(n + 1)))];

/* Ultimate Trophy Weapons, clockwise: the first spawns south and slightly west, the last north. */
const ULT: Array<[number, WeaponType]> = [[200, "sword"], [315, "axe"], [90, "scythe"], [180, "axe"], [270, "sword"], [0, "scythe"]];
const ultRun = (s: Slot) => buildRun(s, weapons(ULT));
/** The pieces of the weapons whose spawn index passes `keep`, with their order numbers. */
function ultPart(s: Slot, keep: (i: number) => boolean): Overlay[] {
  const R = ultRun(s);
  return [...named(R).filter(o => o.spawn != null && keep(o.spawn)), ...R.W.map((w, i) => numAt(w, String(i + 1))).filter((_o, i) => keep(i))];
}
/** Order labels for weapon spots with no weapon drawn yet ([angle, label] pairs, where the order
    numbers go), and the boss's jumps through those spots after the first weapon (south, slightly west). */
const spotTags = (list: Array<[number, string]>, jumps = true): Overlay[] =>
  [...(jumps ? path([atAngle(200), ...list.map(([a]) => atAngle(a))]).slice(1) : []), ...list.map(([a, l]) => tag(...at(a, 16), l))];

/* Void Stardust: the three puddles at their usual spots, north of the boss and clockwise. The
   drill's own rule (nextPuddle) places the second and third, so the sizes always agree. */
const asDrops = (ps: Point[]): StepResult[] => ps.map(p => ({p, ok:true, z:{c:p, r:5}, drop:p}));
const PUDDLES: Point[] = [1, 2].reduce((ps: Point[]) => [...ps, zoneCenter(nextPuddle(asDrops(ps)))], [[50, 33]]);
const PUDDLE_PIECES = PUDDLES.map(p => puddle(p));
const VOID_RESULTS = asDrops(PUDDLES);
/** The party stacked past the third puddle, below waymark B. */
const STACK_SPOT: Point = [75, 66];
const stackedMarks = cluster(STACK_SPOT, ALL, 2);
/** Where a role stands in that stack. */
const inStack = (l: string): Point => { const i = ALL.findIndex(w => w[0] === l), m = stackedMarks[i]; return m.t === "mark" ? [m.x, m.y] : STACK_SPOT; };
/** Pair spots at the four cardinals, just outside the waymarks. */
const GAPS: Point[] = [[50, 15], [86, 50], [50, 85], [14, 50]];

/* Arena Split: the platforms (x 0 to 25.5 and 74.5 to 100) and the four first towers. */
const WEST = rect(0, 0, 25.5, 100), EAST = rect(74.5, 0, 100, 100);
const TOWER_NW: Point = [11, 23], TOWER_NE: Point = [89, 23], TOWER_SW: Point = [11, 77], TOWER_SE: Point = [89, 77];

/* Raw Steel Trophy: where the tanks and the party stand for each weapon. */
const TANKS_APART = [mark(37, 36, "MT", "T"), mark(63, 36, "OT", "T")];
const TANKS_TOGETHER = [mark(AXE_TANKS[0] - 3, AXE_TANKS[1], "MT", "T"), mark(AXE_TANKS[0] + 3, AXE_TANKS[1], "OT", "T")];
/** The axe spread: each of the six at their wtfdig spot (see drills.ts). */
const AXE_SPREAD = NONTANK.map(([l, r]) => mark(...AXE_SPREAD_SPOTS[l], l, r));
/** The axe: the tanks share one buster, and the other six spread. */
const AXE_HITS = [stackHit(TANKS_TOGETHER, 4), ...spreadHits(AXE_SPREAD)];

/** One picture per Mechanics question, by question id. The tests check that every question has
    one, and that `options` has one preview for each of its answers, in the question's order. */
// TS note: Partial<Record<string, ...>> says any key may be missing, so a lookup returns
// the function or undefined, and the caller must check before it calls it.
export const LEARN_PICTURES: Partial<Record<string, (s: Slot) => Picture>> = {
  "k-raw-first": s => { const d = fromDrill("m-raw-scythe", s), north = cluster([50, 35], NONTANK, 3), all = clockRing(33);
    return {overlays:heldWeapon("scythe"), boss:BOSS, after:[...TANKS_APART, ...SCYTHE_CLEAVES, ...cluster([50, 66], NONTANK, 3)], answer:d.answer, options:[
      show([...SCYTHE_CLEAVES, ...TANKS_APART, ...cluster([50, 66], NONTANK, 3)]),
      show([...AXE_HITS, ...TANKS_TOGETHER, ...AXE_SPREAD]),
      show([...proteans(CENTER, all), ...all]),
      show([cleave(CENTER, 317, RAW_TANK_HALF), cleave(CENTER, 43, RAW_TANK_HALF), cleave(CENTER, 0, RAW_STACK_HALF), ...TANKS_APART, ...north])]}; },
  "k-raw-second": s => { const d = fromDrill("m-raw-scythe", s);
    return {overlays:[tag(50, 8, "0:18 WAS AXE")], boss:BOSS, before:[tag(...HELD_TAG, "?")], after:[...d.overlays, ...SCYTHE_CLEAVES, ...cluster([50, 66], NONTANK, 3)], answer:d.answer, options:[
      show([...SCYTHE_CLEAVES, ...heldWeapon("scythe"), ...TANKS_APART]),
      show([...AXE_HITS, ...heldWeapon("axe"), ...TANKS_TOGETHER, ...AXE_SPREAD]),
      show([tag(...HELD_TAG, "AXE OR SCYTHE")]),
      show([...swordCross(CENTER, [0, -1]), ...heldWeapon("sword")])]}; },
  "k-first-weapon": s => { const R = buildRun(s, weapons([[315, "scythe"], [90, "axe"], [180, "sword"]])), W = R.W;
    return {overlays:named(R), boss:R.states[0], after:inOrder(W, [0, 1, 2]), answer:[circle(W[0].p, 9)], options:[
      show(inOrder(W, [0, 1, 2]), [circle(W[0].p, 9)]),
      show([...path([W[2].p]), numAt(W[2], "1"), say("ALWAYS THE SWORD FIRST", 8)], [circle(W[2].p, 9)]),
      show([mark(66, 42, "MT", "T"), ...inOrder(W, [1, 0, 2])], [circle(W[1].p, 9)]),
      show(W.map(w => numAt(w, "?")))]}; },
  "k-sword": s => { const j = jump(s, "sword", 270), around = clockRing(14, j.at, j.b.f ?? 0), mid = cluster(CENTER);
    return {...j.fig, options:[hit(youIn(s, j.zone, j.stand), j.hits), hit(youIn(s, j.zoneOther, j.standOther), j.hits),
      show([...proteans(j.at, around), ...around]), show([axeHit(j.at), stackHit(mid), ...mid])]}; },
  "k-axe": s => { const j = jump(s, "axe", 90), mid = cluster(zoneCenter(j.zone)), spread = clockRing(14, j.at, j.b.f ?? 0);
    const lp = [cluster([62, 30], G1, 2), cluster([62, 70], G2, 2)], close = cluster([66, 50], ALL, 2);
    return {...j.fig, options:[
      show([...j.hits, stackHit(mid), ...mid], [j.zone]), show([...spreadHits(spread), ...spread]),
      show([...lp.map(g => stackHit(g)), ...lp.flat()]), show([donut(j.at, FAKE.axeDonut), stackHit(close), ...close])]}; },
  "k-scythe": s => { const j = jump(s, "scythe", 180), lp = cluster([30, 66], bySlot(s, {H1:G1, H2:G2}), 2);
    return {...j.fig, options:[hit(youIn(s, j.zone), j.hits), hit(youIn(s, j.zoneOther), j.hits),
      hit(youAt(s, [50, 8]), [aoe(j.at, FAKE.circle)]), show([stackHit(lp), ...lp])]}; },
  "k-void": s => { const mine = ALL.findIndex(w => w[0] === s), edge = at(22.5 + mine * 45, 40), spread = ring(ALL, 40, 22.5, 45), stack = cluster([50, 36]);
    return {overlays:[], boss:BOSS, after:PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1))), answer:PUDDLES.map(p => circle(p, PUDDLE_R)), options:[
      show([...PUDDLE_PIECES, ...PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1)))]),
      show([...spreadHits(spread), puddle(edge), ...spread, say("3 PUDDLES ON ONE SPOT", 8)]),
      show([puddle([50, 36]), stackHit(stack), ...stack, say("3 PUDDLES UNDER THE STACK", 94)]),
      show([...([[50, 30], [68, 50], [50, 70]] as Point[]).flatMap((p, i) => [puddle(p), tag(p[0], p[1], String(i + 1))])])]}; },
  "k-void-target": s => { const me = inStack(s), stackOn = (l: string): Overlay[] => [aoe(inStack(l), SPREAD_R), target(inStack(l))];
    return {overlays:[...PUDDLE_PIECES, ...stackedMarks], boss:BOSS, after:[...stackOn(s), tag(68, 83, "STACK ON A HEALER")], answer:[circle(me, 5)], options:[
      show([...stackOn(s), tag(68, 83, "STACK")]),
      show([...stackOn("MT"), tag(68, 83, "STACK")]),
      show([...stackOn("R1"), tag(68, 83, "STACK, RANDOM DPS")]),
      show([...spreadHits(stackedMarks), ...ALL.map(([l]) => target(inStack(l))), tag(68, 83, "8 STACKS")])]}; },
  "k-void-spread": s => { const gaps = cometSpread(s)(VOID_RESULTS), spreadWith = (p: Point): Overlay[] => spreadHits([...FIXED_SPREAD_MARKS, you(s, p)]);
    return {overlays:[...PUDDLE_PIECES, ...FIXED_SPREAD_MARKS], boss:BOSS, after:[...spreadWith(zoneCenter(gaps)), you(s, zoneCenter(gaps))], answer:[gaps], options:[
      hit(youIn(s, gaps), spreadWith(zoneCenter(gaps))), hit(youAt(s, [37, 71]), spreadWith([37, 71])),
      show([stackHit(stackedMarks), ...stackedMarks]), hit(youAt(s, [50, 58], 9), [donut(CENTER, FAKE.voidDonut)])]}; },
  "k-void-run": s => { const R = buildRun(s, faceApproach(weapons([[270, "scythe"]]))), toward = cometSpread(s, R.W[0].p)(VOID_RESULTS), lb = zoneCenter(toward);
    const waitAt = bySlot<Point>(s, {H1:[83, 50], H2:[50, 83]});
    return {overlays:[...PUDDLE_PIECES, ...named(R), ...FIXED_SPREAD_MARKS], boss:STILL, after:[aoe(lb, SPREAD_R), you(s, lb), guide(lb, R.W[0].p)], answer:[toward],
      note:"Example: the first weapon of the second set is a scythe in the west.", options:[
        show([aoe(lb, SPREAD_R), you(s, lb), guide(lb, R.W[0].p)], [toward]),
        show([aoe(waitAt, SPREAD_R), you(s, waitAt), say("WAIT FOR HIS FACING", 8)], [cometSpread(s)(VOID_RESULTS)]),
        youAt(s, [70, 44]),
        show([RAIDWIDE, ...stackedMarks, say("MITIGATE, STAY PUT", 8)])]}; },
  "k-assault-2": s => { const R = buildRun(s, faceApproach(weapons([[135, "scythe"], [270, "axe"], [0, "sword"]]))), W = R.W;
    return {overlays:named(R), boss:STILL, after:inOrder(W, [0, 1, 2]), answer:[circle(W[0].p, 9)], options:[
      show(inOrder(W, [0, 1, 2]), [circle(W[0].p, 9)]),
      show([...inOrder(W, [1, 2, 0]), say("THE ONE HE FACED IN SET 1", 94)], [circle(W[1].p, 9)]),
      show(inOrder(W, [2, 1, 0]), [circle(W[2].p, 9)]),
      show([you(s, [24, 33]), ...path([W[1].p]), numAt(W[1], "1")], [circle(W[1].p, 9)])]}; },
  "k-void-2": s => { const gaps = cometSpread(s)(VOID_RESULTS), pairs = pairsAt(GAPS), me = you(s, zoneCenter(gaps));
    return {overlays:[...PUDDLE_PIECES, tag(50, 8, "1ST ENDED: STACK")], boss:BOSS, after:[tag(50, 94, "2ND ENDS: SPREAD"), ...spreadHits([...FIXED_SPREAD_MARKS, me]), ...FIXED_SPREAD_MARKS, me], answer:[gaps], options:[
      show([...spreadHits([...FIXED_SPREAD_MARKS, me]), ...FIXED_SPREAD_MARKS, me], [gaps]),
      show([stackHit(stackedMarks), ...stackedMarks]),
      show([...pairs.map(p => stackHit(p)), ...pairs.flat()]),
      show([aoe([50, 36], FAKE.buster), mark(50, 36, "MT", "T"), target([50, 36]), say("TANK BUSTER", 94)])]}; },
  // The pairs at their wtfdig spots. The tank and melee pairs stand on waymarks D and B, so they
  // show as their stack only, and the waymarks stay readable.
  "k-dance": s => { const d = fromDrill("m-dance", s), pairs = [cluster(DANCE_PAIRS.H1, PAIRED.slice(4, 6), 2), cluster(DANCE_PAIRS.H2, PAIRED.slice(6, 8), 2)];
    const tankPairs = [aoe(DANCE_PAIRS.MT, SPREAD_R), aoe(DANCE_PAIRS.OT, SPREAD_R)];
    return {overlays:[tag(50, 8, "DANCE OF DOMINATION")], boss:d.boss, after:[RAIDWIDE, ...d.overlays, ...bySlot(s, {H1:pairs[0], H2:pairs[1]}), tag(50, 16, "7 HITS, THEN PAIRS")], answer:d.answer, options:[
      show([RAIDWIDE, ...d.hits, ...tankPairs, ...pairs.map(p => stackHit(p)), ...pairs.flat(), tag(50, 16, "7 RAIDWIDES, THEN PAIRS")]),
      show([aoe([50, 36], FAKE.buster), mark(50, 36, "MT", "T"), target([50, 36]), tag(50, 16, "ONE TANK BUSTER")]),
      show([RAIDWIDE, tag(50, 16, "EVERYONE TO 1 HP")]),
      show([...d.overlays, tag(50, 16, "NO DAMAGE")])]}; },
  // The lines are turned so the open side is east. Then "new north" lands on a different side for each answer.
  "k-dance-north": s => { const lines = fromDrill("m-dance", s).overlays.map(o => rotOverlay(o, 3)), open = rect(88, 12, 100, 88);
    const north = (p: Point): Overlay => tag(p[0], p[1], "NEW NORTH"), south = (p: Point): Overlay => tag(p[0], p[1], "NEW SOUTH");
    return {overlays:lines, boss:{x:50, y:50, f:180}, after:[north([11, 50]), south([89, 50])], answer:[open], options:[
      show([north([11, 50]), south([89, 50])], [open]),
      show([north([50, 6]), south([50, 94])]),
      show([north([50, 94]), south([50, 6])]),
      show([north([17, 6])])]}; },
  "k-dance-pair": s => { const d = fromDrill("m-dance", s), d2 = fromDrill("m-dance", other(s)), partner: Who = [bySlot(s, {H1:"R1", H2:"R2"}), "D"];
    /** You and your pair partner at spot p, with the pair stack on you both. */
    const pair = (p: Point, z: ZoneShape, who: Who = partner): Preview => { const two = cluster(p, [[s, "H"], who], 2); return show([stackHit(two), ...two], [z]); };
    const own = zoneCenter(d.zone), oth = zoneCenter(d2.zone), all = ring(ALL, 9, 0, 45);
    return {...d, options:[pair(own, d.zone), pair(oth, d2.zone), pair([62, 50], circle([62, 50], 6), ["MT", "T"]), show([stackHit(all), ...all], [circle(CENTER, 13)])]}; },
  "k-charyb": () => { const mt = at(22.5, 20);
    return {overlays:ring(ALL, 20, 22.5, 45), boss:BOSS, after:[RAIDWIDE, say("EVERYONE AT 1 HP", 8)], options:[
      show([RAIDWIDE, say("EVERYONE AT 1 HP", 8)]), show([aoe(mt, FAKE.buster), target(mt), say("THE TANK DIES", 8)]),
      show([aoe(mt, FAKE.buster), target(mt), say("TANK BUSTER", 8)]), show([say("NOTHING HAPPENS", 8)])]}; },
  "k-ult-spawn": s => { const R = ultRun(s), cw: Array<[number, string]> = [[315, "2"], [90, "3"], [180, "4"], [270, "5"], [0, "6"]];
    return {overlays:ultPart(s, i => i === 0), boss:STILL, after:ultPart(s, i => i > 0), answer:[circle(R.W[1].p, 9)], options:[
      show(spotTags(cw), [circle(at(315, 29), 7)]),
      show(spotTags([[45, "2"], [270, "3"], [180, "4"], [90, "5"], [0, "6"]]), [circle(at(45, 29), 7)]),
      show(spotTags([[60, "?"], [110, "?"], [250, "?"], [300, "?"], [20, "?"]], false)),
      show([...spotTags(cw, false), say("ALL SIX AT ONCE", 8)])]}; },
  // Each tornado cones its two closest players, so a bait draws a cone from that tornado to you.
  "k-ult-tornado": s => { const d = fromDrill("m-tornado", s), d2 = fromDrill("m-tornado", other(s));
    const own = bySlot<Point>(s, {H1:[20, 50], H2:[80, 50]}), oth = bySlot<Point>(s, {H1:[80, 50], H2:[20, 50]}), cone = (from: Point, z: Zone): Overlay => coneTo(from, zoneCenter(z), 14, 22);
    return {...d, options:[hit(youIn(s, d.zone), [cone(own, d.zone)]), hit(youIn(s, d2.zone), [cone(oth, d2.zone)]),
      hit(youAt(s, [40, 16], 6.5), [coneTo([50, 16], [40, 16], 14, 22)]), youAt(s, [57, 57], 9)]}; },
  "k-ult-touch": s => { const d = fromDrill("m-tornado", s), me = bySlot<Point>(s, {H1:[12, 42], H2:[88, 58]}), into = bySlot<Point>(s, {H1:[20, 50], H2:[80, 50]});
    // The words go on the side of the tornado away from your mark: below it for H1, above it for H2.
    const dy = bySlot(s, {H1:1, H2:-1}), near = (a: string, b?: string): Overlay[] => [tag(into[0], into[1] + 9 * dy, a), ...(b ? [tag(into[0], into[1] + 14 * dy, b)] : [])];
    return {overlays:[...d.overlays, you(s, me), guide(me, into)], boss:d.boss, after:near("KNOCKBACK", "DAMAGE DOWN"), answer:d.answer,
      note:"The green spot is where you bait: at the edge of your tornado, not in it.", options:[
        show(near("KNOCKBACK", "DAMAGE DOWN")), show(near("NOTHING HAPPENS")), show(near("YOU DIE")), show(near("YOU GET HEALED"))]}; },
  "k-gwof": () => { const line: Overlay = {t:"band", x:50, y:50, x2:50, y2:-20, w:WALL_W}, tanks: Point = [50, 33], stack = cluster([30, 66], NONTANK, 3);
    const spread = ring(NONTANK, 26, 60, 48), tankMarks = [mark(47, 33, "MT", "T"), mark(53, 33, "OT", "T")];
    return {overlays:tankMarks, boss:BOSS, after:[line, say("2 TANK BUSTERS", 8)], answer:[circle(tanks, 7)],
      note:"Heal the tanks (green). The fire line stays on the floor, so keep out of it.", options:[
        show([line, say("2 TANK BUSTERS", 8)], [circle(tanks, 7)]),
        show([RAIDWIDE, say("RAIDWIDE", 8)]),
        show([stackHit(stack), ...stack, target([30, 66]), say("STACK ON A HEALER", 94)]),
        show([...proteans(CENTER, [...tankMarks, ...spread]), ...spread])]}; },
  "k-orbital": s => { const sides = [{poly:[[50, 50], [0, 0], [0, 100]] as Point[]}, {poly:[[50, 50], [100, 0], [100, 100]] as Point[]}];
    const frontBack: Overlay[] = [{t:"poly", pts:[[50, 50], [0, 0], [100, 0]]}, {t:"poly", pts:[[50, 50], [0, 100], [100, 100]]}];
    return {overlays:[], boss:BOSS, after:[...frontBack, you(s, bySlot<Point>(s, {H1:[36, 52], H2:[64, 52]}))], answer:sides, options:[
      show([...frontBack, you(s, bySlot<Point>(s, {H1:[36, 52], H2:[64, 52]}))], sides),
      hit(youAt(s, [50, 64]), [half("north")]), hit(youAt(s, [50, 36]), [half("south")]), hit(youAt(s, [50, 94]), [aoe(CENTER, FAKE.circle)])]}; },
  "k-orbital-move": s => {
    const O = withSeed("HECT", buildOrbital), [a, b] = O.steps.map(st => st.z);
    if(!a || !b || !("fn" in a) || !("fn" in b)) throw new Error("the Orbital Omen zones are rule zones");
    const route = [guide(a.label, b.label), tag(a.label[0], a.label[1], "START"), tag(b.label[0], b.label[1], "#2")];
    const first = O.steps[0].reveal ?? [];
    return {overlays:O.overlays, boss:BOSS, after:route, answer:[a, b],
      note:"One pattern. Start where the #2 lines cross. After #1, cross the hitbox. After #2, cross back.", options:[
        show([...first, ...route], [a, b]), hit(youAt(s, [50, 96]), [aoe(CENTER, FAKE.circle)]), youAt(s, [50, 36]), youAt(s, [50, 64])]}; },
  "k-meteor-order": s => {
    const SETS: Point[][] = [[[57, 43], [43, 57]], [[43, 43], [26, 74]], [[10, 90], [62, 38]]];
    const M: Who[] = [["M1", "D"], ["M2", "D"]], H: Who[] = [["H1", "H"], ["H2", "H"]], R: Who[] = [["R1", "D"], ["R2", "D"]];
    /** The marks when the groups bait the three sets in this order, a meteor under each, and your spot circled. */
    const order = (groups: Who[][], text?: string): Preview => {
      const pieces = groups.flatMap((g, i) => g.map(([l, r], j) => mark(...SETS[i][j], l, r)));
      const mine = groups.flatMap((g, i) => g.map(([l], j) => l === s ? SETS[i][j] : null)).find(p => p != null);
      return show([...spreadHits(pieces, METEOR_R), ...pieces, ...(text ? [say(text, 8)] : [])], mine ? [circle(mine, 6)] : []);
    };
    return {overlays:SETS.flat().map(target), boss:BOSS, after:[...order([M, H, R]).pieces, say("MELEE > HEALERS > RANGED", 8)],
      answer:[circle(bySlot<Point>(s, {H1:[43, 43], H2:[26, 74]}), 6)], options:[order([M, H, R]), order([H, R, M]), order([TANKS, TANKS, TANKS], "TANKS ONLY"), order([R, M, H])]}; },
  "k-meteor-drop": s => { const d = fromDrill("m-meteor-2", s), d2 = fromDrill("m-meteor-2", other(s)), stack = cluster([65, 35], NO_HEALERS.concat([[s, "H"]]));
    const meteor = (z: Zone): Overlay => aoe(zoneCenter(z), METEOR_R);
    return {...d, options:[hit(youIn(s, d.zone), [meteor(d.zone)]), hit(youIn(s, d2.zone), [meteor(d2.zone)]),
      hit(youAt(s, [64, 36]), [aoe([64, 36], METEOR_R)]), show([stackHit(stack), aoe([65, 35], METEOR_R), ...stack], [circle([65, 35], 10)])]}; },
  "k-meteor-stack": () => { const ne = cluster([67, 33], NO_HEALERS, 3), sw = cluster([33, 67], NO_HEALERS, 3), under = ring(NO_HEALERS, 7.5, 0, 60), spread = ring(NO_HEALERS, 36, 30, 60);
    return {overlays:[{t:"rock", x:57, y:43}, {t:"rock", x:43, y:57}, target([43, 43]), target([26, 74])], boss:BOSS,
      after:[lineTo(CENTER, [65, 35])], answer:[circle([65, 35], 7)], options:[
        show([lineTo(CENTER, [67, 33]), ...ne], [circle([67, 33], 9)]),
        show([lineTo(CENTER, [33, 67]), ...sw], [circle([33, 67], 9)]),
        show([stackHit(under), ...under], [circle(CENTER, 9)]),
        show([...spreadHits(spread), ...spread])]}; },
  "k-triple": s => { const d = fromDrill("m-meteor-4", s, null, 1), spread = ring(ALL, 44, 22.5, 45);
    return {...d, options:[hit(youAt(s, [6, 94], 6), [lineTo(CENTER, [6, 94], FAKE.line)]), hit(youAt(s, [50, 58], 9), [donut(CENTER, FAKE.tripleDonut)]),
      hit(youAt(s, [67, 33], 6), [lineTo(CENTER, [67, 33], FAKE.line)]), show([aoe(CENTER, FAKE.bigCircle), ...spread])]}; },
  // Flatliner knocks everyone back from the boss before the split, so each spot gets a knockback arrow.
  "k-split-side": s => { const d = fromDrill("m-split-line", s);
    const WN = rect(0, 8, 26, 48), WS = rect(0, 52, 26, 92), EN = rect(74, 8, 100, 48), ES = rect(74, 52, 100, 92);
    const knocked = (z: RectZone): Preview => hit(youIn(s, z), [guide(CENTER, zoneCenter(z))]);
    return {...d, options:[knocked(bySlot(s, {H1:WN, H2:ES})), knocked(bySlot(s, {H1:WS, H2:EN})), knocked(bySlot(s, {H1:EN, H2:WS})), youAt(s, [50, 60], 9)]}; },
  "k-split-kb": s => { const d = fromDrill("m-split-tower", s), me = bySlot<Point>(s, {H1:[11, 27], H2:[89, 73]}), to = bySlot<Point>(s, {H1:[88, 27], H2:[12, 73]}), same = bySlot<Point>(s, {H1:[11, 62], H2:[89, 38]});
    return {overlays:d.overlays, boss:BOSS, split:true, before:[you(s, me)], after:[you(s, me), guide(me, to)], answer:[bySlot(s, {H1:EAST, H2:WEST})], options:[
      show([you(s, me), guide(me, to)], [bySlot(s, {H1:EAST, H2:WEST})]),
      show([you(s, me), guide(me, same)], [bySlot(s, {H1:WEST, H2:EAST})]),
      show([you(s, bySlot<Point>(s, {H1:[19, 50], H2:[81, 50]})), say("NO TOWER", 8)]),
      show([you(s, me), guide(me, CENTER)], [circle(CENTER, 10)])]}; },
  // Fire Breath is a cone from the boss to each marked player.
  "k-split-fb": s => { const start = bySlot<Point>(s, {H1:[10, 50], H2:[90, 50]}), inner = bySlot<Point>(s, {H1:[20, 42], H2:[80, 58]}), edge = bySlot<Point>(s, {H1:[4, 50], H2:[96, 50]});
    const tethered = bySlot<Point>(s, {H1:[10, 57], H2:[90, 43]}), tank = mark(...tethered, bySlot(s, {H1:"MT", H2:"OT"}), "T"), breath = (p: Point): Overlay => coneTo(CENTER, p, 12, 60);
    return {overlays:[], split:true, boss:BOSS, before:[you(s, start)], after:[breath(inner), you(s, inner)],
      answer:[bySlot(s, {H1:rect(15, 38, 25.5, 62), H2:rect(74.5, 38, 85, 62)})], options:[
        show([breath(inner), you(s, inner)], [bySlot(s, {H1:rect(15, 38, 25.5, 62), H2:rect(74.5, 38, 85, 62)})]),
        show([breath(edge), you(s, edge)], [bySlot(s, {H1:rect(0, 38, 6, 62), H2:rect(94, 38, 100, 62)})]),
        show([breath(start), you(s, start), tank, guide(tethered, CENTER), tag(tethered[0], tethered[1] + bySlot(s, {H1:6, H2:-6}), "TETHER")]),
        show([breath(start), you(s, start), say("STAND STILL", 8)])]}; },
  "k-split-corner": s => { const markers = bySlot<Point[]>(s, {H1:[[9, 19], [9, 81]], H2:[[91, 19], [91, 81]]}), tethered = bySlot<Point>(s, {H1:[12, 38], H2:[88, 62]});
    const breath = (p: Point): Overlay => coneTo(CENTER, p, 8, 60), corner = bySlot<Point>(s, {H1:[14, 25], H2:[86, 75]}), edge = bySlot<Point>(s, {H1:[3, 40], H2:[97, 60]});
    const nextTo = bySlot<Point>(s, {H1:[12, 45], H2:[88, 55]}), middle = bySlot<Point>(s, {H1:[13, 50], H2:[87, 50]});
    return {overlays:[], split:true, boss:BOSS, before:[you(s, bySlot<Point>(s, {H1:[12, 50], H2:[88, 50]}))], answer:markers.map(p => circle(p, 6.5)),
      note:"Markers go to a corner of your number marker. Tethers go to the platform edge. Ask your lead which corner: outer or inner.", options:[
        show([breath(corner), you(s, corner)], markers.map(p => circle(p, 6.5))),
        show([breath(edge), you(s, edge)], [bySlot(s, {H1:rect(0, 10, 5, 90), H2:rect(95, 10, 100, 90)})]),
        show([breath(nextTo), you(s, nextTo), mark(...tethered, bySlot(s, {H1:"MT", H2:"OT"}), "T"), guide(tethered, CENTER)]),
        hit(youAt(s, middle, 6), [breath(middle)])]}; },
  "k-split-towers23": s => { const d = fromDrill("m-split-tower", s), last = bySlot<Point>(s, {H1:[19, 88], H2:[81, 12]});
    const answer = bySlot(s, {H1:TOWER_SW, H2:TOWER_NE}), first = bySlot(s, {H1:TOWER_NW, H2:TOWER_SE}), odd = bySlot(s, {H1:TOWER_NE, H2:TOWER_SW});
    return {overlays:[...d.overlays, you(s, last)], split:true, boss:BOSS, after:[guide(last, answer)], answer:[circle(answer, TOWER_R)],
      note:"Example: your last tether or marker was in the " + bySlot(s, {H1:"southwest", H2:"northeast"}) + " quadrant.", options:[
        show([guide(last, answer)], [circle(answer, TOWER_R)]),
        show([guide(last, first)], [circle(first, TOWER_R)]),
        show([guide(last, odd), say("CLOSEST TO THE BOSS?", 8)], [circle(odd, TOWER_R)]),
        // The "?" sits toward the platform middle, clear of the number marker next to each tower.
        show([TOWER_NW, TOWER_NE, TOWER_SW, TOWER_SE].map(p => tag(p[0], p[1] + (p[1] < 50 ? 4 : -4), "?")))]}; },
  "k-massive": () => {
    // Spread down the platform, between the number markers at its two ends.
    const ROWS = [27, 42, 57, 72], spread = (g: Who[], x: number): Overlay[] => g.map(([l, r], i) => mark(x, ROWS[i], l, r));
    const stacked = (g: Who[], x: number): Overlay[] => g.map(([l, r], i) => mark(x + (i % 2) * 7, 47 + Math.floor(i / 2) * 7, l, r));
    const apart = [...spread(G1, 12), ...spread(G2, 88)], s1 = stacked(G1, 9), s2 = stacked(G2, 84);
    const stacks = [stackHit(s1), stackHit(s2), ...s1, ...s2, target([9, 47]), target([84, 47]), tag(12.5, 39, "5 HITS"), tag(87.5, 39, "5 HITS")];
    const zones = [circle([12.5, 50.5], 9), circle([87.5, 50.5], 9)];
    return {overlays:[], split:true, boss:BOSS, before:apart, after:stacks, answer:zones, options:[
      show(stacks, zones),
      show([aoe([12, ROWS[0]], FAKE.platformBuster), aoe([88, ROWS[0]], FAKE.platformBuster), ...apart, target([12, ROWS[0]]), target([88, ROWS[0]]), say("TANK BUSTER", 8)]),
      show([...spreadHits(apart), ...apart]),
      show([...apart, ...ROWS.flatMap(y => [guide([12, y], [3, y]), guide([88, y], [97, y])]), say("KNOCKBACK", 8)])]}; },
  // He grabs the platform he faces. Each answer draws the grab where that answer expects it.
  "k-slab": s => { const grab = (r: [number, number, number, number]): Overlay => ({t:"lane", rect:r}), west = grab([0, 0, 25.5, 100]), east = grab([74.5, 0, 100, 100]);
    return {overlays:[], split:true, boss:{x:50, y:50, f:270}, after:[west, tag(13, 50, "GRABBED"), you(s, [87, 40])],
      answer:[EAST], note:"Example: he faces the west platform.", options:[
        show([west, you(s, [87, 40])], [EAST]), show([east, you(s, [13, 40])], [WEST]),
        hit(youAt(s, [50, 62], 10), [west, east]), show([east, you(s, [13, 40]), guide([87, 40], [13, 40])], [WEST])]}; },
  // The markers go on the players outside, so each answer draws a marker on you where you stand.
  "k-ecl-start": s => { const d = fromDrill("m-ecl-start", s), d2 = fromDrill("m-ecl-start", other(s)), marked = (z: Zone): Overlay => target(zoneCenter(z));
    const under = ring([["MT", "T"], ["OT", "T"], ["M1", "D"], ["M2", "D"]], 9, 45, 90);
    return {...d, options:[hit(youIn(s, d.zone), [marked(d.zone)]), hit(youIn(s, d2.zone), [marked(d2.zone)]),
      show([stackHit([...under, you(s, [50, 59])]), ...under, you(s, [50, 59])], [circle(CENTER, 12)]),
      hit(youAt(s, [38, 22]), [target([38, 22]), target([25, 25]), target([75, 25])])]}; },
  "k-ecl-adjust": () => { const up = (x: number): Overlay => guide([x, 74], [x, 36]);
    return {overlays:[mark(25, 25, "R1", "D"), mark(75, 25, "R2", "D"), target([25, 74]), target([75, 74]), mark(25, 74, "H1", "H"), mark(75, 74, "H2", "H"),
      aoe([66, 93], 5), tag(66, 85, "PROXIMITY")], boss:BOSS, after:[up(75)], answer:[circle([75, 74], 7)],
      note:"Example: the proximity AoE is closer to H2, so H2 moves north.", options:[
        show([up(75)], [circle([75, 74], 7)]), show([up(25)], [circle([25, 74], 7)]), show([say("NOBODY MOVES", 8)]), show([up(25), up(75)], [circle([25, 74], 7), circle([75, 74], 7)])]}; },
  "k-ecl-prio": s => { const T: Point[] = [[50, 13], [87, 50], [50, 87], [13, 50]];
    /** Labels on the towers N, E, S, W, and your tower circled when you have one. */
    const labels = (who: string[]): Preview => { const i = who.indexOf(s); return show(T.map((p, k) => tag(p[0], p[1], who[k])), i >= 0 ? [circle(T[i], TOWER_R)] : []); };
    const right = labels(["H1", "H2", "R1", "R2"]);
    return {overlays:T.map(([x, y]): Overlay => ({t:"tower", x, y})), boss:BOSS, after:right.pieces, answer:right.zones,
      note:"Example tower spots. Count clockwise from A: H1 takes the first tower, then H2, R1 and R2.", options:[
        right, labels(["R1", "H2", "H1", "R2"]), labels(["M1", "M2", "?", "?"]), labels(["MT", "OT", "MT", "OT"])]}; },
  // The tether goes to the player in the middle of the tower, so it draws from the boss to whoever the answer puts there.
  // M1 stands on the tower's edge. The answers put you in the middle, just inside the edge,
  // outside the tower, and on the edge.
  "k-ecl-center": s => { const c: Point = [28, 30], m1 = at(135, TOWER_R, c), inside = at(225, TOWER_R * 0.8, c), tether = (p: Point): Overlay => guide(CENTER, p);
    return {overlays:[{t:"tower", x:c[0], y:c[1]}, mark(...m1, "M1", "D")], boss:BOSS, after:[tether(c), you(s, c)], answer:[circle(c, 3.5)], options:[
      hit(youAt(s, c, 3.5), [tether(c)]), hit(youAt(s, inside, 3.5), [tether(inside)]),
      hit(youAt(s, at(225, TOWER_R * 1.45, c), 3.5), [tether(m1)]), hit(youAt(s, at(225, TOWER_R, c), 3.5), [tether(m1)])]}; },
  "k-ecl-tether": s => { const tower: Point = [50, 13], wall: Point = [50, 94];
    return {overlays:[{t:"tower", x:tower[0], y:tower[1]}], boss:BOSS, before:[you(s, tower)],
      after:[guide(tower, wall), guide(wall, [6, 94]), you(s, [6, 94])], answer:[circle([6, 94], 6)],
      note:"Example: your tower is north. Take the tether to the south wall, then clockwise into the southwest corner.", options:[
        show([guide(tower, wall), guide(wall, [6, 94]), you(s, [6, 94])], [circle([6, 94], 6)]),
        youAt(s, tower, 6),
        show([guide(tower, CENTER), you(s, [50, 60])], [circle(CENTER, 10)]),
        show([guide(tower, wall), guide(wall, [94, 94]), you(s, [94, 94])], [circle([94, 94], 6)])]}; },
  // Two-way Fireball is two line stacks from the boss, east and west. Four-way is four line stacks
  // of two players each, NW, NE, SW and SE. Both are 6 yalms wide (BossMod).
  "k-ecl-two": s => { const d = fromDrill("m-ecl-two", s, "north");
    return {...d, after:[...d.hits, you(s, [32, 50])], options:[
      show([lineTo(CENTER, [0, 50]), you(s, [32, 50])], [d.zone]), show([lineTo(CENTER, [100, 50]), you(s, [68, 50])], [rect(60, 43, 84, 57)]),
      hit(youAt(s, [43, 43], 5.5), [lineTo(CENTER, [43, 43])]), show([aoe(CENTER, FAKE.smallCircle), you(s, [50, 58])], [circle(CENTER, 9)])]}; },
  "k-ecl-four": s => { const d = fromDrill("m-ecl-four", s, "south");
    return {...d, options:[
      hit(youIn(s, d.zone), [lineTo(CENTER, zoneCenter(d.zone))]), hit(youAt(s, [43, 43], 5.5), [lineTo(CENTER, [43, 43])]),
      show([lineTo(CENTER, [100, 50]), you(s, [68, 50])], [rect(60, 43, 84, 57)]), hit(youAt(s, [6, 94], 6), [lineTo(CENTER, [6, 94])])]}; },
  "k-hb": s => { const tanks = [mark(47, 31, "MT", "T"), mark(53, 31, "OT", "T")], tower: Point = [50, 31];
    return {overlays:[{t:"tower", x:tower[0], y:tower[1]}], boss:BOSS, before:tanks, after:[aoe(tower, TOWER_R), ...tanks, say("5, THEN 6, THEN 7 HITS", 8)], answer:[circle(tower, TOWER_R)],
      note:"Example spot. The tanks soak the tower, and you heal them between the hits.", options:[
        show([aoe(tower, TOWER_R), ...tanks, say("5, THEN 6, THEN 7 HITS", 8)], [circle(tower, TOWER_R)]),
        show([aoe(tower, TOWER_R), you(s, tower), say("YOU SOAK IT ALONE", 8)], [circle(tower, TOWER_R)]),
        show([...tanks, say("RAISE EVERYONE", 8)]),
        show([RAIDWIDE, ...tanks, say("IT IS THE ENRAGE", 8)])]}; }
};
