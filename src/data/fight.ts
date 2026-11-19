// The full-fight run-through: one random scenario, laid out on the fight clock.
// Times come from the Thaliak M11S timeline. This first version covers Phase 1 (0:00 to 4:01).
import { MAPS, buildAssault2, voidIntoWeapons, voidAgain } from "./drills";
import { newCode, random, withSeed } from "../util";
import type { Scene, Slot } from "../types";

/** A boss cast or event on the cast bar. The bar runs from `start` to `end`, in seconds into the fight. */
export interface Cast { name: string; start: number; end: number; raidwide?: boolean }

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
export interface Fight { segs: FightSeg[]; casts: Cast[]; end: number; summary: string; code: string }

/** "1:24" to 84. */
export const sec = (t: string): number => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
/** 84 to "1:24". */
export const clock = (t: number): string => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

function drill(id: string, s: Slot): Scene {
  const m = MAPS.find(x => x.id === id);
  if(!m) throw new Error("missing drill " + id);
  return m.build(s, null);
}

const cast = (name: string, start: string, end: string, raidwide = false): Cast => ({name, start:sec(start), end:sec(end), raidwide});

/* One fight. The random parts stay consistent: the second Raw Steel Trophy uses the other
   weapon, and the second Void Stardust ends the other way from the first. The same code
   always builds the same fight. */
export function buildFight(s: Slot, code = newCode()): Fight {
  return withSeed(code, () => fightFor(s, code));
}

function fightFor(s: Slot, code: string): Fight {
  const axeFirst = random() < 0.5, stackFirst = random() < 0.5;
  const w1 = axeFirst ? "axe" : "scythe", w2 = axeFirst ? "scythe" : "axe";
  const segs: FightSeg[] = [
    {title:"Raw Steel Trophy: " + w1, scene:drill("m-raw-" + w1, s), k:0, from:sec("0:18"), due:["0:25"].map(sec)},
    {title:"Assault Evolved", scene:drill("m-assault", s), k:0, from:sec("0:38"), faceAt:sec("0:48"), due:["0:51", "0:56", "1:01"].map(sec)},
    {title:"Void Stardust into the second weapons", scene:voidIntoWeapons(s, !stackFirst, buildAssault2(s), true), k:0, from:sec("1:13"),
      due:["1:20", "1:24", "1:26", "1:28", "1:30", "1:35", "1:40", "1:45"].map(sec)},
    {title:"Void Stardust again", scene:voidAgain(s, stackFirst), k:0, from:sec("1:46"), due:["1:51", "1:53", "1:55", "1:57"].map(sec)},
    {title:"Dance of Domination", scene:drill("m-dance", s), k:Math.floor(random() * 4), from:sec("2:15"), due:["2:31"].map(sec)},
    {title:"Raw Steel Trophy: " + w2, scene:drill("m-raw-" + w2, s), k:0, from:sec("2:37"), due:["2:44"].map(sec)},
    {title:"Ultimate Trophy Weapons", scene:drill("m-ultimate", s), k:0, from:sec("3:05"), due:["3:15", "3:20", "3:25", "3:31", "3:36", "3:41"].map(sec)},
    {title:"Tornadoes", scene:drill("m-tornado", s), k:0, from:sec("3:42"), due:["3:47"].map(sec)}
  ];
  const casts: Cast[] = [
    cast("Crown of Arcadia", "0:06", "0:10", true),
    cast("Raw Steel Trophy (" + w1 + ")", "0:18", "0:25"),
    cast("Trophy Weapons", "0:38", "0:43"),
    cast("Assault Evolved", "0:48", "1:01"),
    cast("Trophy Weapons", "1:13", "1:18"),
    cast("Void Stardust", "1:20", "1:30"),
    cast("Assault Evolved", "1:33", "1:45"),
    cast("Void Stardust", "1:46", "1:57"),
    cast("Crown of Arcadia", "1:59", "2:03", true),
    cast("Dance of Domination Trophy", "2:15", "2:31", true),
    cast("Raw Steel Trophy (" + w2 + ")", "2:37", "2:44"),
    cast("Charybdistopia", "2:55", "2:59"),
    cast("Ultimate Trophy Weapons", "3:05", "3:41"),
    cast("Powerful Gust", "3:42", "3:47"),
    cast("One and Only", "3:57", "4:01", true)
  ];
  const summary = "Raw Steel Trophy: " + w1 + " first, then " + w2 + ". Void Stardust: " +
    (stackFirst ? "stack first, then spread." : "spread first, then stack.");
  return {segs, casts, end:sec("4:03"), summary, code};
}
