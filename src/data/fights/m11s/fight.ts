// The full-fight run-through: one random scenario, laid out on the fight clock.
// Times and ability names come from the cactbot timeline for M11S
// (ui/raidboss/data/07-dt/raid/r11s.txt), with its branch offsets removed.
// It covers the whole fight, from the pull to the enrage (Heartbreaker at 10:59.6, `ENRAGE`).
import { DRILLS, SPLIT_INNER, avalancheScene, firstTowerEnd, firstTowersScene, homeSide, massiveScene, otherEnd, otherSide, portalAt, randomEndsSide, randomHalf, randomOthers, splitRound, splitTowers, swappedOthers, type SplitEnd, type SplitSide, buildAssault, buildAssault2, buildUltimate, assaultScene, ultimateScene, voidIntoWeapons, voidAgain, behind, FIRST_PUDDLE, type WeaponType } from "./drills";
import { ABILITIES, ENRAGE, FIGHT_END } from "./abilities";
import { newCode, random, withSeed } from "../../../util";
import { nearClock } from "../../../time";
import { zoneCenter } from "../../../geometry";
import { bossmod, cactbot, castStart, numberedAfter, tenth, type LineName } from "./sources";
import type { FightSeg, Hit, Scene, Slot, TLEvent } from "../../../types";

/** `code` rebuilds the same fight: the same weapons, the same stack or spread, and so on.
    `split` is when the arena is two platforms, from Flatliner to the Crown of Arcadia that
    joins it again, in seconds. `picks` says how each random part came out; `choices` is what
    the player asked for, so a link can carry it. */
export interface Fight { segs: FightSeg[]; events: TLEvent[]; end: number; split: [number, number]; summary: string; code: string; picks: Picks; choices: Choices }

// TS note: a template literal type builds a string type from other types, the way a C#
// interpolated string builds a value. A WeaponOrder is three weapon names joined by "-",
// for example "sword-axe-scythe".
/** The weapons of one Assault Evolved set, in the order the boss takes them. */
type WeaponOrder = `${WeaponType}-${WeaponType}-${WeaponType}`;

/** How each random part of a fight comes out. `set1` and `set2` are the weapon orders of the
    Assault Evolved sets at 0:48 and 1:33. */
export interface Picks { raw: "axe" | "scythe"; void: "stack" | "spread"; set1: WeaponOrder; set2: WeaponOrder; ult: "cw" | "ccw"; tether: "first" | "second"; fireball: "two" | "four"; wall: "north" | "south" }
// TS note: Choices is a mapped type. `[K in keyof Picks]` walks every field of Picks, so Choices
// has the same fields, and each one takes the same values or "random". Add a field to Picks and
// Choices gets it too. C# has no direct match; you would write the second class by hand.
export type Choices = { [K in keyof Picks]: Picks[K] | "random" };
export const RANDOM: Choices = {raw:"random", void:"random", set1:"random", set2:"random", ult:"random", tether:"random", fireball:"random", wall:"random"};

/** The six weapon orders, as [value, text]: "sword-axe-scythe" shows as "Sword, axe, scythe". */
const orderText = (o: string): string => { const s = o.split("-").join(", "); return s.charAt(0).toUpperCase() + s.slice(1); };
/** A one-word part of a mechanic's name, with a capital first letter: "axe" gives "Axe". */
const titleCase = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);
const ORDER_LIST: readonly WeaponOrder[] = ["sword-axe-scythe", "sword-scythe-axe", "axe-sword-scythe", "axe-scythe-sword", "scythe-sword-axe", "scythe-axe-sword"];
const ORDERS = ORDER_LIST.map(o => [o, orderText(o)] as const);

/** One row of the Settings panel: a pick, its label, and each value it can take with its text. */
// TS note: this mapped type makes one row type per key of Picks, then `[keyof Picks]` joins them
// into a union. So a "raw" row can only list "axe" and "scythe" as its values.
type ChoiceRow<K extends keyof Picks = keyof Picks> = { [P in K]: {key: P; label: string; options: readonly (readonly [Picks[P], string])[]} }[K];

/** The choices in the player's Settings panel, in fight order, with the text for each value. */
// TS note: `as const` keeps every key and value as its exact text, and `satisfies` checks the
// list against ChoiceRow without widening it. A value that a pick cannot take is a type error.
export const CHOICE_ROWS = [
  {key:"raw", label:"First Raw Steel Trophy", options:[["axe", "Axe"], ["scythe", "Scythe"]]},
  {key:"set1", label:`Weapon order at ${nearClock(cactbot("Assault Evolved"))}`, options:ORDERS},
  {key:"void", label:"First Void Stardust ends in", options:[["stack", "Stack"], ["spread", "Spread"]]},
  {key:"set2", label:`Weapon order at ${nearClock(cactbot("Assault Evolved", 2))}`, options:ORDERS},
  {key:"ult", label:"Ultimate Trophy Weapons", options:[["cw", "Clockwise"], ["ccw", "Counterclockwise"]]},
  {key:"tether", label:"Your Arena Split tether", options:[["first", "First round"], ["second", "Second round"]]},
  {key:"fireball", label:"Ecliptic Fireball", options:[["two", "Two-way"], ["four", "Four-way"]]},
  {key:"wall", label:"Your Ecliptic puddles", options:[["north", "North wall"], ["south", "South wall"]]}
] as const satisfies readonly ChoiceRow[];

/** Choices from saved settings or a link. Anything unknown becomes "random". */
export function cleanChoices(x: unknown): Choices {
  const c: Choices = {...RANDOM};
  if(!x || typeof x !== "object") return c;
  // Keep a value only when its row lists it. The generic K ties the row's key to its values.
  const keep = <K extends keyof Picks>(row: ChoiceRow<K>): void => {
    const found = row.options.find(([o]) => o === Reflect.get(x, row.key));
    if(found) c[row.key] = found[0];
  };
  CHOICE_ROWS.forEach(keep);
  return c;
}
/** For a link: "raw=axe,ult=cw". Choices left on "random" are left out. */
export const choicesText = (c: Choices): string => CHOICE_ROWS.filter(r => c[r.key] !== "random").map(r => r.key + "=" + c[r.key]).join(",");
export const parseChoices = (text: string): Choices => cleanChoices(Object.fromEntries(text.split(",").map(p => p.split("="))));

function drill(id: string, s: Slot, variant: string | null = null): Scene {
  const m = DRILLS.find(x => x.id === id);
  if(!m) throw new Error("missing drill " + id);
  return m.build(s, variant);
}

/* One fight. The random parts stay consistent: the second Raw Steel Trophy uses the other
   weapon, and the second Void Stardust ends the other way from the first. The same code and
   choices always build the same fight. */
export function buildFight(s: Slot, code = newCode(), choices: Choices = RANDOM): Fight {
  return withSeed(code, () => fightFor(s, code, choices));
}

/* A choice replaces a random result, but the random call still happens first. So the parts
   left on "random" come out the same as without the choice, and a code keeps its meaning. */
const choose = <T extends string>(choice: T | "random", rolled: T): T => choice === "random" ? rolled : choice;
// cleanChoices already checked the order against the six known ones, so the split is safe.
const orderOf = (choice: WeaponOrder | "random"): WeaponType[] | undefined => choice === "random" ? undefined : choice.split("-") as WeaponType[];
const orderIn = (A: {W: Array<{type: WeaponType}>}): WeaponOrder => A.W.map(w => w.type).join("-") as WeaponOrder;

function fightFor(s: Slot, code: string, c: Choices): Fight {
  const w1 = choose(c.raw, random() < 0.5 ? "axe" : "scythe"), w2 = w1 === "axe" ? "scythe" : "axe";
  const stackFirst = choose(c.void, random() < 0.5 ? "stack" : "spread") === "stack";
  // Built in this order on purpose: a fight code replays the same random calls in the same order.
  const A1 = buildAssault(s, orderOf(c.set1)), assault1 = assaultScene(A1, s), A2 = buildAssault2(s, orderOf(c.set2));
  /* Assault Evolved (ability B417) has a 6.0-second cast, so the boss turns to the first weapon
     6.0 seconds before cactbot's line: at 0:42.2 for the first set (line 0:48.2) and 1:26.7 for
     the second (line 1:32.7). That leaves about 8 seconds before the first hit. */
  const face1 = assault1.bossAt?.(0).f;
  /* A Void Stardust puddle drops under you when its 3.0-second cast starts (Cometite in BossMod)
     and goes off at cactbot's line, 3 seconds later. Where you drop it counts when it drops, so
     you can leave immediately. */
  const placed = (hits: number[]): number[] => hits.map(t => tenth(t - bossmod("Cometite").cast));
  // The hits of each Assault Evolved set, and the Cometite puddles of each Void Stardust.
  const weapons = (n: number): number[] => [cactbot("Assault Evolved 1", n), cactbot("Assault Evolved 2", n), cactbot("Assault Evolved 3", n)];
  const SET1 = weapons(1), SET2 = weapons(2), ULTIMATE = [...weapons(3), cactbot("Assault Evolved 4"), cactbot("Assault Evolved 5"), cactbot("Assault Evolved 6")];
  const puddles = (n: number): number[] => [cactbot("Cometite 1", n), cactbot("Cometite 2", n), cactbot("Cometite 3", n)];
  // The boss after the third weapon of the second set. He stays there for the second Void Stardust.
  const lastBoss = A2.states[A2.states.length - 1];
  /* Each click is due when the hit that checks it lands, in seconds into the fight. A scene
     appears when its cast starts (cactbot's StartsUsing or the ability before it). When the
     mechanic before it ends just then, the scene waits for the first cactbot line after that
     mechanic's last hit, so its result stays on the arena for a moment. */
  const segs: FightSeg[] = [
    {title:"Raw Steel Trophy: " + titleCase(w1), drills:["m-raw-" + w1], scene:drill("m-raw-" + w1, s), k:0, from:castStart("RawSteelTrophyAxe", "Raw Steel Trophy (Scythe/Axe)"), due:[cactbot("Heavy Hitter (Scythe)/Impact x6 (Axe)")]},
    {title:"Assault Evolved", drills:["m-assault"], scene:assault1, k:0, from:cactbot("Trophy Weapons"), turn:face1 != null ? {at:castStart("AssaultEvolvedLongCast", "Assault Evolved"), f:face1, weapons:A1.steps.length} : undefined, due:SET1},
    // The second set of weapons spawns when this Void Stardust starts, and the drill runs through all three.
    {title:"Void Stardust into the Second Weapons", drills:["m-void"], scene:voidIntoWeapons(s, !stackFirst, A2), k:0, from:cactbot("Trophy Weapons", 2),
      turn:{at:castStart("AssaultEvolvedLongCast", "Assault Evolved", 2), f:A2.W[0].a, weapons:A2.steps.length},
      due:[cactbot("Void Stardust"), ...placed(puddles(1)), cactbot("Comet"), ...SET2], pre:FIRST_PUDDLE},
    // 1:46 is typed by hand: no cactbot line comes between the last weapon (1:45.1) and the first
    // puddle (1:47.2). A question for the owner.
    {title:"Void Stardust (Second Time)", drills:[], scene:voidAgain(s, stackFirst, lastBoss), k:0, from:106, due:[...placed(puddles(2)), cactbot("Comet", 2)], pre:behind(lastBoss)},
    // The lines on the floor show only with the 7th and last hit, so the scene with the lines
    // appears then, not at the Trophy cast. Until then the arena stays empty.
    {title:"Dance of Domination", drills:["m-dance"], scene:drill("m-dance", s), k:Math.floor(random() * 4), from:cactbot("Dance of Domination 7"), due:[cactbot("Eye of the Hurricane")]},
    {title:"Raw Steel Trophy: " + titleCase(w2), drills:["m-raw-" + w2], scene:drill("m-raw-" + w2, s), k:0, from:cactbot("Raw Steel Trophy Axe", 2), due:[cactbot("Heavy Hitter (Scythe)", 2)]}
  ];
  // Ultimate Trophy Weapons is built here, after the Dance of Domination turn, as it always was.
  const U = buildUltimate(s, c.ult === "random" ? undefined : c.ult === "cw");
  segs.push(
    {title:"Ultimate Trophy Weapons", drills:["m-ultimate"], scene:ultimateScene(U), k:0, from:cactbot("Ultimate Trophy Weapons"), due:ULTIMATE},
    {title:"Tornadoes", drills:["m-tornado"], scene:drill("m-tornado", s), k:0, from:cactbot("--middle--", 5), due:[cactbot("Powerful Gust")]}
  );
  /* Phases 2 to 4. They are built after Phase 1 on purpose, so a fight code made before they
     existed still replays the same Phase 1. At 9:31 the boss casts Two-way or Four-way Fireball,
     and your Ecliptic Stampede puddles went down along the north or the south wall.
     Orbital Omen checks you before the #1 lines (with Fire and Fury), the #2 lines and the #3 line.
     The meteor you bait in Meteorain is due when it lands (Cosmic Kiss). */
  const four = choose(c.fireball, random() < 0.5 ? "four" : "two") === "four", wall = choose(c.wall, random() < 0.5 ? "north" : "south");
  const fireball = four ? "Four-way Fireball" : "Two-way Fireball", ecl = four ? "m-ecl-four" : "m-ecl-two";
  segs.push(
    {title:"Orbital Omen", drills:["m-orbital"], scene:drill("m-orbital", s), k:0, from:cactbot("Orbital Omen (castbar)"), due:[cactbot("Orbital Omen 1"), cactbot("Orbital Omen 2"), cactbot("Orbital Omen 3")]},
    {title:"Meteorain: First Line Stack", drills:["m-meteor-1"], scene:drill("m-meteor-1", s), k:0, from:cactbot("Meteorain"), due:[cactbot("Fearsome Fireball")]},
    {title:"Meteorain: Your Meteor", drills:["m-meteor-2"], scene:drill("m-meteor-2", s), k:0, from:cactbot("Cosmic Kiss"), due:[cactbot("Cosmic Kiss", 2)]},
    {title:"Meteorain: Third Line Stack", drills:["m-meteor-3"], scene:drill("m-meteor-3", s), k:0, from:cactbot("--tethers--", 2), due:[cactbot("Fearsome Fireball", 3)]},
    {title:"Meteorain: Last Line Stack", drills:["m-meteor-4"], scene:drill("m-meteor-4", s), k:0, from:cactbot("Cosmic Kiss", 3), due:[cactbot("Fearsome Fireball", 4), cactbot("Triple Tyrannhilation")]},
    {title:"Arena Split: Lineup", drills:["m-split-line"], scene:drill("m-split-line", s), k:0, from:cactbot("Flatliner (split)"), due:[cactbot("Majestic Meteor")]},
    // Its scene comes with the rest of Arena Split below, once the tether round is known.
    {title:"Arena Split: First Towers", drills:["m-split-tower"], scene:drill("m-split-tower", s), k:0, from:cactbot("--tethers--", 3), due:[cactbot("Explosion", 6)]},
    {title:"Orbital Omen", drills:["m-orbital"], scene:drill("m-orbital", s), k:0, from:cactbot("Orbital Omen (castbar)", 2), due:[cactbot("Orbital Omen 1", 2), cactbot("Orbital Omen 2", 2), cactbot("Orbital Omen 3", 2)]},
    {title:"Ecliptic Stampede: Start", drills:["m-ecl-start"], scene:drill("m-ecl-start", s), k:0, from:cactbot("--middle--", 7), due:[cactbot("Atomic Impact 1")]},
    {title:"Ecliptic Stampede: " + fireball, drills:[ecl], scene:drill(ecl, s, wall), k:0, from:cactbot("Weighty Impact"), due:[cactbot("Two-way Fireball / Four-way Fireball")]}
  );
  /* The rest of Arena Split, built last so the random parts above keep their codes. You have a
     tether in one round of the two and not in the other. Each tower knocks you away from its
     middle. A tether ends on the platform across from its portal: when its portal is on your
     side, the tower knocks you across; when it is already across, you stay. Without a tether
     you stay, and the knockback sends you to the other end of your platform. Everyone is in
     close when the first puddle's cast starts (cactbot's "--meteor 1--"), after the Fire Breath
     markers. Each puddle drops when its cast starts ("--meteor 1--" to "--meteor 3--") and goes
     off 3 seconds later (MajesticMeteorAOE). The tethers and markers resolve with Fire Breath.
     Your end of the platform: with a tether, the end away from your portal (random); without
     one, the end you were knocked to. The side portal lines cover a random half of each
     platform each round. The side whose tether portals are near the ends is random each round,
     and so are the other tethered players and the side of your portal; in the second round the
     tethers swap. Then the boss faces a random platform and turns to the other over a random
     side. */
  const t1 = choose(c.tether, random() < 0.5 ? "first" : "second") === "first";
  const end = (): SplitEnd => random() < 0.5 ? "north" : "south";
  const portal1 = end(), portal2 = end(), face: SplitSide = random() < 0.5 ? "west" : "east", swing = end();
  const cover1 = randomHalf(), cover2 = randomHalf(), ends1 = randomEndsSide(), ends2 = randomEndsSide();
  const others1 = randomOthers(s, t1 ? 3 : 4), others2 = swappedOthers(s, others1);
  // The side of your tether's portal in each round: you end on the platform across from it.
  const portalSide1 = randomEndsSide(), portalSide2 = randomEndsSide();
  // Without a tether the tower knocks you along your platform, to its other end: in round 1 from
  // your first tower, in round 2 from the tower where round 1 ended.
  const home = homeSide(s);
  const end1 = t1 ? portal1 : otherEnd(firstTowerEnd(s)), side1 = t1 ? otherSide(portalSide1) : home;
  const end2 = t1 ? otherEnd(end1) : portal2, side2 = t1 ? side1 : otherSide(portalSide2);
  const WRATH = "Majestic Meteowrath/Majestic Meteorain/Fire Breath";
  const round = (n: number): number[] => [cactbot("--meteor 1--", n), cactbot("--meteor 2--", n), cactbot("--meteor 3--", n), cactbot(WRATH, n)];
  // The first towers come with the round 1 tethers: yours, if you have one, shows from the start,
  // so you can see before the knockback which way it needs you to go. Its portal is in the half
  // away from where round 1 ends.
  const first = segs.find(g => g.drills[0] === "m-split-tower");
  if (first) first.scene = firstTowersScene(s, t1 ? {portal:portalAt(portalSide1, otherEnd(end1), ends1)} : null);
  segs.push(
    {title:"Arena Split: Fire Breath", drills:["m-split-fire"], scene:splitRound(s, {tether:t1, side:side1, end:end1, covered:cover1, endsSide:ends1, others:others1}), k:0, from:cactbot("Explosion", 6), due:round(1)},
    {title:"Arena Split: Second Towers", drills:["m-split-towers2"], scene:splitTowers(s, side1, end1, t1 ? null : {portal:portalAt(portalSide2, otherEnd(end2), ends2)}), k:0, from:cactbot("--tethers--", 4), due:[cactbot("Explosion", 7)]},
    {title:"Arena Split: Fire Breath (Second Time)", drills:["m-split-fire"], scene:splitRound(s, {tether:!t1, side:side2, end:end2, covered:cover2, endsSide:ends2, others:others2}), k:0, from:cactbot("Explosion", 7), due:round(2)},
    {title:"Massive Meteor", drills:["m-massive"], scene:massiveScene(side2), k:0, from:cactbot("Massive Meteor (castbar)"), due:[cactbot("Massive Meteor x5")],
      // The cast gives about a second, so the party waits in close, where the stack goes.
      pre:zoneCenter(SPLIT_INNER[side2])},
    {title:"Arcadion Avalanche", drills:["m-avalanche"], scene:avalancheScene(s, side2, end2, face, swing), k:0, from:cactbot("Massive Meteor x5"), due:[cactbot("Explosion", 8), cactbot("Arcadion Avalanche")]}
  );
  // TS note: sort with a compare function, like List.Sort(Comparison) in C#. It keeps equal items in order.
  segs.sort((a, b) => a.from - b.from);
  /* A Practice scene can mark where you stand (Arena Split's towers mark where you ended the
     last round). The fight draws you as the moving marker, so it drops your own mark. */
  for(const g of segs) g.scene = {...g.scene, overlays:g.scene.overlays.filter(o => !(o.t === "mark" && o.l === s))};
  /* The timeline lines, with cactbot's names. Where the arena is the test, the names stay as
     general as cactbot's before it syncs: "Comet/Crushing Comet", "Assault Evolved 1". */
  // The nth Raw Steel Trophy with weapon w: its cast and its hits.
  const raw = (w: string, n: number): Array<[number, string]> => w === "axe"
    ? [[cactbot("Raw Steel Trophy Axe", n), "Raw Steel Trophy Axe"], [cactbot("Raw Steel (Axe)", n), "Raw Steel (Axe)"], [cactbot("Impact x6 (Axe)", n), "Impact x6 (Axe)"]]
    : [[cactbot("Raw Steel Trophy Scythe", n), "Raw Steel Trophy Scythe"], [cactbot("Heavy Hitter (Scythe)", n), "Heavy Hitter (Scythe)"]];
  const assault = (times: number[]): Array<[number, string]> => times.map((t, i) => [t, "Assault Evolved " + (i + 1)]);
  // Each Cometite puddle drops when its cast starts (BossMod) and goes off at cactbot's line.
  const comets = (n: number): Array<[number, string]> => {
    const [c1, c2, c3] = puddles(n), drop = (t: number): number => tenth(t - bossmod("Cometite").cast);
    return [[drop(c1), "Cometite 1 drops"], [drop(c2), "Cometite 2 drops"], [c1, "Cometite 1"], [drop(c3), "Cometite 3 drops"],
      [c2, "Cometite 2"], [c3, "Cometite 3"], [cactbot("Comet", n), "Comet/Crushing Comet"]];
  };
  // The nth Heartbreak Kick: its cast and each hit on the tower.
  const kicks = (n: number): Array<[number, string]> => [[cactbot("Heartbreak Kick", n), "Heartbreak Kick"], ...numberedAfter("Heartbreak Kick", n)];
  // The same line name, each time it comes: L("Crown of Arcadia", 2) is the second Crown of Arcadia.
  const L = (name: LineName, n = 1, shown: string = name): [number, string] => [cactbot(name, n), shown];
  const RAIDWIDE = new Set(["Crown of Arcadia", "Dance of Domination 1", "Dance of Domination 7", "One and Only",
    "Triple Tyrannhilation", "Flatliner", "Mammoth Meteor x2", "Heartbreaker (Enrage)"]);
  /* The boss's own casts: the lines whose ability BossMod lists as "Boss->self, N s cast,
     single-target" (AID in RM11STheTyrantEnums.cs), matched by the ability id on cactbot's line.
     They do no damage: the boss's cast bar ends and a mechanic starts. Orbital Omen and Massive
     Meteor are cactbot's "(castbar)" lines. A Cometite puddle "drops" when its cast starts, so
     those lines count as casts too. Every other line is a hit. */
  const BOSS_CAST = new Set(["Raw Steel Trophy Axe", "Raw Steel Trophy Scythe", "Trophy Weapons", "Assault Evolved",
    "Void Stardust", "Dance of Domination Trophy", "Ultimate Trophy Weapons", "Assault Apex", "Immortal Reign",
    "Orbital Omen", "Meteorain", "Triple Tyrannhilation", "Majestic Meteor", "Massive Meteor", "Ecliptic Stampede",
    "Heartbreak Kick"]);
  const lines: Array<[number, string]> = [
    L("Crown of Arcadia"),
    ...raw(w1, 1), L("--middle--"),
    L("Trophy Weapons"), L("Assault Evolved"), ...assault(SET1), L("--middle--", 2),
    L("Trophy Weapons", 2), L("Void Stardust"), ...comets(1),
    L("Assault Evolved", 2), ...assault(SET2), ...comets(2),
    L("Crown of Arcadia", 2), L("--middle--", 3),
    L("Dance of Domination Trophy"), L("Dance of Domination 1"), L("Dance of Domination 7"), L("Eye of the Hurricane"),
    ...raw(w2, 2), L("--middle--", 4),
    L("Charybdistopia"), L("Ultimate Trophy Weapons"), L("Assault Apex"),
    ...assault(ULTIMATE), L("--middle--", 5),
    L("Powerful Gust"), L("Immortal Reign"),
    L("One and Only"),
    L("Great Wall of Fire 1"), L("Great Wall of Fire 2"), L("Explosion 1"), L("Explosion 2"),
    L("Orbital Omen (castbar)", 1, "Orbital Omen"), L("Orbital Omen 1"), L("Fire and Fury"), L("Orbital Omen 2"), L("Orbital Omen 3"), L("Orbital Omen 4"),
    L("--middle--", 6),
    L("Meteorain"), L("Fearsome Fireball"), L("Cosmic Kiss"),
    L("Foregone Fatality"), L("Fearsome Fireball", 2), L("Cosmic Kiss", 2), L("Explosion", 3),
    L("Foregone Fatality", 2), L("Fearsome Fireball", 3), L("Cosmic Kiss", 3), L("Explosion", 4),
    L("Foregone Fatality", 3), L("Fearsome Fireball", 4), L("Explosion", 5),
    L("Triple Tyrannhilation"),
    L("Flatliner (split)", 1, "Flatliner"), L("Majestic Meteor"), L("Explosion", 6),
    // A Majestic Meteor puddle "drops" when its cast starts (cactbot's "--meteor 1--"), as a Cometite puddle does. So do the second and third.
    L("--meteor 1--", 1, "Majestic Meteor 1 drops"), L("--meteor 2--", 1, "Majestic Meteor 2 drops"), L("Majestic Meteor 1"), L("--meteor 3--", 1, "Majestic Meteor 3 drops"), L("Majestic Meteor 2"), L("Majestic Meteowrath/Majestic Meteorain/Fire Breath"), L("Majestic Meteor 3"),
    L("Explosion", 7),
    L("--meteor 1--", 2, "Majestic Meteor 1 drops"), L("--meteor 2--", 2, "Majestic Meteor 2 drops"), L("Majestic Meteor 1", 2), L("--meteor 3--", 2, "Majestic Meteor 3 drops"), L("Majestic Meteor 2", 2), L("Majestic Meteowrath/Majestic Meteorain/Fire Breath", 2), L("Majestic Meteor 3", 2),
    L("Massive Meteor (castbar)", 1, "Massive Meteor"), L("Massive Meteor x5"), L("Explosion", 8), L("Arcadion Avalanche"),
    L("Crown of Arcadia", 3),
    L("Great Wall of Fire 1", 2), L("Great Wall of Fire 2", 2), L("Explosion 1", 2), L("Explosion 2", 2),
    L("Orbital Omen (castbar)", 2, "Orbital Omen"), L("Orbital Omen 1", 2), L("Fire and Fury", 2), L("Orbital Omen 2", 2), L("Orbital Omen 3", 2), L("Orbital Omen 4", 2),
    L("Crown of Arcadia", 4), L("--middle--", 7),
    L("Ecliptic Stampede"), L("Mammoth Meteor x2"), L("Atomic Impact 1"), L("Atomic Impact 2"), L("Atomic Impact 3"),
    L("Atomic Impact 4"), L("Atomic Impact 5"), L("Atomic Impact 6"), L("Cosmic Kiss", 4),
    L("Majestic Meteowrath x4"), L("Two-way Fireball / Four-way Fireball", 1, fireball),
    L("Crown of Arcadia", 5), L("--middle--", 8),
    ...kicks(1), ...kicks(2), ...kicks(3),
    [ENRAGE, "Heartbreaker (Enrage)"]
  ];
  const events = lines.map(([t, name]): TLEvent => ({t, name, raidwide:RAIDWIDE.has(name), cast:BOSS_CAST.has(name) || name.endsWith(" drops")}));
  const picks: Picks = {raw:w1, void:stackFirst ? "stack" : "spread", set1:orderIn(A1), set2:orderIn(A2),
    ult:U.cw ? "cw" : "ccw", tether:t1 ? "first" : "second", fireball:four ? "four" : "two", wall};
  const summary = "Raw Steel Trophy: " + w1 + " first, then " + w2 + ". Assault Evolved at " + nearClock(cactbot("Assault Evolved")) + ": " + orderText(picks.set1).toLowerCase() +
    ". At " + nearClock(cactbot("Assault Evolved", 2)) + ": " + orderText(picks.set2).toLowerCase() + ". Void Stardust: " + (stackFirst ? "stack first, then spread." : "spread first, then stack.") +
    " Ultimate Trophy Weapons: " + (U.cw ? "clockwise." : "counterclockwise.") +
    " Arena Split: your tether in the " + (t1 ? "first" : "second") + " round." +
    " Ecliptic Stampede: " + fireball + ", with your puddles along the " + wall + " wall.";
  return {segs, events, end:FIGHT_END, split:[cactbot("Flatliner (split)"), cactbot("Crown of Arcadia", 3)], summary, code, picks, choices:c};
}

/* ---------- damage going out ---------- */
/** Every hit of the fight, in time order, from the ability list and its hit rules. */
export function buildHits(f: Fight): Hit[] {
  const hits: Hit[] = [];
  ABILITIES.forEach((a, i) => {
    const rule = a.hit ?? {}, next = ABILITIES[i + 1]?.t ?? Infinity;
    if(rule.lines){
      const prefix = rule.lines + " ", isHit = (name: string): boolean => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length));
      for(const e of f.events) if(e.t >= a.t && e.t < next && isHit(e.name)) hits.push({t:e.t, name:e.name, kind:"shared", cat:a.cats[0] ?? "spot"});
    }
    else if(a.cats.includes("enrage")) hits.push({t:a.t, name:a.name, kind:"enrage", cat:"enrage"});
    else if(rule.times){
      const {n, gap, name} = rule.times, cat = a.cats[0] ?? "raid";
      for(let k = 0; k < n; k++) hits.push({t:a.t + k * gap, name:name + " " + (k + 1), kind:cat === "raid" ? "raid" : "aoe", cat});
    }
    else if(a.cats.includes("raid")) hits.push({t:a.t, name:a.name, kind:"raid", cat:"raid"});
    else if(a.cats.includes("tank")) hits.push({t:a.t, name:a.name, kind:"tank", cat:"tank"});
    else if(rule.shared) hits.push({t:a.t, name:a.name, kind:"shared", cat:a.cats[0] ?? "target"});
    else if(a.cats.includes("target") || a.cats.includes("dodge")) hits.push({t:a.t, name:a.name, kind:"aoe", cat:a.cats.includes("target") ? "target" : "dodge"});
  });
  return hits.sort((a, b) => a.t - b.t);
}
