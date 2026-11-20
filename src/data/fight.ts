// The full-fight run-through: one random scenario, laid out on the fight clock.
// Times and ability names come from the cactbot timeline for M11S
// (ui/raidboss/data/07-dt/raid/r11s.txt), with its branch offsets removed.
// It covers the whole fight, from the pull to the enrage (Heartbreaker at 10:59.6, `ENRAGE`).
import { MAPS, buildAssault, buildAssault2, buildUltimate, assaultScene, ultimateScene, voidIntoWeapons, voidAgain, behind, FIRST_PUDDLE, type WeaponType } from "./drills";
import { ABILITIES, ENRAGE, FIGHT_END, type Cat } from "./abilities";
import { newCode, random, withSeed } from "../util";
import type { Point, Scene, Slot } from "../types";

/** One line on the fight timeline: `name` happens at `t`, in seconds into the fight. */
interface TLEvent { t: number; name: string; raidwide?: boolean }

/** One stretch of the fight with a scene on the arena. `due[i]` is when step i resolves. */
export interface FightSeg {
  title: string;
  /** The Practice drills this stretch tests. Its result counts toward the first one's score,
      and the end screen links to it with "Practice it". */
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
  /** Where to pre-position before this stretch, when the first move is known in advance (the
      first Void Stardust puddle is always north, the second one is at the boss's butt). The
      player goes there right after the last hit before it. Without it, the player waits right up
      at the boss in a quiet stretch (see data/route.ts). */
  pre?: Point;
}

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
export interface Picks { raw: "axe" | "scythe"; void: "stack" | "spread"; set1: WeaponOrder; set2: WeaponOrder; ult: "cw" | "ccw"; fireball: "two" | "four"; wall: "north" | "south" }
// TS note: Choices is a mapped type. `[K in keyof Picks]` walks every field of Picks, so Choices
// has the same fields, and each one takes the same values or "random". Add a field to Picks and
// Choices gets it too. C# has no direct match; you would write the second class by hand.
export type Choices = { [K in keyof Picks]: Picks[K] | "random" };
export const RANDOM: Choices = {raw:"random", void:"random", set1:"random", set2:"random", ult:"random", fireball:"random", wall:"random"};

/** The six weapon orders, as [value, text]: "sword-axe-scythe" shows as "Sword, axe, scythe". */
const orderText = (o: string): string => { const s = o.split("-").join(", "); return s.charAt(0).toUpperCase() + s.slice(1); };
const ORDERS: Array<[string, string]> = ["sword-axe-scythe", "sword-scythe-axe", "axe-sword-scythe", "axe-scythe-sword", "scythe-sword-axe", "scythe-axe-sword"]
  .map((o): [string, string] => [o, orderText(o)]);

/** The choices in the player's Settings panel, in fight order, with the text for each value. */
export const CHOICE_ROWS: Array<{key: keyof Picks; label: string; options: Array<[string, string]>}> = [
  {key:"raw", label:"First Raw Steel Trophy", options:[["axe", "Axe"], ["scythe", "Scythe"]]},
  {key:"set1", label:"Weapon order at 0:48", options:ORDERS},
  {key:"void", label:"First Void Stardust ends in", options:[["stack", "Stack"], ["spread", "Spread"]]},
  {key:"set2", label:"Weapon order at 1:33", options:ORDERS},
  {key:"ult", label:"Ultimate Trophy Weapons", options:[["cw", "Clockwise"], ["ccw", "Counterclockwise"]]},
  {key:"fireball", label:"Ecliptic Fireball", options:[["two", "Two-way"], ["four", "Four-way"]]},
  {key:"wall", label:"Your Ecliptic puddles", options:[["north", "North wall"], ["south", "South wall"]]}
];

/** Choices from saved settings or a link. Anything unknown becomes "random". */
export function cleanChoices(x: unknown): Choices {
  const c: Choices = {...RANDOM};
  if(x && typeof x === "object") for(const row of CHOICE_ROWS){
    const v = (x as Record<string, unknown>)[row.key];
    if(typeof v === "string" && row.options.some(([o]) => o === v)) (c as Record<string, string>)[row.key] = v;
  }
  return c;
}
/** For a link: "raw=axe,ult=cw". Choices left on "random" are left out. */
export const choicesText = (c: Choices): string => CHOICE_ROWS.filter(r => c[r.key] !== "random").map(r => r.key + "=" + c[r.key]).join(",");
export const parseChoices = (text: string): Choices => cleanChoices(Object.fromEntries(text.split(",").map(p => p.split("="))));

/** "1:24" to 84. */
export const sec = (t: string): number => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
/** 84 to "1:24". */
export const clock = (t: number): string => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

function drill(id: string, s: Slot, variant: string | null = null): Scene {
  const m = MAPS.find(x => x.id === id);
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
  const CAST = 6.0, face1 = assault1.bossAt?.(0).f;
  /* A Void Stardust puddle drops under you when its 3.0-second cast starts (Cometite in BossMod)
     and goes off at cactbot's line, 3 seconds later. Where you drop it counts when it drops, so
     you can leave right away. */
  const placed = (hits: number[]): number[] => hits.map(t => Math.round((t - 3.0) * 10) / 10);
  // The boss after the third weapon of the second set. He stays there for the second Void Stardust.
  const lastBoss = A2.states[A2.states.length - 1];
  /* Each click is due when the hit that checks it lands, in seconds into the fight. A scene
     appears when its cast starts (cactbot's StartsUsing or the ability before it). */
  const segs: FightSeg[] = [
    {title:"Raw Steel Trophy: " + w1, drills:["m-raw-" + w1], scene:drill("m-raw-" + w1, s), k:0, from:15.7, due:[25.1]},
    {title:"Assault Evolved", drills:["m-assault"], scene:assault1, k:0, from:38.4, turn:face1 != null ? {at:48.2 - CAST, f:face1, weapons:A1.steps.length} : undefined, due:[50.4, 55.5, 60.6]},
    // The second set of weapons spawns when this Void Stardust starts, and the drill runs through all three.
    {title:"Void Stardust into the second weapons", drills:["m-void"], scene:voidIntoWeapons(s, !stackFirst, A2), k:0, from:72.7,
      turn:{at:92.7 - CAST, f:A2.W[0].a, weapons:A2.steps.length}, due:[79.8, ...placed([83.9, 85.9, 87.9]), 89.9, 94.9, 100.0, 105.1], pre:FIRST_PUDDLE},
    {title:"Void Stardust again", drills:[], scene:voidAgain(s, stackFirst, lastBoss), k:0, from:106, due:[...placed([110.2, 112.2, 114.2]), 116.2], pre:behind(lastBoss)},
    // The lines on the floor show only just after the 7th and last hit (2:25.5), so the scene
    // with the lines appears then, not at the Trophy cast. Until then the arena stays empty.
    {title:"Dance of Domination", drills:["m-dance"], scene:drill("m-dance", s), k:Math.floor(random() * 4), from:146.0, due:[150.5]},
    {title:"Raw Steel Trophy: " + w2, drills:["m-raw-" + w2], scene:drill("m-raw-" + w2, s), k:0, from:156.4, due:[163.8]}
  ];
  // Ultimate Trophy Weapons is built here, after the Dance of Domination turn, as it always was.
  const U = buildUltimate(s, c.ult === "random" ? undefined : c.ult === "cw");
  segs.push(
    {title:"Ultimate Trophy Weapons", drills:["m-ultimate"], scene:ultimateScene(U), k:0, from:184.6, due:[194.6, 199.7, 204.8, 209.9, 215.0, 220.1]},
    {title:"Tornadoes", drills:["m-tornado"], scene:drill("m-tornado", s), k:0, from:221.2, due:[226.3]}
  );
  /* Phases 2 to 4. They are built after Phase 1 on purpose, so a fight code made before they
     existed still replays the same Phase 1. At 9:31 the boss casts Two-way or Four-way Fireball,
     and your Ecliptic Stampede puddles went down along the north or the south wall.
     Orbital Omen checks you before the #1 lines (with Fire and Fury), the #2 lines and the #3 line.
     The meteor you bait in Meteorain is due when it lands (Cosmic Kiss). */
  const four = choose(c.fireball, random() < 0.5 ? "four" : "two") === "four", wall = choose(c.wall, random() < 0.5 ? "north" : "south");
  const fireball = four ? "Four-way Fireball" : "Two-way Fireball", ecl = four ? "m-ecl-four" : "m-ecl-two";
  segs.push(
    {title:"Orbital Omen", drills:["m-orbital"], scene:drill("m-orbital", s), k:0, from:266.1, due:[275.2, 276.8, 278.4]},
    {title:"Meteorain: first stack", drills:["m-meteor-1"], scene:drill("m-meteor-1", s), k:0, from:292.1, due:[300.1]},
    {title:"Meteorain: your meteor", drills:["m-meteor-2"], scene:drill("m-meteor-2", s), k:0, from:301.3, due:[311.4]},
    {title:"Meteorain: third stack", drills:["m-meteor-3"], scene:drill("m-meteor-3", s), k:0, from:312.0, due:[320.2]},
    {title:"Meteorain: last stack, then hide", drills:["m-meteor-4"], scene:drill("m-meteor-4", s), k:0, from:321.5, due:[330.2, 342.9]},
    {title:"Arena Split: line up", drills:["m-split-line"], scene:drill("m-split-line", s), k:0, from:361.8, due:[375.9]},
    {title:"Arena Split: first towers", drills:["m-split-tower"], scene:drill("m-split-tower", s), k:0, from:376.5, due:[389.0]},
    {title:"Orbital Omen", drills:["m-orbital"], scene:drill("m-orbital", s), k:0, from:504.0, due:[513.1, 514.7, 516.3]},
    {title:"Ecliptic Stampede: start", drills:["m-ecl-start"], scene:drill("m-ecl-start", s), k:0, from:527.0, due:[541.2]},
    {title:"Ecliptic Stampede: " + fireball, drills:[ecl], scene:drill(ecl, s, wall), k:0, from:557.5, due:[571.1]}
  );
  /* The timeline lines, with cactbot's names. Where the arena is the test, the names stay as
     general as cactbot's before it syncs: "Comet/Crushing Comet", "Assault Evolved 1". */
  const raw = (w: string, t: number): Array<[number, string]> => w === "axe"
    ? [[t, "Raw Steel Trophy Axe"], [t + 6.3, "Raw Steel (Axe)"], [t + 7.4, "Impact x6 (Axe)"]]
    : [[t, "Raw Steel Trophy Scythe"], [t + 7.4, "Heavy Hitter (Scythe)"]];
  const assault = (times: number[]): Array<[number, string]> => times.map((t, i) => [t, "Assault Evolved " + (i + 1)]);
  // Each Cometite puddle drops 3 seconds before it goes off, when its cast starts (BossMod).
  const comets = (t: number): Array<[number, string]> =>
    [[t - 3, "Cometite 1 drops"], [t - 1, "Cometite 2 drops"], [t, "Cometite 1"], [t + 1, "Cometite 3 drops"],
     [t + 2, "Cometite 2"], [t + 4, "Cometite 3"], [t + 6, "Comet/Crushing Comet"]];
  const kicks = (t: number, n: number): Array<[number, string]> =>
    [[t, "Heartbreak Kick"], ...Array.from({length:n}, (_x, i): [number, string] => [t + 1.1 + 2 * i, "Heartbreak Kick " + (i + 1)])];
  const RAIDWIDE = new Set(["Crown of Arcadia", "Dance of Domination 1", "Dance of Domination 7", "One and Only",
    "Triple Tyrannhilation", "Flatliner", "Mammoth Meteor x2", "Heartbreaker (Enrage)"]);
  const lines: Array<[number, string]> = [
    [10.6, "Crown of Arcadia"],
    ...raw(w1, 17.7), [33.1, "--middle--"],
    [38.4, "Trophy Weapons"], [48.2, "Assault Evolved"], ...assault([50.4, 55.5, 60.6]), [67.7, "--middle--"],
    [72.7, "Trophy Weapons"], [79.8, "Void Stardust"], ...comets(83.9),
    [92.7, "Assault Evolved"], ...assault([94.9, 100.0, 105.1]), ...comets(110.2),
    [122.2, "Crown of Arcadia"], [130.4, "--middle--"],
    [134.6, "Dance of Domination Trophy"], [141.3, "Dance of Domination 1"], [145.5, "Dance of Domination 7"], [150.5, "Eye of the Hurricane"],
    ...raw(w2, 156.4), [171.8, "--middle--"],
    [178.9, "Charybdistopia"], [184.6, "Ultimate Trophy Weapons"], [192.4, "Assault Apex"],
    ...assault([194.6, 199.7, 204.8, 209.9, 215.0, 220.1]), [221.2, "--middle--"],
    [226.3, "Powerful Gust"], [227.3, "Immortal Reign"],
    [240.4, "One and Only"],
    [252.8, "Great Wall of Fire 1"], [256.0, "Great Wall of Fire 2"], [256.6, "Explosion 1"], [259.8, "Explosion 2"],
    [266.1, "Orbital Omen"], [275.2, "Orbital Omen 1"], [275.8, "Fire and Fury"], [276.8, "Orbital Omen 2"], [278.4, "Orbital Omen 3"], [279.8, "Orbital Omen 4"],
    [285.0, "--middle--"],
    [292.1, "Meteorain"], [300.1, "Fearsome Fireball"], [301.3, "Cosmic Kiss"],
    [309.3, "Foregone Fatality"], [310.2, "Fearsome Fireball"], [311.4, "Cosmic Kiss"], [314.0, "Explosion"],
    [319.3, "Foregone Fatality"], [320.2, "Fearsome Fireball"], [321.4, "Cosmic Kiss"], [324.0, "Explosion"],
    [329.3, "Foregone Fatality"], [330.2, "Fearsome Fireball"], [334.0, "Explosion"],
    [342.9, "Triple Tyrannhilation"],
    [361.8, "Flatliner"], [375.9, "Majestic Meteor"], [389.0, "Explosion"],
    [400.0, "Majestic Meteor 1"], [402.0, "Majestic Meteor 2"], [403.9, "Majestic Meteowrath/Majestic Meteorain/Fire Breath"], [404.1, "Majestic Meteor 3"],
    [421.1, "Explosion"],
    [432.1, "Majestic Meteor 1"], [434.1, "Majestic Meteor 2"], [436.0, "Majestic Meteowrath/Majestic Meteorain/Fire Breath"], [436.1, "Majestic Meteor 3"],
    [445.3, "Massive Meteor"], [446.4, "Massive Meteor x5"], [458.8, "Explosion"], [468.7, "Arcadion Avalanche"],
    [479.4, "Crown of Arcadia"],
    [490.7, "Great Wall of Fire 1"], [493.9, "Great Wall of Fire 2"], [494.5, "Explosion 1"], [497.7, "Explosion 2"],
    [504.0, "Orbital Omen"], [513.1, "Orbital Omen 1"], [513.7, "Fire and Fury"], [514.7, "Orbital Omen 2"], [516.3, "Orbital Omen 3"], [517.7, "Orbital Omen 4"],
    [521.8, "Crown of Arcadia"], [527.0, "--middle--"],
    [534.1, "Ecliptic Stampede"], [541.2, "Mammoth Meteor x2"], [541.2, "Atomic Impact 1"], [544.2, "Atomic Impact 2"], [547.2, "Atomic Impact 3"],
    [550.2, "Atomic Impact 4"], [553.2, "Atomic Impact 5"], [556.2, "Atomic Impact 6"], [557.2, "Cosmic Kiss"],
    [566.8, "Majestic Meteowrath x4"], [571.1, fireball],
    [579.4, "Crown of Arcadia"], [584.6, "--middle--"],
    ...kicks(593.3, 5), ...kicks(612.4, 6), ...kicks(633.5, 7),
    [ENRAGE, "Heartbreaker (Enrage)"]
  ];
  const events = lines.map(([t, name]): TLEvent => ({t, name, raidwide:RAIDWIDE.has(name)}));
  const picks: Picks = {raw:w1, void:stackFirst ? "stack" : "spread", set1:orderIn(A1), set2:orderIn(A2),
    ult:U.cw ? "cw" : "ccw", fireball:four ? "four" : "two", wall};
  const summary = "Raw Steel Trophy: " + w1 + " first, then " + w2 + ". Assault Evolved at 0:48: " + orderText(picks.set1).toLowerCase() +
    ". At 1:33: " + orderText(picks.set2).toLowerCase() + ". Void Stardust: " + (stackFirst ? "stack first, then spread." : "spread first, then stack.") +
    " Ultimate Trophy Weapons: " + (U.cw ? "clockwise." : "counterclockwise.") +
    " Ecliptic Stampede: " + fireball + ", with your puddles along the " + wall + " wall.";
  return {segs, events, end:FIGHT_END, split:[361.8, 479.4], summary, code, picks, choices:c};
}

/* ---------- damage going out ---------- */
/** How the full fight shows a hit: a raidwide flashes the arena floor, a tank buster draws the
    tanks and the hit on them, a shared hit (a stack or a tower the party shares) flashes softer,
    the enrage flashes long and dark, and any other AoE only shows its name. */
export type HitKind = "raid" | "tank" | "shared" | "enrage" | "aoe";
export interface Hit { t: number; name: string; kind: HitKind; cat: Cat }

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
