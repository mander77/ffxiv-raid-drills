// Arena pictures for the Mechanics questions. Each one shows the setup. After an answer, it
// adds what the mechanic does and the right spot in green. Where a map drill already draws
// the same moment, the picture is built from that drill, so the two always agree.
import { S, withSeed } from "../util";
import { DEG } from "../geometry";
import { MAPS, BOSS, PUDDLE_R, FIXED_SPREAD_MARKS, buildRun, buildOrbital, atAngle, cometSpread, type Weapon, type WeaponType } from "./drills";
import type { Boss, Fig, Overlay, Point, Slot, StepResult, ZoneShape } from "../types";

type Role = "T" | "D" | "H";
const tag = (x: number, y: number, s: string): Overlay => ({t:"tag", x, y, s});
const mark = (x: number, y: number, l: string, r: Role): Overlay => ({t:"mark", x, y, l, r});
const target = (p: Point): Overlay => ({t:"target", x:p[0], y:p[1]});
const guide = (a: Point, b: Point): Overlay => ({t:"guide", x:a[0], y:a[1], x2:b[0], y2:b[1]});
const circle = (c: Point, r: number): ZoneShape => ({c, r});
/** The point r units from c, a degrees clockwise from north. */
const at = (a: number, r: number, c: Point = [50, 50]): Point => [c[0] + r * Math.sin(a * DEG), c[1] - r * Math.cos(a * DEG)];
/** A cone from c toward a (degrees clockwise from north), `half` degrees to each side. */
const cone = (c: Point, a: number, half: number, r = 80): Overlay => ({t:"poly", pts:[c, at(a - half, r, c), at(a, r, c), at(a + half, r, c)]});
/** The boss with no facing arrow. */
const STILL: Boss = {x:50, y:50, f:null};

/** One step of a map drill as a picture: its floor, boss and pieces, then what it hits and its answer zone. */
function fromDrill(id: string, s: Slot, v: string | null = null, k = 0): Fig {
  const m = MAPS.find(x => x.id === id);
  if(!m) throw new Error("missing drill " + id);
  const sc = m.build(s, v), st = sc.steps[k];
  return {overlays:sc.overlays, boss:sc.boss ?? sc.bossAt?.(k), split:sc.split, after:st.reveal, answer:st.z ? [st.z] : []};
}

/** The boss just landed on a weapon after a jump from the middle (the white line). */
function jumpFig(s: Slot, type: WeaponType, a: number): Fig {
  const R = buildRun(s, [{a, p:atAngle(a), type}]), st = R.steps[0], b = R.states[1];
  return {overlays:[guide([50, 50], [b.x, b.y]), ...R.overlays], boss:b, after:st.reveal, answer:st.z ? [st.z] : []};
}

// TS note: Array<[number, WeaponType]> is an array of labeled pairs. Each `[a, type]` in map()
// unpacks one pair, so the code reads like the data.
const weapons = (list: Array<[number, WeaponType]>): Weapon[] => list.map(([a, type]): Weapon => ({a, p:atAngle(a), type}));
/** A second-set weapon, turned `turn` degrees away from lying square across the line to the boss. */
const turned = (a: number, type: WeaponType, turn: number): Weapon => { const t = (a + 90 + turn) * DEG; return {a, p:atAngle(a), type, axis:[Math.sin(t), -Math.cos(t)]}; };
/** The order number of weapon i, between the weapon and the boss. */
const num = (w: Weapon, i: number): Overlay => { const p = at(w.a, 16); return tag(p[0], p[1], String(i + 1)); };

/* Ultimate Trophy Weapons, clockwise: the first spawns south and slightly west, the last north. */
const ULT: Array<[number, WeaponType]> = [[200, "sword"], [315, "axe"], [90, "scythe"], [180, "axe"], [270, "sword"], [0, "scythe"]];
const ultRun = (s: Slot) => buildRun(s, weapons(ULT));
/** The pieces of the weapons whose spawn index passes `keep`, with their order numbers. */
function ultPart(s: Slot, keep: (i: number) => boolean): Overlay[] {
  const R = ultRun(s);
  return [...R.overlays.filter(o => o.spawn != null && keep(o.spawn)), ...R.W.map(num).filter((_o, i) => keep(i))];
}

/* Void Stardust: the three puddles at their usual spots, north of the boss and clockwise. */
const PUDDLES: Point[] = [[50, 33], [58.8, 35.4], [64.9, 41.8]];
const PUDDLE_PIECES = PUDDLES.map(([x, y]): Overlay => ({t:"puddle", x, y, r:PUDDLE_R}));
const VOID_RESULTS: StepResult[] = PUDDLES.map(p => ({p, ok:true, z:{c:p, r:5}, drop:p}));
/** The party, stacked just past the third puddle. */
const STACKED: Array<[string, Role, Point]> = [["MT", "T", [72, 56]], ["OT", "T", [78, 56]], ["M1", "D", [72, 62]], ["M2", "D", [78, 62]],
  ["H1", "H", [72, 68]], ["H2", "H", [78, 68]], ["R1", "D", [72, 74]], ["R2", "D", [78, 74]]];
/** The party in a ring around the boss. */
const RING: Array<[string, Role, number]> = [["MT", "T", 337.5], ["OT", "T", 22.5], ["M2", "D", 67.5], ["R2", "D", 112.5],
  ["H2", "H", 157.5], ["H1", "H", 202.5], ["R1", "D", 247.5], ["M1", "D", 292.5]];
// TS note: `mark(...at(a, 20), l, r)` spreads the Point tuple into the x and y parameters.
// TypeScript allows it because it knows a Point has exactly two numbers.
const partyRing = (): Overlay[] => RING.map(([l, r, a]) => mark(...at(a, 20), l, r));

const RAIDWIDE: Overlay = {t:"aoe", x:50, y:50, r:72};
/** The scythe cones on the two tanks of Raw Steel Trophy (MT and OT stand at 317 and 43 degrees). */
const TANK_CONES = [cone([50, 50], 317, 16), cone([50, 50], 43, 16)];

/** One picture per Mechanics question, by question id. The test checks that every question has one. */
// TS note: Partial<Record<string, ...>> says any key may be missing, so a lookup returns
// the function or undefined, and the caller must check before it calls it.
export const MECH_FIGS: Partial<Record<string, (s: Slot) => Fig>> = {
  "k-raw-first": s => ({...fromDrill("m-raw-scythe", s), after:TANK_CONES}),
  "k-raw-second": s => { const d = fromDrill("m-raw-scythe", s);
    return {overlays:[tag(50, 8, "0:18 WAS AXE")], boss:BOSS, before:[tag(50, 56, "?")], after:[...d.overlays, ...TANK_CONES], answer:d.answer}; },
  "k-first-weapon": s => { const R = buildRun(s, weapons([[315, "sword"], [90, "scythe"], [180, "axe"]]));
    return {overlays:R.overlays, boss:R.states[0], after:R.W.map(num), answer:[circle(R.W[0].p, 9)]}; },
  "k-sword": s => jumpFig(s, "sword", 270),
  "k-axe": s => jumpFig(s, "axe", 90),
  "k-scythe": s => jumpFig(s, "scythe", 180),
  "k-void": () => ({overlays:[], boss:BOSS, after:PUDDLES.map((p, i) => tag(p[0], p[1], String(i + 1))), answer:PUDDLES.map(p => circle(p, PUDDLE_R))}),
  "k-void-target": s => { const me = S<Point>(s, [72, 68], [78, 68]);
    return {overlays:[...PUDDLE_PIECES, ...STACKED.map(([l, r, p]) => mark(p[0], p[1], l, r))], boss:BOSS,
      after:[target(me), tag(68, 83, "STACK ON A HEALER")], answer:[circle(me, 5)]}; },
  "k-void-spread": s => ({overlays:[...PUDDLE_PIECES, ...FIXED_SPREAD_MARKS], boss:BOSS, answer:[cometSpread(s)(VOID_RESULTS)]}),
  "k-void-run": s => { const R = buildRun(s, [turned(270, "scythe", 0)]);
    return {overlays:[...PUDDLE_PIECES, ...R.overlays, ...FIXED_SPREAD_MARKS], boss:STILL, answer:[cometSpread(s, R.W[0].p)(VOID_RESULTS)],
      note:"Example: the first weapon of the second set is a scythe in the west."}; },
  "k-assault-2": s => { const R = buildRun(s, [turned(45, "scythe", 0), turned(180, "axe", 40), turned(270, "sword", -45)]);
    return {overlays:R.overlays, boss:STILL, after:R.W.map(num), answer:[circle(R.W[0].p, 9)]}; },
  "k-void-2": s => ({overlays:PUDDLE_PIECES, boss:BOSS, before:[tag(50, 8, "1ST ENDED: STACK")],
    after:[tag(50, 8, "2ND ENDS: SPREAD"), ...FIXED_SPREAD_MARKS], answer:[cometSpread(s)(VOID_RESULTS)]}),
  "k-dance": s => { const d = fromDrill("m-dance", s);
    return {overlays:[], boss:d.boss, before:[tag(50, 8, "DANCE OF DOMINATION")], after:[RAIDWIDE, ...d.overlays, tag(50, 8, "7 HITS, THEN PAIRS")], answer:d.answer}; },
  "k-dance-north": s => { const d = fromDrill("m-dance", s);
    return {overlays:d.overlays, boss:d.boss, after:[tag(50, 6, "NEW NORTH"), tag(50, 94, "NEW SOUTH")], answer:[{rect:[12, 88, 88, 100]}]}; },
  "k-dance-pair": s => fromDrill("m-dance", s),
  "k-charyb": () => ({overlays:partyRing(), boss:BOSS, after:[RAIDWIDE, tag(50, 8, "EVERYONE AT 1 HP")]}),
  "k-ult-last": s => { const R = ultRun(s);
    return {overlays:ultPart(s, i => i < 5), boss:STILL, after:ultPart(s, i => i === 5), answer:[circle(R.W[5].p, 9)]}; },
  "k-ult-spawn": s => { const R = ultRun(s);
    return {overlays:ultPart(s, i => i === 0), boss:STILL, after:ultPart(s, i => i > 0), answer:[circle(R.W[1].p, 9)]}; },
  "k-ult-tornado": s => fromDrill("m-tornado", s),
  "k-ult-touch": s => { const d = fromDrill("m-tornado", s), me = S<Point>(s, [12, 42], [88, 58]), into = S<Point>(s, [20, 50], [80, 50]);
    return {overlays:d.overlays, boss:d.boss, before:[mark(me[0], me[1], s, "H"), guide(me, into)],
      after:[mark(into[0], into[1], s, "H"), tag(into[0], into[1] - 9, "KNOCKBACK"), tag(into[0], into[1] + 9, "DAMAGE DOWN")], answer:d.answer,
      note:"The green spot is where you bait: at the edge of your tornado, not in it."}; },
  "k-gwof": () => ({overlays:[mark(47, 33, "MT", "T"), mark(53, 33, "OT", "T")], boss:BOSS,
    after:[{t:"band", x:50, y:50, x2:50, y2:-20, w:10}, tag(50, 8, "2 TANK BUSTERS")], answer:[circle([50, 33], 7)],
    note:"Heal the tanks (green). The fire line stays on the floor, so keep out of it."}),
  "k-orbital": () => ({overlays:[], boss:BOSS, after:[{t:"poly", pts:[[50, 50], [0, 0], [100, 0]]}, {t:"poly", pts:[[50, 50], [0, 100], [100, 100]]}],
    answer:[{poly:[[50, 50], [0, 0], [0, 100]]}, {poly:[[50, 50], [100, 0], [100, 100]]}]}),
  "k-orbital-move": () => {
    const O = withSeed("HECT", buildOrbital), [a, b] = O.steps.map(st => st.z);
    if(!a || !b || !("fn" in a) || !("fn" in b)) throw new Error("the Orbital Omen zones are rule zones");
    return {overlays:O.overlays, boss:BOSS, after:[guide(a.label, b.label), tag(a.label[0], a.label[1], "START"), tag(b.label[0], b.label[1], "#2")], answer:[a, b],
      note:"One pattern. Start where the #2 lines cross. After #1, cross the hitbox. After #2, cross back."}; },
  "k-meteor-order": s => {
    const drops: Array<[Point, string, Role]> = [[[57, 43], "M1", "D"], [[43, 57], "M2", "D"], [[43, 43], "H1", "H"], [[26, 74], "H2", "H"], [[10, 90], "R1", "D"], [[62, 38], "R2", "D"]];
    return {overlays:drops.map(([p]) => target(p)), boss:BOSS, after:[...drops.map(([p, l, r]) => mark(p[0], p[1], l, r)), tag(50, 8, "MELEE > HEALERS > RANGED")],
      answer:[circle(S<Point>(s, [43, 43], [26, 74]), 6)]}; },
  "k-meteor-drop": s => fromDrill("m-meteor-2", s),
  "k-meteor-stack": () => ({overlays:[{t:"rock", x:57, y:43}, {t:"rock", x:43, y:57}, target([43, 43]), target([26, 74])], boss:BOSS,
    after:[{t:"band", x:50, y:50, x2:90, y2:10, w:8}], answer:[circle([65, 35], 7)]}),
  "k-triple": s => fromDrill("m-meteor-4", s, null, 1),
  "k-split-side": s => fromDrill("m-split-line", s),
  // Your mark sits just inside your tower, clear of the number marker next to it.
  "k-split-kb": s => { const d = fromDrill("m-split-tower", s), me = S<Point>(s, [11, 27], [89, 73]), to = S<Point>(s, [88, 27], [12, 73]);
    return {...d, overlays:[...d.overlays, mark(me[0], me[1], s, "H")], after:[guide(me, to)], answer:[S<ZoneShape>(s, {rect:[74.5, 0, 100, 100]}, {rect:[0, 0, 25.5, 100]})]}; },
  "k-split-fb": s => ({overlays:[], split:true, boss:BOSS, before:[mark(S(s, 10, 90), 50, s, "H")],
    after:[cone([50, 50], S(s, 270, 90), 14, 40), mark(...S<Point>(s, [20, 42], [80, 58]), s, "H")], answer:[S<ZoneShape>(s, {rect:[15, 38, 25.5, 62]}, {rect:[74.5, 38, 85, 62]})]}),
  "k-split-corner": s => ({overlays:[], split:true, boss:BOSS, before:[mark(S(s, 12, 88), 50, s, "H")],
    answer:S<Point[]>(s, [[9, 19], [9, 81]], [[91, 19], [91, 81]]).map(p => circle(p, 6.5)),
    note:"Markers go to a corner of your number marker. Tethers go to the platform edge. Ask your lead which corner: outer or inner."}),
  "k-split-towers23": s => { const d = fromDrill("m-split-tower", s), last = S<Point>(s, [19, 12], [81, 88]);
    return {overlays:[...d.overlays, mark(last[0], last[1], s, "H")], split:true, boss:BOSS, answer:[S<ZoneShape>(s, {c:[11, 23], r:7.5}, {c:[89, 77], r:7.5})],
      note:"Example: your last tether or marker was in the " + S(s, "northwest", "southeast") + " quadrant."}; },
  "k-massive": () => {
    const g1: Array<[string, Role]> = [["MT", "T"], ["H1", "H"], ["M1", "D"], ["R1", "D"]], g2: Array<[string, Role]> = [["OT", "T"], ["H2", "H"], ["M2", "D"], ["R2", "D"]];
    const spread = (g: typeof g1, x: number): Overlay[] => g.map(([l, r], i) => mark(x, 15 + i * 23, l, r));
    const stacked = (g: typeof g1, x: number): Overlay[] => g.map(([l, r], i) => mark(x + (i % 2) * 7, 47 + Math.floor(i / 2) * 7, l, r));
    return {overlays:[], split:true, boss:BOSS, before:[...spread(g1, 12), ...spread(g2, 88)],
      after:[...stacked(g1, 9), ...stacked(g2, 84), target([9, 47]), target([84, 47]), tag(12.5, 39, "5 HITS"), tag(87.5, 39, "5 HITS")],
      answer:[circle([12.5, 50.5], 9), circle([87.5, 50.5], 9)]}; },
  "k-slab": () => ({overlays:[], split:true, boss:{x:50, y:50, f:270}, after:[{t:"lane", rect:[0, 0, 25.5, 100]}, tag(13, 50, "GRABBED")],
    answer:[{rect:[74.5, 0, 100, 100]}], note:"Example: he faces the west platform."}),
  "k-ecl-start": s => fromDrill("m-ecl-start", s),
  "k-ecl-adjust": () => ({overlays:[mark(25, 25, "R1", "D"), mark(75, 25, "R2", "D"), target([25, 74]), target([75, 74]), mark(25, 74, "H1", "H"), mark(75, 74, "H2", "H"),
    {t:"aoe", x:66, y:93, r:5}, tag(66, 85, "PROXIMITY")], boss:BOSS, after:[guide([75, 74], [75, 36])], answer:[circle([75, 74], 7)],
    note:"Example: the proximity AoE is closer to H2, so H2 moves north."}),
  "k-ecl-prio": s => { const T: Point[] = [[50, 13], [87, 50], [50, 87], [13, 50]], who = ["H1", "H2", "R1", "R2"];
    return {overlays:T.map(([x, y]): Overlay => ({t:"tower", x, y})), boss:BOSS, after:T.map((p, i) => tag(p[0], p[1], who[i])), answer:[circle(S(s, T[0], T[1]), 7)],
      note:"Example tower spots. Count clockwise from A: H1 takes the first tower, then H2, R1 and R2."}; },
  "k-ecl-center": s => { const c: Point = [28, 30];
    return {overlays:[{t:"tower", x:c[0], y:c[1], r:13}, mark(...at(135, 13, c), "M1", "D")], boss:BOSS, after:[mark(c[0], c[1], s, "H")], answer:[circle(c, 3.5)]}; },
  "k-ecl-tether": s => ({overlays:[{t:"tower", x:50, y:13}], boss:BOSS, before:[mark(50, 13, s, "H")],
    after:[guide([50, 13], [50, 94]), guide([50, 94], [6, 94]), mark(6, 94, s, "H")], answer:[circle([6, 94], 6)],
    note:"Example: your tower is north. Take the tether to the south wall, then clockwise into the southwest corner."}),
  "k-ecl-two": s => fromDrill("m-ecl-two", s, "north"),
  "k-ecl-four": s => fromDrill("m-ecl-four", s, "south"),
  "k-hb": () => ({overlays:[{t:"tower", x:50, y:31, r:7}, mark(47, 31, "MT", "T"), mark(53, 31, "OT", "T")], boss:BOSS,
    after:[tag(50, 8, "5, THEN 6, THEN 7 HITS")], answer:[circle([50, 31], 7)],
    note:"Example spot. The tanks soak the tower, and you heal them between the hits."})
};
