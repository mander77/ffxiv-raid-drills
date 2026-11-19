// Arena pictures for the Mechanics questions. Each one shows the setup. Before you lock in an
// answer, you can see each answer drawn on it, right or wrong, in one neutral colour. After you
// answer, it adds what the mechanic does and the right spot in green. Where a map drill already
// draws the same moment, the picture is built from that drill, so the two always agree.
import { S, withSeed } from "../util";
import { DEG, rotOverlay, zoneCenter } from "../geometry";
import { MAPS, BOSS, PUDDLE_R, FIXED_SPREAD_MARKS, SCYTHE_CLEAVES, HELD_TAG, heldWeapon, buildRun, buildOrbital, atAngle, cometSpread, cleave, type Run, type Weapon, type WeaponType } from "./drills";
import type { Boss, Fig, Overlay, Point, Preview, RectZone, Slot, StepResult, Zone, ZoneShape } from "../types";

type Role = "T" | "D" | "H";
type Who = [string, Role];
const tag = (x: number, y: number, s: string): Overlay => ({t:"tag", x, y, s});
const mark = (x: number, y: number, l: string, r: Role): Overlay => ({t:"mark", x, y, l, r});
const target = (p: Point): Overlay => ({t:"target", x:p[0], y:p[1]});
const guide = (a: Point, b: Point): Overlay => ({t:"guide", x:a[0], y:a[1], x2:b[0], y2:b[1]});
const puddle = (p: Point, r = PUDDLE_R): Overlay => ({t:"puddle", x:p[0], y:p[1], r});
const circle = (c: Point, r: number): ZoneShape => ({c, r});
// TS note: the return type is RectZone, not the wider ZoneShape, so a rectangle can also go
// where only a Zone fits (youIn takes a Zone, and a polygon is not one).
const rect = (x0: number, y0: number, x1: number, y1: number): RectZone => ({rect:[x0, y0, x1, y1]});
/** The point r units from c, a degrees clockwise from north. */
const at = (a: number, r: number, c: Point = [50, 50]): Point => [c[0] + r * Math.sin(a * DEG), c[1] - r * Math.cos(a * DEG)];
/** A line of text on the map, for answers that are not a place. */
const say = (text: string, y = 94): Overlay => tag(50, y, text);
/** The boss with no facing arrow. */
const STILL: Boss = {x:50, y:50, f:null};
const CENTER: Point = [50, 50];
const RAIDWIDE: Overlay = {t:"aoe", x:50, y:50, r:72};

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
/** The pairs, two marks side by side at each spot. */
const pairsAt = (spots: Point[]): Overlay[] => spots.flatMap((p, i) => cluster(p, PAIRED.slice(i * 2, i * 2 + 2), 2));

/* ---------- answer previews ---------- */
const other = (s: Slot): Slot => s === "H1" ? "H2" : "H1";
const show = (pieces: Overlay[], zones: ZoneShape[] = []): Preview => ({pieces, zones});
/** Your own mark. */
const you = (s: Slot, p: Point): Overlay => mark(p[0], p[1], s, "H");
/** You at p, with that spot circled. */
const youAt = (s: Slot, p: Point, r = 5, more: Overlay[] = []): Preview => show([you(s, p), ...more], [circle(p, r)]);
/** You in zone z, at its shown spot. */
const youIn = (s: Slot, z: Zone): Preview => show([you(s, zoneCenter(z))], [z]);

/** One step of a map drill as a picture: its floor, boss and pieces, then what it hits and its answer zone. */
function fromDrill(id: string, s: Slot, v: string | null = null, k = 0): Fig & {zone: Zone} {
  const m = MAPS.find(x => x.id === id);
  if(!m) throw new Error("missing drill " + id);
  const sc = m.build(s, v), st = sc.steps[k];
  if(!st.z) throw new Error(id + " step " + k + " has no fixed zone");
  return {overlays:sc.overlays, boss:sc.boss ?? sc.bossAt?.(k), split:sc.split, after:st.reveal, answer:[st.z], zone:st.z};
}

/** The boss jumps from the middle to one weapon. `zone` is your spot, `zoneOther` your co-healer's.
    The question names the weapon, so its name tag is left out: the boss stands on it anyway. */
function jump(s: Slot, type: WeaponType, a: number) {
  const W: Weapon[] = [{a, p:atAngle(a), type}], R = buildRun(s, W), st = R.steps[0], b = R.states[1], st2 = buildRun(other(s), W).steps[0];
  if(!st.z || !st2.z) throw new Error("a weapon step has no zone");
  const fig: Fig = {overlays:[guide(CENTER, [b.x, b.y]), ...R.overlays.filter(o => o.t !== "tag")], boss:b, after:st.reveal, answer:[st.z]};
  return {fig, b, zone:st.z, zoneOther:st2.z};
}

/** A run's pieces with each weapon's name outside it (41 units out), clear of the order
    numbers that go between the weapon and the boss. */
const named = (R: Run): Overlay[] => [...R.overlays.filter(o => o.t !== "tag"),
  ...R.W.map((w, i): Overlay => ({...tag(...at(w.a, 41), w.type.toUpperCase()), spawn:i}))];

// TS note: Array<[number, WeaponType]> is an array of pairs. Each `[a, type]` in map() unpacks
// one pair, so the code reads like the data.
const weapons = (list: Array<[number, WeaponType]>): Weapon[] => list.map(([a, type]): Weapon => ({a, p:atAngle(a), type}));
/** A second-set weapon, turned `turn` degrees away from lying square across the line to the boss. */
const turned = (a: number, type: WeaponType, turn: number): Weapon => { const t = (a + 90 + turn) * DEG; return {a, p:atAngle(a), type, axis:[Math.sin(t), -Math.cos(t)]}; };
/** A label between weapon w and the boss: its place in the order, or "?". */
const numAt = (w: Weapon, l: string): Overlay => tag(...at(w.a, 16), l);
/** Order labels on weapons, given as places in W: order[0] goes first. */
const inOrder = (W: Weapon[], order: number[]): Overlay[] => order.map((i, n) => numAt(W[i], String(n + 1)));

/* Ultimate Trophy Weapons, clockwise: the first spawns south and slightly west, the last north. */
const ULT: Array<[number, WeaponType]> = [[200, "sword"], [315, "axe"], [90, "scythe"], [180, "axe"], [270, "sword"], [0, "scythe"]];
const ultRun = (s: Slot) => buildRun(s, weapons(ULT));
/** The pieces of the weapons whose spawn index passes `keep`, with their order numbers. */
function ultPart(s: Slot, keep: (i: number) => boolean): Overlay[] {
  const R = ultRun(s);
  return [...named(R).filter(o => o.spawn != null && keep(o.spawn)), ...R.W.map((w, i) => numAt(w, String(i + 1))).filter((_o, i) => keep(i))];
}
/** Order labels for weapon spots with no weapon drawn yet: [angle, label] pairs, where the order numbers go. */
const spotTags = (list: Array<[number, string]>): Overlay[] => list.map(([a, l]) => tag(...at(a, 16), l));

/* Void Stardust: the three puddles at their usual spots, north of the boss and clockwise. */
const PUDDLES: Point[] = [[50, 33], [58.8, 35.4], [64.9, 41.8]];
const PUDDLE_PIECES = PUDDLES.map(p => puddle(p));
const VOID_RESULTS: StepResult[] = PUDDLES.map(p => ({p, ok:true, z:{c:p, r:5}, drop:p}));
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

/** One picture per Mechanics question, by question id. The tests check that every question has
    one, and that `options` has one preview for each of its answers, in the question's order. */
// TS note: Partial<Record<string, ...>> says any key may be missing, so a lookup returns
// the function or undefined, and the caller must check before it calls it.
export const MECH_FIGS: Partial<Record<string, (s: Slot) => Fig>> = {
  "k-raw-first": s => { const d = fromDrill("m-raw-scythe", s), tanks = [mark(37, 36, "MT", "T"), mark(63, 36, "OT", "T")];
    return {overlays:heldWeapon("scythe"), boss:BOSS, after:[...tanks, ...SCYTHE_CLEAVES], answer:d.answer, options:[
      show([...tanks, ...cluster([50, 66], NONTANK, 3)]),
      show([mark(47, 33, "MT", "T"), mark(53, 33, "OT", "T"), ...ring(NONTANK, 32, 110, 28)]),
      show(ring(ALL, 33, 0, 45)),
      show([...tanks, ...cluster([50, 35], NONTANK, 3)])]}; },
  "k-raw-second": s => { const d = fromDrill("m-raw-scythe", s);
    return {overlays:[tag(50, 8, "0:18 WAS AXE")], boss:BOSS, before:[tag(...HELD_TAG, "?")], after:[...d.overlays, ...SCYTHE_CLEAVES], answer:d.answer, options:[
      show(heldWeapon("scythe")), show(heldWeapon("axe")), show([tag(...HELD_TAG, "AXE OR SCYTHE")]), show(heldWeapon("sword"))]}; },
  "k-first-weapon": s => { const R = buildRun(s, weapons([[315, "scythe"], [90, "axe"], [180, "sword"]])), W = R.W;
    return {overlays:named(R), boss:R.states[0], after:inOrder(W, [0, 1, 2]), answer:[circle(W[0].p, 9)], options:[
      show(inOrder(W, [0, 1, 2]), [circle(W[0].p, 9)]),
      show([numAt(W[2], "1"), say("ALWAYS THE SWORD FIRST", 8)], [circle(W[2].p, 9)]),
      show([mark(66, 42, "MT", "T"), ...inOrder(W, [1, 0, 2])], [circle(W[1].p, 9)]),
      show(W.map(w => numAt(w, "?")))]}; },
  "k-sword": s => { const j = jump(s, "sword", 270);
    return {...j.fig, options:[youIn(s, j.zone), youIn(s, j.zoneOther), show(ring(ALL, 14, 0, 45, [j.b.x, j.b.y])), show(cluster(CENTER))]}; },
  "k-axe": s => { const j = jump(s, "axe", 90), mid = zoneCenter(j.zone);
    return {...j.fig, options:[
      show(cluster(mid), [j.zone]), show(ring(ALL, 33, 22.5, 45)),
      show([...cluster([62, 30], G1, 2), ...cluster([62, 70], G2, 2)]), show(cluster([66, 50], ALL, 2))]}; },
  "k-scythe": s => { const j = jump(s, "scythe", 180);
    return {...j.fig, options:[youIn(s, j.zone), youIn(s, j.zoneOther), youAt(s, [50, 8]), show(cluster([30, 66], S(s, G1, G2), 2))]}; },
  "k-void": s => { const mine = ALL.findIndex(w => w[0] === s), edge = at(22.5 + mine * 45, 40);
    return {overlays:[], boss:BOSS, after:PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1))), answer:PUDDLES.map(p => circle(p, PUDDLE_R)), options:[
      show([...PUDDLE_PIECES, ...PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1)))]),
      show([puddle(edge, 8), ...ring(ALL, 40, 22.5, 45), say("3 PUDDLES ON ONE SPOT", 8)]),
      show([puddle([50, 36], 9), ...cluster([50, 36]), say("3 PUDDLES UNDER THE STACK", 94)]),
      show([...([[50, 30], [68, 50], [50, 70]] as Point[]).flatMap((p, i) => [puddle(p), tag(p[0], p[1], String(i + 1))])])]}; },
  "k-void-target": s => { const me = inStack(s);
    return {overlays:[...PUDDLE_PIECES, ...stackedMarks], boss:BOSS, after:[target(me), tag(68, 83, "STACK ON A HEALER")], answer:[circle(me, 5)], options:[
      show([target(me), tag(68, 83, "STACK")]),
      show([target(inStack("MT")), tag(68, 83, "STACK")]),
      show([target(inStack("R1")), tag(68, 83, "STACK, RANDOM DPS")]),
      show([...ALL.map(([l]) => target(inStack(l))), tag(68, 83, "8 STACKS")])]}; },
  "k-void-spread": s => { const gaps = cometSpread(s)(VOID_RESULTS);
    return {overlays:[...PUDDLE_PIECES, ...FIXED_SPREAD_MARKS], boss:BOSS, answer:[gaps], options:[
      youIn(s, gaps), youAt(s, [37, 71]), show(stackedMarks), youAt(s, [50, 58], 9)]}; },
  "k-void-run": s => { const R = buildRun(s, [turned(270, "scythe", 0)]), toward = cometSpread(s, R.W[0].p)(VOID_RESULTS), lb = zoneCenter(toward);
    return {overlays:[...PUDDLE_PIECES, ...named(R), ...FIXED_SPREAD_MARKS], boss:STILL, answer:[toward],
      note:"Example: the first weapon of the second set is a scythe in the west.", options:[
        show([you(s, lb), guide(lb, R.W[0].p)], [toward]),
        show([you(s, S<Point>(s, [83, 50], [50, 83])), say("WAIT FOR HIS FACING", 8)], [cometSpread(s)(VOID_RESULTS)]),
        youAt(s, [70, 44]),
        show([...stackedMarks, say("MITIGATE, STAY PUT", 8)])]}; },
  "k-assault-2": s => { const R = buildRun(s, [turned(135, "scythe", 0), turned(270, "axe", 40), turned(0, "sword", -45)]), W = R.W;
    return {overlays:named(R), boss:STILL, after:inOrder(W, [0, 1, 2]), answer:[circle(W[0].p, 9)], options:[
      show(inOrder(W, [0, 1, 2]), [circle(W[0].p, 9)]),
      show([...inOrder(W, [1, 2, 0]), say("THE ONE HE FACED IN SET 1", 94)], [circle(W[1].p, 9)]),
      show(inOrder(W, [2, 1, 0]), [circle(W[2].p, 9)]),
      show([you(s, [24, 33]), numAt(W[1], "1")], [circle(W[1].p, 9)])]}; },
  "k-void-2": s => { const gaps = cometSpread(s)(VOID_RESULTS);
    return {overlays:[...PUDDLE_PIECES, tag(50, 8, "1ST ENDED: STACK")], boss:BOSS, after:[tag(50, 94, "2ND ENDS: SPREAD"), ...FIXED_SPREAD_MARKS], answer:[gaps], options:[
      show([...FIXED_SPREAD_MARKS, you(s, zoneCenter(gaps))], [gaps]),
      show(stackedMarks),
      show(pairsAt(GAPS)),
      show([mark(50, 36, "MT", "T"), target([50, 36]), say("TANK BUSTER", 94)])]}; },
  "k-dance": s => { const d = fromDrill("m-dance", s), pairs = pairsAt([[42, 66], [58, 66], [33, 91], [67, 91]]);
    return {overlays:[tag(50, 8, "DANCE OF DOMINATION")], boss:d.boss, after:[RAIDWIDE, ...d.overlays, tag(50, 16, "7 HITS, THEN PAIRS")], answer:d.answer, options:[
      show([RAIDWIDE, ...pairs, tag(50, 16, "7 RAIDWIDES, THEN PAIRS")]),
      show([mark(50, 36, "MT", "T"), target([50, 36]), tag(50, 16, "ONE TANK BUSTER")]),
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
  "k-dance-pair": s => { const d = fromDrill("m-dance", s), d2 = fromDrill("m-dance", other(s));
    return {...d, options:[youIn(s, d.zone), youIn(s, d2.zone), youAt(s, [62, 50], 5, [mark(62, 43, "MT", "T")]), show(ring(ALL, 9, 0, 45), [circle(CENTER, 13)])]}; },
  "k-charyb": () => { const mt = at(22.5, 20);
    return {overlays:ring(ALL, 20, 22.5, 45), boss:BOSS, after:[RAIDWIDE, say("EVERYONE AT 1 HP", 8)], options:[
      show([RAIDWIDE, say("EVERYONE AT 1 HP", 8)]), show([target(mt), say("THE TANK DIES", 8)]), show([target(mt), say("TANK BUSTER", 8)]), show([say("NOTHING HAPPENS", 8)])]}; },
  "k-ult-last": s => { const R = ultRun(s);
    return {overlays:ultPart(s, i => i < 5), boss:STILL, after:ultPart(s, i => i === 5), answer:[circle(R.W[5].p, 9)], options:[
      show([tag(...at(0, 16), "6")], [circle(at(0, 29), 9)]),
      show([tag(...at(160, 22), "6")], [circle(at(180, 29), 9)]),
      show([tag(50, 58, "6")], [circle(CENTER, 9)]),
      show([tag(...at(60, 40), "6?"), tag(...at(240, 40), "6?"), tag(...at(135, 40), "6?")])]}; },
  "k-ult-spawn": s => { const R = ultRun(s), cw: Array<[number, string]> = [[315, "2"], [90, "3"], [180, "4"], [270, "5"], [0, "6"]];
    return {overlays:ultPart(s, i => i === 0), boss:STILL, after:ultPart(s, i => i > 0), answer:[circle(R.W[1].p, 9)], options:[
      show(spotTags(cw), [circle(at(315, 29), 7)]),
      show(spotTags([[45, "2"], [270, "3"], [180, "4"], [90, "5"], [0, "6"]]), [circle(at(45, 29), 7)]),
      show(spotTags([[60, "?"], [110, "?"], [250, "?"], [300, "?"], [20, "?"]])),
      show([...spotTags(cw), say("ALL SIX AT ONCE", 8)])]}; },
  "k-ult-tornado": s => { const d = fromDrill("m-tornado", s), d2 = fromDrill("m-tornado", other(s));
    return {...d, options:[youIn(s, d.zone), youIn(s, d2.zone), youAt(s, [40, 16], 6.5), youAt(s, [57, 57], 9)]}; },
  "k-ult-touch": s => { const d = fromDrill("m-tornado", s), me = S<Point>(s, [12, 42], [88, 58]), into = S<Point>(s, [20, 50], [80, 50]);
    // The words go on the side of the tornado away from your mark: below it for H1, above it for H2.
    const dy = S(s, 1, -1), near = (a: string, b?: string): Overlay[] => [tag(into[0], into[1] + 9 * dy, a), ...(b ? [tag(into[0], into[1] + 14 * dy, b)] : [])];
    return {overlays:[...d.overlays, you(s, me), guide(me, into)], boss:d.boss, after:near("KNOCKBACK", "DAMAGE DOWN"), answer:d.answer,
      note:"The green spot is where you bait: at the edge of your tornado, not in it.", options:[
        show(near("KNOCKBACK", "DAMAGE DOWN")), show(near("NOTHING HAPPENS")), show(near("YOU DIE")), show(near("YOU GET HEALED"))]}; },
  "k-gwof": () => { const line: Overlay = {t:"band", x:50, y:50, x2:50, y2:-20, w:10}, tanks: Point = [50, 33];
    return {overlays:[mark(47, 33, "MT", "T"), mark(53, 33, "OT", "T")], boss:BOSS, after:[line, say("2 TANK BUSTERS", 8)], answer:[circle(tanks, 7)],
      note:"Heal the tanks (green). The fire line stays on the floor, so keep out of it.", options:[
        show([line, say("2 TANK BUSTERS", 8)], [circle(tanks, 7)]),
        show([RAIDWIDE, say("RAIDWIDE", 8)]),
        show([...cluster([30, 66], NONTANK, 3), target([30, 66]), say("STACK ON A HEALER", 94)]),
        show([cleave(CENTER, 350, 6, 45), cleave(CENTER, 10, 6, 45), ...[60, 108, 156, 204, 252, 300].map(a => cleave(CENTER, a, 6, 45)), ...ring(NONTANK, 26, 60, 48)])]}; },
  "k-orbital": s => { const sides = [{poly:[[50, 50], [0, 0], [0, 100]] as Point[]}, {poly:[[50, 50], [100, 0], [100, 100]] as Point[]}];
    return {overlays:[], boss:BOSS, after:[{t:"poly", pts:[[50, 50], [0, 0], [100, 0]]}, {t:"poly", pts:[[50, 50], [0, 100], [100, 100]]}], answer:sides, options:[
      show([you(s, S<Point>(s, [36, 52], [64, 52]))], sides), youAt(s, [50, 64]), youAt(s, [50, 36]), youAt(s, [50, 94])]}; },
  "k-orbital-move": s => {
    const O = withSeed("HECT", buildOrbital), [a, b] = O.steps.map(st => st.z);
    if(!a || !b || !("fn" in a) || !("fn" in b)) throw new Error("the Orbital Omen zones are rule zones");
    const path = [guide(a.label, b.label), tag(a.label[0], a.label[1], "START"), tag(b.label[0], b.label[1], "#2")];
    return {overlays:O.overlays, boss:BOSS, after:path, answer:[a, b],
      note:"One pattern. Start where the #2 lines cross. After #1, cross the hitbox. After #2, cross back.", options:[
        show(path, [a, b]), youAt(s, [50, 96]), youAt(s, [50, 36]), youAt(s, [50, 64])]}; },
  "k-meteor-order": s => {
    const SETS: Point[][] = [[[57, 43], [43, 57]], [[43, 43], [26, 74]], [[10, 90], [62, 38]]];
    const M: Who[] = [["M1", "D"], ["M2", "D"]], H: Who[] = [["H1", "H"], ["H2", "H"]], R: Who[] = [["R1", "D"], ["R2", "D"]];
    /** The marks when the groups bait the three sets in this order, and your spot circled. */
    const order = (groups: Who[][], text?: string): Preview => {
      const pieces = groups.flatMap((g, i) => g.map(([l, r], j) => mark(...SETS[i][j], l, r)));
      const mine = groups.flatMap((g, i) => g.map(([l], j) => l === s ? SETS[i][j] : null)).find(p => p != null);
      return show(text ? [...pieces, say(text, 8)] : pieces, mine ? [circle(mine, 6)] : []);
    };
    return {overlays:SETS.flat().map(target), boss:BOSS, after:[...order([M, H, R]).pieces, say("MELEE > HEALERS > RANGED", 8)],
      answer:[circle(S<Point>(s, [43, 43], [26, 74]), 6)], options:[order([M, H, R]), order([H, R, M]), order([TANKS, TANKS, TANKS], "TANKS ONLY"), order([R, M, H])]}; },
  "k-meteor-drop": s => { const d = fromDrill("m-meteor-2", s), d2 = fromDrill("m-meteor-2", other(s));
    return {...d, options:[youIn(s, d.zone), youIn(s, d2.zone), youAt(s, [64, 36]), show(cluster([65, 35], NO_HEALERS.concat([[s, "H"]])), [circle([65, 35], 10)])]}; },
  "k-meteor-stack": () => ({overlays:[{t:"rock", x:57, y:43}, {t:"rock", x:43, y:57}, target([43, 43]), target([26, 74])], boss:BOSS,
    after:[{t:"band", x:50, y:50, x2:90, y2:10, w:8}], answer:[circle([65, 35], 7)], options:[
      show(cluster([67, 33], NO_HEALERS, 3), [circle([67, 33], 9)]),
      show(cluster([33, 67], NO_HEALERS, 3), [circle([33, 67], 9)]),
      show(ring(NO_HEALERS, 7.5, 0, 60), [circle(CENTER, 9)]),
      show(ring(NO_HEALERS, 36, 30, 60))]}),
  "k-triple": s => { const d = fromDrill("m-meteor-4", s, null, 1);
    return {...d, options:[youAt(s, [6, 94], 6), youAt(s, [50, 58], 9), youAt(s, [67, 33], 6), show(ring(ALL, 44, 22.5, 45))]}; },
  "k-split-side": s => { const d = fromDrill("m-split-line", s);
    const WN = rect(0, 8, 26, 48), WS = rect(0, 52, 26, 92), EN = rect(74, 8, 100, 48), ES = rect(74, 52, 100, 92);
    return {...d, options:[youIn(s, S(s, WN, ES)), youIn(s, S(s, WS, EN)), youIn(s, S(s, EN, WS)), youAt(s, [50, 60], 9)]}; },
  "k-split-kb": s => { const d = fromDrill("m-split-tower", s), me = S<Point>(s, [11, 27], [89, 73]), to = S<Point>(s, [88, 27], [12, 73]), same = S<Point>(s, [11, 62], [89, 38]);
    return {overlays:d.overlays, boss:BOSS, split:true, before:[you(s, me)], after:[you(s, me), guide(me, to)], answer:[S(s, EAST, WEST)], options:[
      show([you(s, me), guide(me, to)], [S(s, EAST, WEST)]),
      show([you(s, me), guide(me, same)], [S(s, WEST, EAST)]),
      show([you(s, S<Point>(s, [19, 50], [81, 50])), say("NO TOWER", 8)]),
      show([you(s, me), guide(me, CENTER)], [circle(CENTER, 10)])]}; },
  "k-split-fb": s => { const start = S<Point>(s, [10, 50], [90, 50]), inner = S<Point>(s, [20, 42], [80, 58]);
    const tethered = S<Point>(s, [10, 57], [90, 43]), tank = mark(...tethered, S(s, "MT", "OT"), "T");
    return {overlays:[], split:true, boss:BOSS, before:[you(s, start)], after:[cleave(CENTER, S(s, 270, 90), 14, 40), you(s, inner)],
      answer:[S(s, rect(15, 38, 25.5, 62), rect(74.5, 38, 85, 62))], options:[
        show([you(s, inner)], [S(s, rect(15, 38, 25.5, 62), rect(74.5, 38, 85, 62))]),
        show([you(s, S<Point>(s, [4, 50], [96, 50]))], [S(s, rect(0, 38, 6, 62), rect(94, 38, 100, 62))]),
        show([you(s, start), tank, guide(tethered, CENTER), tag(tethered[0], tethered[1] + S(s, 6, -6), "TETHER")]),
        show([you(s, start), say("STAND STILL", 8)])]}; },
  "k-split-corner": s => { const markers = S<Point[]>(s, [[9, 19], [9, 81]], [[91, 19], [91, 81]]), tethered = S<Point>(s, [12, 38], [88, 62]);
    return {overlays:[], split:true, boss:BOSS, before:[you(s, S<Point>(s, [12, 50], [88, 50]))], answer:markers.map(p => circle(p, 6.5)),
      note:"Markers go to a corner of your number marker. Tethers go to the platform edge. Ask your lead which corner: outer or inner.", options:[
        show([you(s, S<Point>(s, [14, 25], [86, 75]))], markers.map(p => circle(p, 6.5))),
        show([you(s, S<Point>(s, [3, 40], [97, 60]))], [S(s, rect(0, 10, 5, 90), rect(95, 10, 100, 90))]),
        show([you(s, S<Point>(s, [12, 45], [88, 55])), mark(...tethered, S(s, "MT", "OT"), "T"), guide(tethered, CENTER)]),
        youAt(s, S<Point>(s, [13, 50], [87, 50]), 6)]}; },
  "k-split-towers23": s => { const d = fromDrill("m-split-tower", s), last = S<Point>(s, [19, 88], [81, 12]);
    const answer = S(s, TOWER_SW, TOWER_NE), first = S(s, TOWER_NW, TOWER_SE), odd = S(s, TOWER_NE, TOWER_SW);
    return {overlays:[...d.overlays, you(s, last)], split:true, boss:BOSS, answer:[circle(answer, 7.5)],
      note:"Example: your last tether or marker was in the " + S(s, "southwest", "northeast") + " quadrant.", options:[
        show([guide(last, answer)], [circle(answer, 7.5)]),
        show([guide(last, first)], [circle(first, 7.5)]),
        show([guide(last, odd), say("CLOSEST TO THE BOSS?", 8)], [circle(odd, 7.5)]),
        // The "?" sits toward the platform middle, clear of the number marker next to each tower.
        show([TOWER_NW, TOWER_NE, TOWER_SW, TOWER_SE].map(p => tag(p[0], p[1] + (p[1] < 50 ? 4 : -4), "?")))]}; },
  "k-massive": () => {
    // Spread down the platform, between the number markers at its two ends.
    const ROWS = [27, 42, 57, 72], spread = (g: Who[], x: number): Overlay[] => g.map(([l, r], i) => mark(x, ROWS[i], l, r));
    const stacked = (g: Who[], x: number): Overlay[] => g.map(([l, r], i) => mark(x + (i % 2) * 7, 47 + Math.floor(i / 2) * 7, l, r));
    const apart = [...spread(G1, 12), ...spread(G2, 88)];
    const stacks = [...stacked(G1, 9), ...stacked(G2, 84), target([9, 47]), target([84, 47]), tag(12.5, 39, "5 HITS"), tag(87.5, 39, "5 HITS")];
    const zones = [circle([12.5, 50.5], 9), circle([87.5, 50.5], 9)];
    return {overlays:[], split:true, boss:BOSS, before:apart, after:stacks, answer:zones, options:[
      show(stacks, zones),
      show([...apart, target([12, ROWS[0]]), target([88, ROWS[0]]), say("TANK BUSTER", 8)]),
      show([...apart, ...[12, 88].flatMap(x => ROWS.map((y): Overlay => ({t:"aoe", x, y, r:5})))]),
      show([...apart, ...ROWS.flatMap(y => [guide([12, y], [3, y]), guide([88, y], [97, y])]), say("KNOCKBACK", 8)])]}; },
  "k-slab": s => ({overlays:[], split:true, boss:{x:50, y:50, f:270}, after:[{t:"lane", rect:[0, 0, 25.5, 100]}, tag(13, 50, "GRABBED")],
    answer:[EAST], note:"Example: he faces the west platform.", options:[
      show([you(s, [87, 40])], [EAST]), show([you(s, [13, 40])], [WEST]), youAt(s, [50, 62], 10), show([you(s, [13, 40]), guide([87, 40], [13, 40])], [WEST])]}),
  "k-ecl-start": s => { const d = fromDrill("m-ecl-start", s), d2 = fromDrill("m-ecl-start", other(s));
    return {...d, options:[youIn(s, d.zone), youIn(s, d2.zone),
      show([...ring([["MT", "T"], ["OT", "T"], ["M1", "D"], ["M2", "D"]], 9, 45, 90), you(s, [50, 59])], [circle(CENTER, 12)]), youAt(s, [38, 22])]}; },
  "k-ecl-adjust": () => { const up = (x: number): Overlay => guide([x, 74], [x, 36]);
    return {overlays:[mark(25, 25, "R1", "D"), mark(75, 25, "R2", "D"), target([25, 74]), target([75, 74]), mark(25, 74, "H1", "H"), mark(75, 74, "H2", "H"),
      {t:"aoe", x:66, y:93, r:5}, tag(66, 85, "PROXIMITY")], boss:BOSS, after:[up(75)], answer:[circle([75, 74], 7)],
      note:"Example: the proximity AoE is closer to H2, so H2 moves north.", options:[
        show([up(75)], [circle([75, 74], 7)]), show([up(25)], [circle([25, 74], 7)]), show([say("NOBODY MOVES", 8)]), show([up(25), up(75)], [circle([25, 74], 7), circle([75, 74], 7)])]}; },
  "k-ecl-prio": s => { const T: Point[] = [[50, 13], [87, 50], [50, 87], [13, 50]];
    /** Labels on the towers N, E, S, W, and your tower circled when you have one. */
    const labels = (who: string[]): Preview => { const i = who.indexOf(s); return show(T.map((p, k) => tag(p[0], p[1], who[k])), i >= 0 ? [circle(T[i], 7)] : []); };
    const right = labels(["H1", "H2", "R1", "R2"]);
    return {overlays:T.map(([x, y]): Overlay => ({t:"tower", x, y})), boss:BOSS, after:right.pieces, answer:right.zones,
      note:"Example tower spots. Count clockwise from A: H1 takes the first tower, then H2, R1 and R2.", options:[
        right, labels(["R1", "H2", "H1", "R2"]), labels(["M1", "M2", "?", "?"]), labels(["MT", "OT", "MT", "OT"])]}; },
  "k-ecl-center": s => { const c: Point = [28, 30];
    return {overlays:[{t:"tower", x:c[0], y:c[1], r:13}, mark(...at(135, 13, c), "M1", "D")], boss:BOSS, after:[you(s, c)], answer:[circle(c, 3.5)], options:[
      youAt(s, c, 3.5), youAt(s, at(225, 10.5, c), 3.5), youAt(s, at(225, 19, c), 3.5), youAt(s, at(225, 13, c), 3.5)]}; },
  "k-ecl-tether": s => { const tower: Point = [50, 13], wall: Point = [50, 94];
    return {overlays:[{t:"tower", x:tower[0], y:tower[1]}], boss:BOSS, before:[you(s, tower)],
      after:[guide(tower, wall), guide(wall, [6, 94]), you(s, [6, 94])], answer:[circle([6, 94], 6)],
      note:"Example: your tower is north. Take the tether to the south wall, then clockwise into the southwest corner.", options:[
        show([guide(tower, wall), guide(wall, [6, 94]), you(s, [6, 94])], [circle([6, 94], 6)]),
        youAt(s, tower, 6),
        show([guide(tower, CENTER), you(s, [50, 60])], [circle(CENTER, 10)]),
        show([guide(tower, wall), guide(wall, [94, 94]), you(s, [94, 94])], [circle([94, 94], 6)])]}; },
  "k-ecl-two": s => { const d = fromDrill("m-ecl-two", s, "north");
    return {...d, options:[show([you(s, [32, 50])], [d.zone]), show([you(s, [68, 50])], [rect(60, 43, 84, 57)]), youAt(s, [43, 43], 5.5), show([you(s, [50, 58])], [circle(CENTER, 9)])]}; },
  "k-ecl-four": s => { const d = fromDrill("m-ecl-four", s, "south");
    return {...d, options:[youIn(s, d.zone), youAt(s, [43, 43], 5.5), show([you(s, [68, 50])], [rect(60, 43, 84, 57)]), youAt(s, [6, 94], 6)]}; },
  "k-hb": s => { const tanks = [mark(47, 31, "MT", "T"), mark(53, 31, "OT", "T")], tower: Point = [50, 31];
    return {overlays:[{t:"tower", x:tower[0], y:tower[1], r:7}], boss:BOSS, before:tanks, after:[...tanks, say("5, THEN 6, THEN 7 HITS", 8)], answer:[circle(tower, 7)],
      note:"Example spot. The tanks soak the tower, and you heal them between the hits.", options:[
        show([...tanks, say("5, THEN 6, THEN 7 HITS", 8)], [circle(tower, 7)]),
        show([you(s, tower), say("YOU SOAK IT ALONE", 8)], [circle(tower, 7)]),
        show([...tanks, say("RAISE EVERYONE", 8)]),
        show([...tanks, say("IT IS THE ENRAGE", 8)])]}; }
};
