// The full-fight run-through: one random scenario, laid out on the fight clock.
// Times and ability names come from the cactbot timeline for M11S
// (ui/raidboss/data/07-dt/raid/r11s.txt), with its branch offsets removed.
// This first version covers Phase 1 (the pull to One and Only at 4:00.4).
import { MAPS, buildAssault2, voidIntoWeapons, voidAgain } from "./drills";
import { newCode, random, withSeed } from "../util";
import type { Scene, Slot } from "../types";

/** One line on the fight timeline: `name` happens at `t`, in seconds into the fight. */
export interface TLEvent { t: number; name: string; raidwide?: boolean }

/** One stretch of the fight with a scene on the arena. `due[i]` is when step i resolves. */
export interface FightSeg {
  title: string;
  scene: Scene;
  /** Quarter turns of the arena, for mechanics that turn (Dance of Domination). */
  k: number;
  /** When the scene appears on the arena. */
  from: number;
  due: number[];
  /** Until this time the boss shows no facing arrow, because he turns at the cast. */
  faceAt?: number;
}

/** `code` rebuilds the same fight: the same weapons, the same stack or spread, and so on. */
export interface Fight { segs: FightSeg[]; events: TLEvent[]; end: number; summary: string; code: string }

/** "1:24" to 84. */
export const sec = (t: string): number => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
/** 84 to "1:24". */
export const clock = (t: number): string => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

function drill(id: string, s: Slot): Scene {
  const m = MAPS.find(x => x.id === id);
  if(!m) throw new Error("missing drill " + id);
  return m.build(s, null);
}

/* One fight. The random parts stay consistent: the second Raw Steel Trophy uses the other
   weapon, and the second Void Stardust ends the other way from the first. The same code
   always builds the same fight. */
export function buildFight(s: Slot, code = newCode()): Fight {
  return withSeed(code, () => fightFor(s, code));
}

function fightFor(s: Slot, code: string): Fight {
  const axeFirst = random() < 0.5, stackFirst = random() < 0.5;
  const w1 = axeFirst ? "axe" : "scythe", w2 = axeFirst ? "scythe" : "axe";
  /* Each click is due when the hit that checks it lands, in seconds into the fight. A scene
     appears when its cast starts (cactbot's StartsUsing or the ability before it). */
  const segs: FightSeg[] = [
    {title:"Raw Steel Trophy: " + w1, scene:drill("m-raw-" + w1, s), k:0, from:15.7, due:[25.1]},
    {title:"Assault Evolved", scene:drill("m-assault", s), k:0, from:38.4, faceAt:48.2, due:[50.4, 55.5, 60.6]},
    {title:"Void Stardust into the second weapons", scene:voidIntoWeapons(s, !stackFirst, buildAssault2(s), true), k:0, from:72.7,
      due:[79.8, 83.9, 85.9, 87.9, 89.9, 94.9, 100.0, 105.1]},
    {title:"Void Stardust again", scene:voidAgain(s, stackFirst), k:0, from:106, due:[110.2, 112.2, 114.2, 116.2]},
    {title:"Dance of Domination", scene:drill("m-dance", s), k:Math.floor(random() * 4), from:134.6, due:[150.5]},
    {title:"Raw Steel Trophy: " + w2, scene:drill("m-raw-" + w2, s), k:0, from:156.4, due:[163.8]},
    {title:"Ultimate Trophy Weapons", scene:drill("m-ultimate", s), k:0, from:184.6, due:[194.6, 199.7, 204.8, 209.9, 215.0, 220.1]},
    {title:"Tornadoes", scene:drill("m-tornado", s), k:0, from:221.2, due:[226.3]}
  ];
  /* The timeline lines, with cactbot's names. Where the arena is the test, the names stay as
     general as cactbot's before it syncs: "Comet/Crushing Comet", "Assault Evolved 1". */
  const raw = (w: string, t: number): Array<[number, string]> => w === "axe"
    ? [[t, "Raw Steel Trophy Axe"], [t + 6.3, "Raw Steel (Axe)"], [t + 7.4, "Impact x6 (Axe)"]]
    : [[t, "Raw Steel Trophy Scythe"], [t + 7.4, "Heavy Hitter (Scythe)"]];
  const assault = (times: number[]): Array<[number, string]> => times.map((t, i) => [t, "Assault Evolved " + (i + 1)]);
  const comets = (t: number): Array<[number, string]> =>
    [[t, "Cometite 1"], [t + 2, "Cometite 2"], [t + 4, "Cometite 3"], [t + 6, "Comet/Crushing Comet"]];
  const RAIDWIDE = new Set(["Crown of Arcadia", "Dance of Domination 1", "Dance of Domination 7", "One and Only"]);
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
    [240.4, "One and Only"]
  ];
  const events = lines.map(([t, name]): TLEvent => ({t, name, raidwide:RAIDWIDE.has(name)}));
  const summary = "Raw Steel Trophy: " + w1 + " first, then " + w2 + ". Void Stardust: " +
    (stackFirst ? "stack first, then spread." : "spread first, then stack.");
  return {segs, events, end:242, summary, code};
}
