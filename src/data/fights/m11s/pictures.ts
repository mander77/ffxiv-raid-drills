// Arena pictures for the Mechanics questions. Each one shows the setup. Before you lock in an
// answer, you can see each answer drawn on it, correct or incorrect, in one neutral colour, together
// with the boss attack that answer assumes: a spread draws one AoE on each player, a stack one
// shared AoE, clock spots draw protean cones, and so on. So the quiz also asks what the boss
// does, not only where you go. After you answer, the picture shows what the mechanic really
// does and the correct spot in green. Where a map drill already draws the same moment, the
// picture is built from that drill, so the two always agree.
import { bySlot, withSeed } from "../../../util";
import { markRole, partyOf } from "../../../party";
import { angOf, dist, polar, rotOverlay, stepZone, zoneCenter } from "../../../geometry";
import { DRILLS, BOSS, AXE_TANKS, AXE_SPREAD_SPOTS, CLOCK, DANCE_PAIRS, faceApproach, nextPuddle, FIXED_SPREAD_MARKS, SCYTHE_CLEAVES, HELD_TAG, heldWeapon, buildJumpSet, buildOrbital, atAngle, cometSpread, SPLIT_INNER, TORNADO_BAITS, FIRE_AND_FURY, FIRST_PUDDLE, SPLIT_TOWER, behind, voidAgain, avalancheScene, firstTowerEnd, firstTowersScene, homeSide, markerCorner, otherSide, platformZone, portalAt, portalLines, portalsOf, splitRound, splitTowers, type SplitEnd, type SplitSide, METEOR_ROCKS, BEHIND_ROCK, type Weapon, type WeaponType } from "./drills";
import { ATTACK, PLATFORM_X, PUDDLE_R, SPREAD_R, TOWER_R, TOWER_KNOCKBACK, axeHit, fireBreath, gust, inYalms, kickTower, lineStack, meteorHit, pairTower, proteanCone, proximityDot, raidwide, sharedCone, soloTower, spreadHit, swordCross, tankCone, towerHit, voidPuddle, WALL_SECOND_FACING, wallOfFire } from "./attacks";
import type { Boss, Picture, MarkRole, Overlay, Point, Preview, RectZone, Scene, Slot, StepResult, Zone, ZoneShape } from "../../../types";

type Who = [string, MarkRole];
const tag = (x: number, y: number, s: string): Overlay => ({t:"tag", x, y, s});
const mark = (x: number, y: number, l: string, r: MarkRole): Overlay => ({t:"mark", x, y, l, r});
const target = (p: Point): Overlay => ({t:"target", x:p[0], y:p[1]});
const guide = (a: Point, b: Point): Overlay => ({t:"guide", x:a[0], y:a[1], x2:b[0], y2:b[1]});
/** A tether from its portal to a player. */
const tether = (portal: Point, p: Point): Overlay => ({t:"tether", x:portal[0], y:portal[1], x2:p[0], y2:p[1]});
const puddle = voidPuddle;
const circle = (c: Point, r: number): ZoneShape => ({c, r});
// TS note: the return type is RectZone, not the wider ZoneShape, so a rectangle can also go
// where only a Zone fits (youIn takes a Zone, and a polygon is not one).
const rect = (x0: number, y0: number, x1: number, y1: number): RectZone => ({rect:[x0, y0, x1, y1]});
/** The point r units from c, a degrees clockwise from north. */
const at = polar;
/** A throw whose distance no source gives: one knockback arrow to the spot the picture chooses. */
const thrown = ATTACK.thrown;
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
const RAIDWIDE = raidwide();
/* Made-up attacks, drawn only in incorrect answers. They are not in the fight, so BossMod has no
   size for them: these sizes, in yalms, are the app's choice. The real sizes are in attacks.ts.
   `reach` is how far a made-up line or donut runs: past the arena's edge. */
const FAKE = {buster:2.8, platformBuster:2.4, circle:14, bigCircle:16, smallCircle:3.6, axeDonut:7.2, voidDonut:4.4, tripleDonut:4.8, line:4, reach:60};
/** A made-up circle, r yalms. */
const fakeCircle = (c: Point, r: number): Overlay => ATTACK.circle(c, r);
/** A made-up donut, safe within `inner` yalms of c. */
const fakeDonut = (c: Point, inner: number): Overlay => ATTACK.donut(c, inner, FAKE.reach);
/** A made-up line from the boss in the middle through `to`. */
const fakeLine = (to: Point): Overlay => ATTACK.line(CENTER, angOf([to[0] - CENTER[0], to[1] - CENTER[1]]), FAKE.reach, FAKE.line);
/** Where the role marks in a list stand. */
const spotsOf = (os: Overlay[]): Point[] => os.flatMap((o): Point[] => o.t === "mark" ? [[o.x, o.y]] : []);
/** A spread: one AoE on every player, a spread's size unless `hit` draws another. */
const spreadHits = (os: Overlay[], hit = spreadHit): Overlay[] => spotsOf(os).map(p => hit(p));
/** A stack: one AoE that the whole group shares, centered on the group, never smaller than the
    6-yalm stack. It grows to cover the group, `pad` units past the farthest player. */
function stackHit(os: Overlay[], pad = 4.5): Overlay {
  const ps = spotsOf(os), c: Point = [ps.reduce((n, p) => n + p[0], 0) / ps.length, ps.reduce((n, p) => n + p[1], 0) / ps.length];
  return ATTACK.circle(c, inYalms(Math.max(SPREAD_R, Math.max(0, ...ps.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))) + pad)));
}
/** Proteans: a cone from `from` toward every player. */
const proteans = (from: Point, os: Overlay[]): Overlay[] => spotsOf(os).map(p => proteanCone(from, angOf([p[0] - from[0], p[1] - from[1]])));

/** Powerful Gust from one tornado: its cones on its two baits. */
function gustsFrom(t: Point): Overlay[] {
  const b = TORNADO_BAITS.find(x => x.tornado[0] === t[0] && x.tornado[1] === t[1]);
  if(!b) throw new Error("no tornado at " + t.join(","));
  return [...gust(t, b.support), ...gust(t, b.dps)];
}

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
  const W: Weapon[] = [{a, p:atAngle(a), type}], R = buildJumpSet(s, W), st = R.steps[0], b = R.states[1], st2 = buildJumpSet(other(s), W).steps[0];
  if(!st.z || !st2.z) throw new Error("a weapon step has no zone");
  // The answer shows you on your spot, on top of the boss's ring: a close spot is under it.
  const fig: Picture = {overlays:[guide(CENTER, [b.x, b.y]), ...R.overlays.filter(o => o.t !== "tag")], boss:b,
    after:[...(st.reveal ?? []), you(s, st.stand ?? zoneCenter(st.z))], answer:[st.z]};
  return {fig, b, at:[b.x, b.y] as Point, zone:st.z, zoneOther:st2.z, hits:st.reveal ?? [], stand:st.stand, standOther:st2.stand};
}

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
const ultSet = (s: Slot) => buildJumpSet(s, weapons(ULT));
/** The pieces of the weapons whose spawn index passes `keep`, with their order numbers. */
function ultPart(s: Slot, keep: (i: number) => boolean): Overlay[] {
  const R = ultSet(s);
  return [...R.overlays.filter(o => o.spawn != null && keep(o.spawn)), ...R.W.map((w, i) => numAt(w, String(i + 1))).filter((_o, i) => keep(i))];
}
/** Order labels for weapon spots with no weapon drawn yet ([angle, label] pairs, where the order
    numbers go), and the boss's jumps through those spots after the first weapon (south, slightly west). */
const spotTags = (list: Array<[number, string]>, jumps = true): Overlay[] =>
  [...(jumps ? path([atAngle(200), ...list.map(([a]) => atAngle(a))]).slice(1) : []), ...list.map(([a, l]) => tag(...at(a, 16), l))];

/* Void Stardust: the three puddles at their usual spots, north of the boss and clockwise. The
   drill's own rule (nextPuddle) places the second and third, so the sizes always agree. */
const asDrops = (ps: Point[]): StepResult[] => ps.map(p => ({p, ok:true, z:{c:p, r:5}, drop:p}));
const PUDDLES: Point[] = [1, 2].reduce((ps: Point[]) => [...ps, zoneCenter(nextPuddle(asDrops(ps)))], [FIRST_PUDDLE]);
const PUDDLE_PIECES = PUDDLES.map(p => puddle(p));
const VOID_RESULTS = asDrops(PUDDLES);
/** The party stacked one more step clockwise, just past the third puddle, in max melee: the
    drill's stack spot for these puddles (nextPuddle), moved up a unit so the marks clear waymark C. */
const STACK_SPOT: Point = [48, 66];
const stackedMarks = cluster(STACK_SPOT, ALL);
/** Where a role stands in that stack. */
const inStack = (l: string): Point => { const i = ALL.findIndex(w => w[0] === l), m = stackedMarks[i]; return m.t === "mark" ? [m.x, m.y] : STACK_SPOT; };
/** Pair spots at the four cardinals, just outside the waymarks. */
const GAPS: Point[] = [[50, 15], [86, 50], [50, 85], [14, 50]];

/* Void Stardust (Second Time): the boss stays on the third weapon of the second set. Here he
   jumped from NW to NE, so he faces east. The drill (voidAgain) places the puddles, the spread
   and the stack, so the pictures always agree with it. */
const VOID_2_BOSS: Boss = {x:atAngle(45)[0], y:atAngle(45)[1], f:90};
const VOID_2_AT: Point = [VOID_2_BOSS.x, VOID_2_BOSS.y];
/** His jump onto the third weapon. */
const VOID_2_JUMP = guide(atAngle(315), VOID_2_AT);
/** The first three steps of a Void Stardust scene, each puddle where the drill puts it. */
const puddlesOf = (sc: Scene): Point[] => [0, 1, 2].reduce((ps: Point[], i) => {
  const z = stepZone(sc.steps[i], asDrops(ps));
  if(!z) throw new Error("a puddle step has no zone");
  return [...ps, zoneCenter(z)];
}, []);
/** Spots just outside his hitbox, north of him and directly in front of him: incorrect first puddles. */
const VOID_2_OUT = dist(behind(VOID_2_BOSS), VOID_2_AT);
const VOID_2_NORTH: Point = [VOID_2_AT[0], VOID_2_AT[1] - VOID_2_OUT], VOID_2_FRONT: Point = at(90, VOID_2_OUT, VOID_2_AT);
/** How far a puddle's number sits in from its middle, toward the boss, so it stays clear of
    waymark A. The app's choice. */
const NUMBER_IN = 4;
/** Numbered puddles around the boss. */
const numbered = (ps: Point[]): Overlay[] => ps.flatMap((p, i) => {
  const n = at(angOf([VOID_2_AT[0] - p[0], VOID_2_AT[1] - p[1]]), NUMBER_IN, p);
  return [puddle(p), tag(n[0], n[1], String(i + 1))];
});

/* Arena Split: the platforms (PLATFORM_X, from BossMod) and the four towers. */
const WEST = platformZone("west"), EAST = platformZone("east");
/** A platform from y0 to y1. */
const platformPart = (x: readonly [number, number], y0: number, y1: number): RectZone => rect(x[0], y0, x[1], y1);
const TOWER_NW = SPLIT_TOWER.west.north, TOWER_NE = SPLIT_TOWER.east.north, TOWER_SW = SPLIT_TOWER.west.south, TOWER_SE = SPLIT_TOWER.east.south;
/** Where your mark stands in a scene: the drill draws it for you. */
function yourSpot(os: Overlay[], s: Slot): Point {
  const m = os.find(o => o.t === "mark" && o.l === s);
  if(!m || m.t !== "mark") throw new Error("the scene has no mark for " + s);
  return [m.x, m.y];
}
/* Meteorain: where H1 and H2 drop their meteors (the second set), from the drill. */
const HEALER_METEORS: Point[] = (["H1", "H2"] as const).map(h => zoneCenter(fromDrill("m-meteor-2", h, null, 1).zone));
/** Where the party stacks behind the NE rock to break it (the second and fourth Line Stacks). */
const NE_STACK: Point = polar(45, BEHIND_ROCK);
/** The targets in a list of pieces. */
const targetsIn = (os: Overlay[]): Point[] => os.flatMap((o): Point[] => o.t === "target" ? [[o.x, o.y]] : []);

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
    // The tanks' spots are part of the answer, so they show only after it.
    return {overlays:heldWeapon("scythe"), boss:d.boss, after:[...d.overlays.filter(o => o.t === "mark"), ...d.hits, ...cluster([50, 66], NONTANK, 3)], answer:d.answer, options:[
      show([...SCYTHE_CLEAVES, ...TANKS_APART, ...cluster([50, 66], NONTANK, 3)]),
      show([...AXE_HITS, ...TANKS_TOGETHER, ...AXE_SPREAD]),
      show([...proteans(CENTER, all), ...all]),
      show([tankCone(CENTER, 317), tankCone(CENTER, 43), sharedCone(CENTER, 0), ...TANKS_APART, ...north])]}; },
  "k-raw-second": s => { const d = fromDrill("m-raw-scythe", s);
    return {overlays:[tag(50, 8, "0:18 WAS AXE")], boss:d.boss, before:[tag(...HELD_TAG, "?")], after:[...d.overlays, ...d.hits, ...cluster([50, 66], NONTANK, 3)], answer:d.answer, options:[
      show([...SCYTHE_CLEAVES, ...heldWeapon("scythe"), ...TANKS_APART]),
      show([...AXE_HITS, ...heldWeapon("axe"), ...TANKS_TOGETHER, ...AXE_SPREAD]),
      show([tag(...HELD_TAG, "AXE OR SCYTHE")]),
      show([...swordCross(CENTER, [0, -1]), ...heldWeapon("sword")])]}; },
  "k-first-weapon": s => { const R = buildJumpSet(s, faceApproach(weapons([[315, "scythe"], [90, "axe"], [180, "sword"]]))), W = R.W;
    return {overlays:R.overlays, boss:R.states[0], after:inOrder(W, [0, 1, 2]), answer:[circle(W[0].p, 9)], options:[
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
      show([...lp.map(g => stackHit(g)), ...lp.flat()]), show([fakeDonut(j.at, FAKE.axeDonut), stackHit(close), ...close])]}; },
  "k-scythe": s => { const j = jump(s, "scythe", 180), lp = cluster([30, 66], bySlot(s, {H1:G1, H2:G2}), 2);
    return {...j.fig, options:[hit(youIn(s, j.zone), j.hits), hit(youIn(s, j.zoneOther), j.hits),
      hit(youAt(s, [50, 8]), [fakeCircle(j.at, FAKE.circle)]), show([stackHit(lp), ...lp])]}; },
  "k-void": s => { const mine = ALL.findIndex(w => w[0] === s), edge = at(22.5 + mine * 45, 40), spread = ring(ALL, 40, 22.5, 45), stack = cluster([50, 36]);
    return {overlays:[], boss:BOSS, after:PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1))), answer:PUDDLES.map(p => circle(p, PUDDLE_R)), options:[
      show([...PUDDLE_PIECES, ...PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1)))]),
      show([...spreadHits(spread), puddle(edge), ...spread, say("3 PUDDLES ON ONE SPOT", 8)]),
      show([puddle([50, 36]), stackHit(stack), ...stack, say("3 PUDDLES UNDER THE STACK", 94)]),
      show([...([[50, 30], [68, 50], [50, 70]] as Point[]).flatMap((p, i) => [puddle(p), tag(p[0], p[1], String(i + 1))])])]}; },
  "k-void-target": s => { const me = inStack(s), stackOn = (l: string): Overlay[] => [spreadHit(inStack(l)), target(inStack(l))];
    return {overlays:[...PUDDLE_PIECES, ...stackedMarks], boss:BOSS, after:[...stackOn(s), tag(68, 83, "STACK ON A HEALER")], answer:[circle(me, 5)], options:[
      show([...stackOn(s), tag(68, 83, "STACK")]),
      show([...stackOn("MT"), tag(68, 83, "STACK")]),
      show([...stackOn("R1"), tag(68, 83, "STACK, RANDOM DPS")]),
      show([...spreadHits(stackedMarks), ...ALL.map(([l]) => target(inStack(l))), tag(68, 83, "8 STACKS")])]}; },
  "k-void-spread": s => { const gaps = cometSpread(s)(VOID_RESULTS), spreadWith = (p: Point): Overlay[] => spreadHits([...FIXED_SPREAD_MARKS, you(s, p)]);
    // Every puddle went off before Comet, so none is drawn.
    return {overlays:FIXED_SPREAD_MARKS, boss:BOSS, after:[...spreadWith(zoneCenter(gaps)), you(s, zoneCenter(gaps))], answer:[gaps], options:[
      hit(youIn(s, gaps), spreadWith(zoneCenter(gaps))), hit(youAt(s, [37, 71]), spreadWith([37, 71])),
      show([stackHit(stackedMarks), ...stackedMarks]), hit(youAt(s, [50, 58], 9), [fakeDonut(CENTER, FAKE.voidDonut)])]}; },
  "k-void-sprint": s => { const R = buildJumpSet(s, faceApproach(weapons([[180, "scythe"]]))), open = cometSpread(s)(VOID_RESULTS), lb = zoneCenter(open);
    const waitAt = bySlot<Point>(s, {H1:[83, 50], H2:[50, 17]});
    return {overlays:[...R.overlays, ...FIXED_SPREAD_MARKS], boss:STILL, after:[spreadHit(lb), you(s, lb), guide(lb, R.W[0].p)], answer:[open],
      note:"Example: the first weapon of the second set is a scythe in the south.", options:[
        show([spreadHit(lb), you(s, lb), guide(lb, R.W[0].p)], [open]),
        show([spreadHit(waitAt), you(s, waitAt), say("WAIT FOR HIS FACING", 8)], [open]),
        youAt(s, [70, 44]),
        show([RAIDWIDE, ...stackedMarks, say("MITIGATE, STAY PUT", 8)])]}; },
  "k-assault-2": s => { const R = buildJumpSet(s, faceApproach(weapons([[135, "scythe"], [270, "axe"], [0, "sword"]]))), W = R.W;
    return {overlays:R.overlays, boss:STILL, after:inOrder(W, [0, 1, 2]), answer:[circle(W[0].p, 9)], options:[
      show(inOrder(W, [0, 1, 2]), [circle(W[0].p, 9)]),
      show([...inOrder(W, [1, 2, 0]), say("THE ONE HE FACED IN SET 1", 94)], [circle(W[1].p, 9)]),
      show(inOrder(W, [2, 1, 0]), [circle(W[2].p, 9)]),
      show([you(s, [24, 33]), ...path([W[1].p]), numAt(W[1], "1")], [circle(W[1].p, 9)])]}; },
  "k-void-2-start": s => { const sc = voidAgain(s, true, VOID_2_BOSS), first = sc.steps[0].z, ps = puddlesOf(sc);
    if(!first) throw new Error("the first puddle step has no zone");
    return {overlays:[VOID_2_JUMP, tag(50, 8, "BOSS ON THE THIRD WEAPON")], boss:VOID_2_BOSS, after:numbered(ps), answer:[first], options:[
      show(numbered(ps), [first]),
      youAt(s, VOID_2_NORTH, 5, [puddle(VOID_2_NORTH)]),
      youAt(s, FIRST_PUDDLE, 5, [puddle(FIRST_PUDDLE)]),
      youAt(s, VOID_2_FRONT, 5, [puddle(VOID_2_FRONT)])]}; },
  // Every puddle went off before Comet, so the spread draws none. The stack still shows them, as
  // a guide to its spot.
  "k-void-2": s => { const sc = voidAgain(s, true, VOID_2_BOSS), spread = sc.steps[3], gaps = stepZone(spread, VOID_RESULTS), marks = spread.cue ?? [];
    if(!gaps) throw new Error("the spread step has no zone");
    const stackSc = voidAgain(s, false, VOID_2_BOSS), ps = puddlesOf(stackSc), stackZone = stepZone(stackSc.steps[3], asDrops(ps));
    if(!stackZone) throw new Error("the stack step has no zone");
    const stacked = cluster(zoneCenter(stackZone)), pairs = pairsAt(GAPS), me = you(s, zoneCenter(gaps));
    return {overlays:[VOID_2_JUMP, tag(50, 8, "FIRST ENDED: STACK")], boss:VOID_2_BOSS, after:[tag(50, 94, "SECOND ENDS: SPREAD"), ...spreadHits([...marks, me]), ...marks, me], answer:[gaps], options:[
      show([...spreadHits([...marks, me]), ...marks, me], [gaps]),
      show([...ps.map(p => puddle(p)), stackHit(stacked), ...stacked]),
      show([...pairs.map(p => stackHit(p)), ...pairs.flat()]),
      show([fakeCircle(VOID_2_FRONT, FAKE.buster), mark(...VOID_2_FRONT, "MT", "T"), target(VOID_2_FRONT), say("TANK BUSTER", 94)])]}; },
  // The pairs at their wtfdig spots. The tank and melee pairs stand on waymarks D and B, so they
  // show as their stack only, and the waymarks stay readable.
  "k-dance": s => { const d = fromDrill("m-dance", s), pairs = [cluster(DANCE_PAIRS.H1, PAIRED.slice(4, 6), 2), cluster(DANCE_PAIRS.H2, PAIRED.slice(6, 8), 2)];
    const tankPairs = [spreadHit(DANCE_PAIRS.MT), spreadHit(DANCE_PAIRS.OT)];
    return {overlays:[tag(50, 8, "DANCE OF DOMINATION")], boss:d.boss, after:[RAIDWIDE, ...d.overlays, ...bySlot(s, {H1:pairs[0], H2:pairs[1]}), tag(50, 16, "7 HITS, THEN PAIRS")], answer:d.answer, options:[
      show([RAIDWIDE, ...d.hits, ...tankPairs, ...pairs.map(p => stackHit(p)), ...pairs.flat(), tag(50, 16, "7 RAIDWIDES, THEN PAIRS")]),
      show([fakeCircle([50, 36], FAKE.buster), mark(50, 36, "MT", "T"), target([50, 36]), tag(50, 16, "ONE TANK BUSTER")]),
      show([RAIDWIDE, tag(50, 16, "PARTY TO 1 HP")]),
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
      show([RAIDWIDE, say("EVERYONE AT 1 HP", 8)]), show([fakeCircle(mt, FAKE.buster), target(mt), say("THE TANK DIES", 8)]),
      show([fakeCircle(mt, FAKE.buster), target(mt), say("TANK BUSTER", 8)]), show([say("NOTHING HAPPENS", 8)])]}; },
  "k-ult-spawn": s => { const R = ultSet(s), cw: Array<[number, string]> = [[315, "2"], [90, "3"], [180, "4"], [270, "5"], [0, "6"]];
    return {overlays:ultPart(s, i => i === 0), boss:STILL, after:ultPart(s, i => i > 0), answer:[circle(R.W[1].p, 9)], options:[
      show(spotTags(cw), [circle(at(315, 29), 7)]),
      show(spotTags([[45, "2"], [270, "3"], [180, "4"], [90, "5"], [0, "6"]]), [circle(at(45, 29), 7)]),
      show(spotTags([[60, "?"], [110, "?"], [250, "?"], [300, "?"], [20, "?"]], false)),
      show([...spotTags(cw, false), say("ALL SIX AT ONCE", 8)])]}; },
  // Each tornado cones its two closest players, so a bait draws a cone from that tornado to you.
  "k-ult-tornado": s => { const d = fromDrill("m-tornado", s), d2 = fromDrill("m-tornado", other(s));
    const own = bySlot<Point>(s, {H1:[20, 50], H2:[80, 50]}), oth = bySlot<Point>(s, {H1:[80, 50], H2:[20, 50]});
    return {...d, options:[hit(youIn(s, d.zone), gustsFrom(own)), hit(youIn(s, d2.zone), gustsFrom(oth)),
      hit(youAt(s, [40, 16], 6.5), gust([50, 16], [40, 16])), youAt(s, [57, 57], 9)]}; },
  "k-ult-touch": s => { const d = fromDrill("m-tornado", s), me = zoneCenter(d.zone);
    // Your tornado: the one you bait.
    const into = TORNADO_BAITS.find(b => b.support[0] === me[0] && b.support[1] === me[1])?.tornado;
    if(!into) throw new Error("no tornado has its bait at " + me.join(","));
    // The words go on the side of the tornado away from your mark: below it for H1, above it for H2.
    const dy = bySlot(s, {H1:1, H2:-1}), near = (a: string, b?: string): Overlay[] => [tag(into[0], into[1] + 9 * dy, a), ...(b ? [tag(into[0], into[1] + 14 * dy, b)] : [])];
    // After the answer, your tornado's cones on its two baits show what the green spot is for.
    return {overlays:[...d.overlays, you(s, me), guide(me, into)], boss:d.boss, after:[...gustsFrom(into), ...near("KNOCKBACK", "DAMAGE DOWN")], answer:d.answer,
      note:"The green spot is where you bait: at the edge of your tornado, not in it.", options:[
        show(near("KNOCKBACK", "DAMAGE DOWN")), show(near("NOTHING HAPPENS")), show(near("YOU DIE")), show(near("YOU GET HEALED"))]}; },
  "k-gwof": () => { const lines: Overlay[] = [wallOfFire(CENTER, 0), wallOfFire(CENTER, WALL_SECOND_FACING)], tanks: Point = [50, 33], stack = cluster([30, 66], NONTANK, 3);
    const spread = ring(NONTANK, 26, 60, 48), tankMarks = [mark(47, 33, "MT", "T"), mark(53, 33, "OT", "T")];
    return {overlays:tankMarks, boss:BOSS, after:[...lines, say("2 TANK BUSTERS", 8)], answer:[circle(tanks, 7)],
      note:"Heal the tanks (green).", options:[
        show([...lines, say("2 TANK BUSTERS", 8)], [circle(tanks, 7)]),
        show([RAIDWIDE, say("RAIDWIDE", 8)]),
        show([stackHit(stack), ...stack, target([30, 66]), say("STACK ON A HEALER", 94)]),
        show([...proteans(CENTER, [...tankMarks, ...spread]), ...spread])]}; },
  "k-orbital": s => { const sides = [{poly:[[50, 50], [0, 0], [0, 100]] as Point[]}, {poly:[[50, 50], [100, 0], [100, 100]] as Point[]}];
    return {overlays:[], boss:BOSS, after:[...FIRE_AND_FURY, you(s, bySlot<Point>(s, {H1:[36, 52], H2:[64, 52]}))], answer:sides, options:[
      show([...FIRE_AND_FURY, you(s, bySlot<Point>(s, {H1:[36, 52], H2:[64, 52]}))], sides),
      hit(youAt(s, [50, 64]), FIRE_AND_FURY), hit(youAt(s, [50, 36]), FIRE_AND_FURY), hit(youAt(s, [50, 94]), FIRE_AND_FURY)]}; },
  "k-orbital-move": s => {
    const O = withSeed("HECT", buildOrbital), [a, b] = O.steps.map(st => st.z);
    if(!a || !b || !("fn" in a) || !("fn" in b)) throw new Error("the Orbital Omen zones are rule zones");
    const route = [guide(a.label, b.label), tag(a.label[0], a.label[1], "START"), tag(b.label[0], b.label[1], "#2")];
    const first = O.steps[0].reveal ?? [];
    return {overlays:O.overlays, boss:BOSS, after:route, answer:[a, b],
      note:"One pattern. Start where the #2 lines cross. After #1, cross under the boss. After #2, cross back.", options:[
        show([...first, ...route], [a, b]), hit(youAt(s, [50, 96]), [fakeCircle(CENTER, FAKE.circle)]), youAt(s, [50, 36]), youAt(s, [50, 64])]}; },
  "k-meteor-order": s => {
    // The melee's set and the healers' set, from their drills. No drill asks the ranged set: R1
    // drops the far SW rock, and R2 drops NE. In the game R2's rock lands about where M1's was;
    // here R2 stands a little to the north, so the two marks do not cover each other (the app's choice).
    const SETS: Point[][] = [targetsIn(fromDrill("m-meteor-1", s).overlays), HEALER_METEORS, [METEOR_ROCKS.sw3, polar(25, 19)]];
    const M: Who[] = [["M1", "D"], ["M2", "D"]], H: Who[] = [["H1", "H"], ["H2", "H"]], R: Who[] = [["R1", "D"], ["R2", "D"]];
    /** The marks when the groups bait the three sets in this order, a meteor under each, and your spot circled. */
    const order = (groups: Who[][], text?: string): Preview => {
      const pieces = groups.flatMap((g, i) => g.map(([l, r], j) => mark(...SETS[i][j], l, r)));
      const mine = groups.flatMap((g, i) => g.map(([l], j) => l === s ? SETS[i][j] : null)).find(p => p != null);
      return show([...spreadHits(pieces, meteorHit), ...pieces, ...(text ? [say(text, 8)] : [])], mine ? [circle(mine, 6)] : []);
    };
    return {overlays:SETS.flat().map(target), boss:BOSS, after:[...order([M, H, R]).pieces, say("MELEE > HEALERS > RANGED", 8)],
      answer:[circle(bySlot(s, {H1:HEALER_METEORS[0], H2:HEALER_METEORS[1]}), 6)], options:[order([M, H, R]), order([H, R, M]), order([TANKS, TANKS, TANKS], "TANKS ONLY"), order([R, M, H])]}; },
  "k-meteor-drop": s => { const d = fromDrill("m-meteor-2", s, null, 1), d2 = fromDrill("m-meteor-2", other(s), null, 1), stack = cluster(NE_STACK, NO_HEALERS.concat([[s, "H"]]));
    const meteor = (z: Zone): Overlay => meteorHit(zoneCenter(z)), byRock = polar(70, 20);
    return {...d, options:[hit(youIn(s, d.zone), [meteor(d.zone)]), hit(youIn(s, d2.zone), [meteor(d2.zone)]),
      hit(youAt(s, byRock), [meteorHit(byRock)]), show([stackHit(stack), meteorHit(NE_STACK), ...stack], [circle(NE_STACK, 10)])]}; },
  "k-meteor-stack": () => { const ne = cluster(NE_STACK, NO_HEALERS, 3), sw = cluster([33, 67], NO_HEALERS, 3), under = ring(NO_HEALERS, 9, 0, 60), spread = ring(NO_HEALERS, 36, 30, 60);
    return {overlays:[...fromDrill("m-meteor-2", "H1").overlays, ...HEALER_METEORS.map(target)], boss:BOSS,
      after:[lineStack(CENTER, NE_STACK)], answer:[circle(NE_STACK, 7)], options:[
        show([lineStack(CENTER, NE_STACK), ...ne], [circle(NE_STACK, 9)]),
        show([lineStack(CENTER, [33, 67]), ...sw], [circle([33, 67], 9)]),
        show([stackHit(under), ...under], [circle(CENTER, 9)]),
        show([...spreadHits(spread), ...spread])]}; },
  // The correct answer draws no attack: the rocks block every Shockwave there.
  "k-triple": s => { const d = fromDrill("m-meteor-4", s, null, 1), spread = ring(ALL, 44, 22.5, 45);
    return {...d, overlays:d.overlays.filter(o => o.t === "rock"), options:[youAt(s, [6, 94], 6), hit(youAt(s, [50, 58], 9), [fakeDonut(CENTER, FAKE.tripleDonut)]),
      hit(youAt(s, [67, 33], 6), [fakeLine([67, 33])]), show([fakeCircle(CENTER, FAKE.bigCircle), ...spread])]}; },
  // Flatliner knocks everyone back from the boss before the split, so each spot gets a knockback arrow.
  // No source gives its distance: the arrow ends at the lineup spot (the app's choice).
  "k-split-side": s => { const d = fromDrill("m-split-line", s);
    const WN = platformPart(PLATFORM_X.west, 8, 48), WS = platformPart(PLATFORM_X.west, 52, 92), EN = platformPart(PLATFORM_X.east, 8, 48), ES = platformPart(PLATFORM_X.east, 52, 92);
    const knocked = (z: RectZone): Preview => hit(youIn(s, z), [thrown(CENTER, zoneCenter(z))]);
    return {...d, options:[knocked(bySlot(s, {H1:WS, H2:ES})), knocked(bySlot(s, {H1:WN, H2:EN})), knocked(bySlot(s, {H1:ES, H2:WS})), youAt(s, [50, 60], 9)]}; },
  // You stand in your tower, a little toward the platform's middle, so your mark clears the number waymark.
  // The drill's first towers, with your tether's portal on your own side: you stand on the side
  // of your tower facing the other platform, and the knockback sends you straight across.
  "k-split-kb": s => { const home = homeSide(s), portal = portalAt(home, "north", "west"), d = firstTowersScene(s, {portal});
    const z = stepZone(d.steps[0], []);
    if(!z) throw new Error("the first towers step has no zone");
    const me = zoneCenter(z), to: Point = [me[0] + (home === "west" ? 1 : -1) * TOWER_KNOCKBACK, me[1]], same: Point = [me[0], 30];
    // The tower throws you TOWER_KNOCKBACK straight away from its middle, to `to`.
    const kb = ATTACK.knockback(SPLIT_TOWER[home][firstTowerEnd(s)], inYalms(TOWER_KNOCKBACK), me);
    return {overlays:d.overlays, boss:BOSS, split:true, before:[tether(portal, me), you(s, me)], after:[tether(portal, to), you(s, me), ...kb], answer:[bySlot(s, {H1:EAST, H2:WEST})], options:[
      show([you(s, me), ...kb], [bySlot(s, {H1:EAST, H2:WEST})]),
      show([you(s, me), thrown(me, same)], [bySlot(s, {H1:WEST, H2:EAST})]),
      show([you(s, bySlot<Point>(s, {H1:[19, 50], H2:[81, 50]})), say("NO TOWER", 8)]),
      show([you(s, me), guide(me, CENTER)], [circle(CENTER, 10)])]}; },
  // Fire Breath is a line from the boss through each marked player.
  "k-split-fb": s => { const start = bySlot<Point>(s, {H1:[10, 50], H2:[90, 50]}), edge = bySlot<Point>(s, {H1:[-12, 50], H2:[112, 50]});
    // The drill's first step without a tether: in close, at the middle of the platform's inner edge.
    // The example round: the west side's portals near the ends, and four others tethered.
    const side = homeSide(s), sc = splitRound(s, {tether:false, side, end:"north", covered:"inner", endsSide:"west", others:["MT", "OT", "M1", "R2"]}), z = sc.steps[0].z;
    if(!z) throw new Error("the first Fire Breath step has no fixed zone");
    // Your mark stands in that area, a little north (H1) or south (H2), so it clears waymark D or B.
    const inner = bySlot<Point>(s, {H1:[29, 42], H2:[71, 58]});
    const tethered = bySlot<Point>(s, {H1:[10, 57], H2:[90, 43]}), tank = mark(...tethered, bySlot(s, {H1:"MT", H2:"OT"}), "T"), breath = (p: Point): Overlay => fireBreath(CENTER, p);
    // The tank's tether, before it is stretched: from a portal on the other side.
    const tankTether = tether(portalAt(otherSide(side), bySlot(s, {H1:"north", H2:"south"}), "west"), tethered);
    return {overlays:sc.overlays, split:sc.split, boss:sc.boss, before:[you(s, start)], after:[breath(inner), you(s, inner)],
      answer:[z], options:[
        show([breath(inner), you(s, inner)], [z]),
        show([breath(edge), you(s, edge)], [bySlot(s, {H1:rect(-15, 38, -9, 62), H2:rect(109, 38, 115, 62)})]),
        show([breath(start), you(s, start), tank, tankTether, tag(tethered[0], tethered[1] + bySlot(s, {H1:6, H2:-6}), "TETHER")]),
        show([breath(start), you(s, start), say("STAND STILL", 8)])]}; },
  // An example round: the portal lines cover the inner half of the west platform, so the outer
  // half of the east one. H1 shows the west platform, H2 the east one: one example of each side.
  "k-split-corner": s => {
    const side = homeSide(s), covered = bySlot<"inner" | "outer">(s, {H1:"inner", H2:"outer"}), lines = portalLines(side, covered);
    // The drill's marker spot at each end of your platform.
    const markers = (["north", "south"] as const).map(e => markerCorner(side, e, covered)), corner = markers[0];
    const breath = (p: Point): Overlay => fireBreath(CENTER, p), edge = bySlot<Point>(s, {H1:[-12, 40], H2:[112, 60]});
    const tethered = bySlot<Point>(s, {H1:[4, 3], H2:[85, 97]}), nextTo = bySlot<Point>(s, {H1:[3, 9], H2:[80, 92]}), middle = bySlot<Point>(s, {H1:[10, 50], H2:[90, 50]});
    // The tank's tether at the wall, stretched from a portal on the other side, at the other end.
    const tankTether = tether(portalAt(otherSide(side), bySlot(s, {H1:"south", H2:"north"}), "west"), tethered);
    return {overlays:[...portalsOf("west"), ...lines], split:true, boss:BOSS, before:[you(s, bySlot<Point>(s, {H1:[31, 50], H2:[69, 50]}))], answer:markers.map(p => circle(p, 4.5)),
      note:"Example: the portal lines cover the half shown. Tethers go to the north or south wall.", options:[
        show([breath(corner), you(s, corner)], markers.map(p => circle(p, 4.5))),
        show([breath(edge), you(s, edge)], [bySlot(s, {H1:rect(-15, 10, -10, 90), H2:rect(110, 10, 115, 90)})]),
        show([breath(nextTo), you(s, nextTo), tankTether, mark(...tethered, bySlot(s, {H1:"MT", H2:"OT"}), "T")]),
        hit(youAt(s, middle, 6), [breath(middle)])]}; },
  "k-split-towers23": s => {
    // The drill's second towers, with your last tether or marker in the SW quadrant (H1) or the NE one (H2).
    const side = bySlot<SplitSide>(s, {H1:"west", H2:"east"}), end = bySlot<SplitEnd>(s, {H1:"south", H2:"north"});
    const sc = splitTowers(s, side, end, null), last = yourSpot(sc.overlays, s), answer = SPLIT_TOWER[side][end];
    const first = bySlot(s, {H1:TOWER_NW, H2:TOWER_SE}), odd = bySlot(s, {H1:TOWER_NE, H2:TOWER_SW});
    return {overlays:sc.overlays, split:sc.split, boss:sc.boss, after:[guide(last, answer)], answer:[circle(answer, TOWER_R)],
      note:"Example: your last tether or marker was in the " + bySlot(s, {H1:"SW", H2:"NE"}) + " quadrant.", options:[
        show([guide(last, answer)], [circle(answer, TOWER_R)]),
        show([guide(last, first)], [circle(first, TOWER_R)]),
        show([guide(last, odd), say("CLOSEST TO THE BOSS?", 8)], [circle(odd, TOWER_R)]),
        // The "?" sits toward the platform middle, clear of the number marker next to each tower.
        show([TOWER_NW, TOWER_NE, TOWER_SW, TOWER_SE].map(p => tag(p[0], p[1] + (p[1] < 50 ? 6.5 : -6.5), "?")))]}; },
  "k-massive": () => {
    // Spread down the platform, between the number markers at its two ends. Which four end on each
    // platform depends on the portals; the picture shows light party 1 east and light party 2 west.
    // Each four stacks in close.
    const ROWS = [30, 43, 57, 70], spread = (g: Who[], x: number): Overlay[] => g.map(([l, r], i) => mark(x, ROWS[i], l, r));
    // Stacked just north of waymark B or D, so no mark hides it.
    const stacked = (g: Who[], x: number): Overlay[] => g.map(([l, r], i) => mark(x + (i % 2) * 7, 37 + Math.floor(i / 2) * 7, l, r));
    const apart = [...spread(G2, 12), ...spread(G1, 88)], s1 = stacked(G1, 67), s2 = stacked(G2, 26);
    const stacks = [stackHit(s1), stackHit(s2), ...s1, ...s2, target([67, 37]), target([26, 37]), tag(29.5, 30, "5 HITS"), tag(70.5, 30, "5 HITS")];
    const zones = [SPLIT_INNER.west, SPLIT_INNER.east];
    return {overlays:[], split:true, boss:BOSS, before:apart, after:stacks, answer:zones, options:[
      show(stacks, zones),
      show([fakeCircle([12, ROWS[0]], FAKE.platformBuster), fakeCircle([88, ROWS[0]], FAKE.platformBuster), ...apart, target([12, ROWS[0]]), target([88, ROWS[0]]), say("TANK BUSTER", 8)]),
      show([...spreadHits(apart), ...apart]),
      show([...apart, ...ROWS.flatMap(y => [thrown([12, y], [-12, y]), thrown([88, y], [112, y])]), say("KNOCKBACK", 8)])]}; },
  // He grabs the platform he faces. Each answer draws the grab where that answer expects it.
  "k-slab": s => {
    // The drill's grab, as it shows after his turn: the platform he faces, and its name tag.
    const scene = (face: SplitSide) => avalancheScene(s, homeSide(s), "north", face, "north");
    const grab = (face: SplitSide): Overlay => { const g = scene(face).steps[1].reveal?.find(o => o.t === "lane"); if(!g) throw new Error("no grab"); return g; };
    const sc = scene("west"), west = grab("west"), east = grab("east"), grabbedTag = sc.steps[1].reveal?.filter(o => o.t === "tag") ?? [];
    return {overlays:[], split:sc.split, boss:sc.boss, after:[west, ...grabbedTag, you(s, [90, 40])],
      answer:[EAST], note:"Example: he faces the west platform.", options:[
        show([west, you(s, [90, 40])], [EAST]), show([east, you(s, [10, 40])], [WEST]),
        hit(youAt(s, [50, 62], 10), [west, east]), show([east, you(s, [10, 40]), thrown([90, 40], [10, 40])], [WEST])]}; },
  // The markers go on the players outside, so each answer draws a marker on you where you stand.
  // The drill's first step reveals the markers that come next, and it draws your
  // co-healer at their spot; this card leaves them out, as an answer puts you there.
  "k-ecl-start": s => { const base = fromDrill("m-ecl-start", s);
    const d = {...base, overlays:base.overlays.filter(o => !(o.t === "mark" && o.l === other(s))), after:base.after?.slice(base.hits.length), hits:[]}, d2 = fromDrill("m-ecl-start", other(s)), marked = (z: Zone): Overlay => target(zoneCenter(z));
    const under = ring([["MT", "T"], ["OT", "T"], ["M1", "D"], ["M2", "D"]], 9, 45, 90);
    return {...d, options:[hit(youIn(s, d.zone), [marked(d.zone)]), hit(youIn(s, d2.zone), [marked(d2.zone)]),
      show([stackHit([...under, you(s, [50, 59])]), ...under, you(s, [50, 59])], [circle(CENTER, 12)]),
      hit(youAt(s, [38, 22]), [target([38, 22]), target([25, 25]), target([75, 25])])]}; },
  // The proximity AoEs land in two opposite corners, here NW and SE. The one who moves goes up to
  // the north wall: from SE, in line with B. The dots' spots are the app's choice.
  "k-ecl-adjust": () => { const up = (x: number): Overlay => guide([x, 74], [x, 6]);
    return {overlays:[mark(25, 25, "R1", "D"), mark(75, 25, "R2", "D"), target([25, 74]), target([75, 74]), mark(25, 74, "H1", "H"), mark(75, 74, "H2", "H"),
      proximityDot([12, 12]), tag(18, 5, "PROXIMITY"), proximityDot([88, 88]), tag(82, 95, "PROXIMITY")], boss:BOSS, after:[up(75)], answer:[circle([75, 74], 7)],
      note:"Example: proximity AoEs NW and SE. H2 is closer to one, so H2 moves north.", options:[
        show([up(75)], [circle([75, 74], 7)]), show([up(25)], [circle([25, 74], 7)]), show([say("NOBODY MOVES", 8)]), show([up(25), up(75)], [circle([25, 74], 7), circle([75, 74], 7)])]}; },
  // Hector's Fixed Stampede example: tank towers NE and SE, two-player towers NW and SW, and R1 and
  // R2 marked for the puddles. The tower spots are the app's example; they change from pull to pull.
  // Clockwise from A, the first two-player tower is SW (with M1, and H1 first in H1 > H2 > R1 > R2);
  // counterclockwise, it is NW (with M2 and H2). In each, the melee stands on the edge nearest the
  // boss and the healer dead center.
  "k-ecl-prio": s => { const NE: Point = [72, 28], SE: Point = [72, 72], SW: Point = [28, 72], NW: Point = [28, 28];
    const ring = (c: Point): Zone => ({c, r:TOWER_R}), cw = ring(SW), ccw = ring(NW), edge = (c: Point): Point => at(angOf([CENTER[0] - c[0], CENTER[1] - c[1]]), TOWER_R * 0.65, c);
    const mine = bySlot<Point>(s, {H1:SW, H2:NW}), partner = bySlot<Point>(s, {H1:NW, H2:SW}), other = bySlot<Who>(s, {H1:["H2", "H"], H2:["H1", "H"]});
    const everyone = [mark(...NE, "MT", "T"), mark(...SE, "OT", "T"), mark(...edge(SW), "M1", "D"), mark(...edge(NW), "M2", "D"), mark(...partner, ...other), you(s, mine)];
    return {overlays:[soloTower(NE), soloTower(SE), pairTower(SW), pairTower(NW), say("R1 AND R2 HAVE PUDDLES", 94)], boss:BOSS, after:everyone, answer:[bySlot(s, {H1:cw, H2:ccw})],
      note:"Example: R1 and R2 have puddles. T towers are tank towers; dots are two-player towers.", options:[
        youIn(s, cw, SW), youIn(s, ccw, NW), youIn(s, ring(NE), NE), show([you(s, [50, 94 - 8]), say("YOU STAY OUT", 8)])]}; },
  // The tether goes to the player in the middle of the tower, so it draws from the boss to whoever the answer puts there.
  // M1 stands on the tower's edge. The answers put you in the middle, just inside the edge,
  // outside the tower, and on the edge.
  "k-ecl-center": s => { const c: Point = [28, 30], m1 = at(135, TOWER_R, c), inside = at(225, TOWER_R * 0.8, c), tether = (p: Point): Overlay => guide(CENTER, p);
    return {overlays:[pairTower(c), mark(...m1, "M1", "D")], boss:BOSS, after:[tether(c), you(s, c)], answer:[circle(c, 3.5)], options:[
      hit(youAt(s, c, 3.5), [tether(c)]), hit(youAt(s, inside, 3.5), [tether(inside)]),
      hit(youAt(s, at(225, TOWER_R * 1.45, c), 3.5), [tether(m1)]), hit(youAt(s, at(225, TOWER_R, c), 3.5), [tether(m1)])]}; },
  "k-ecl-tether": s => { const tower: Point = [50, 13], wall: Point = [50, 94];
    return {overlays:[pairTower(tower)], boss:BOSS, before:[you(s, tower)],
      after:[guide(tower, wall), guide(wall, [6, 94]), you(s, [6, 94])], answer:[circle([6, 94], 6)],
      note:"Example: your tower is north. Take the tether to the south wall, then clockwise into the SW corner.", options:[
        show([guide(tower, wall), guide(wall, [6, 94]), you(s, [6, 94])], [circle([6, 94], 6)]),
        youAt(s, tower, 6),
        show([guide(tower, CENTER), you(s, [50, 60])], [circle(CENTER, 10)]),
        show([guide(tower, wall), guide(wall, [94, 94]), you(s, [94, 94])], [circle([94, 94], 6)])]}; },
  // Two-way Fireball is two line stacks from the boss, east and west. Four-way is four line stacks
  // of two players each, NW, NE, SW and SE. Both are 6 yalms wide (BossMod).
  // A fireball drill rolls where the proximity AoEs left the puddles; the seed keeps each picture the same.
  "k-ecl-two": s => { const d = withSeed("k-ecl-two", () => fromDrill("m-ecl-two", s, "north"));
    // The east Line Stack, mirrored from your spot in the west one.
    const me = zoneCenter(d.zone), mirror: Point = [100 - me[0], me[1]];
    return {...d, after:[...d.hits, you(s, me)], options:[
      show([lineStack(CENTER, [0, 50]), you(s, me)], [d.zone]), show([lineStack(CENTER, [100, 50]), you(s, mirror)], [circle(mirror, 5)]),
      hit(youAt(s, [43, 43], 5.5), [lineStack(CENTER, [43, 43])]), show([fakeCircle(CENTER, FAKE.smallCircle), you(s, [50, 58])], [circle(CENTER, 9)])]}; },
  "k-ecl-four": s => { const d = withSeed("k-ecl-four", () => fromDrill("m-ecl-four", s, "south"));
    return {...d, options:[
      hit(youIn(s, d.zone), [lineStack(CENTER, zoneCenter(d.zone))]), hit(youAt(s, [43, 43], 5.5), [lineStack(CENTER, [43, 43])]),
      show([lineStack(CENTER, [100, 50]), you(s, [68, 50])], [rect(60, 43, 84, 57)]), hit(youAt(s, [6, 94], 6), [lineStack(CENTER, [6, 94])])]}; },
  /* The tower is under the boss, in the middle of the arena (BossMod). The tanks stand in it, south
     of his center. In this example the tanks soak it, so your green area is out of the tower,
     the drill's "tanks" way. */
  "k-hb": s => { const tanks = [mark(46, 58.5, "MT", "T"), mark(54, 58.5, "OT", "T")], tower = CENTER, out = fromDrill("m-hb", s, "tanks").zone;
    return {overlays:[kickTower(tower)], boss:BOSS, before:tanks, after:[towerHit(tower), ...tanks, say("5, THEN 6, THEN 7 HITS", 8)], answer:[out],
      note:"Example: the tanks soak it with invulns, and you stay out. Or the party soaks it.", options:[
        show([towerHit(tower), ...tanks, say("5, THEN 6, THEN 7 HITS", 8)], [out]),
        show([towerHit(tower), you(s, [50, 58.5]), say("YOU SOAK IT ALONE", 8)], [circle(tower, TOWER_R)]),
        show([...tanks, say("RAISE THE PARTY", 8)]),
        show([RAIDWIDE, ...tanks, say("IT IS THE ENRAGE", 8)])]}; }
};
