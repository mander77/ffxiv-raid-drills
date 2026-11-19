// Shared app state, decks and scoring.
import { LS, el } from "./util";
import { MAPS } from "./data/drills";
import { MECH, DEATH, NEXT_ITEMS } from "./data/questions";
import { JOB } from "./data/jobs";
import type { Job, MapDrill, Option, Question, QuizItem, Scene, Slot, StepResult } from "./types";

// TS note: other files import these types with `import { state, type Deck } from "./core"`.
// The `type` keyword inside the braces marks a type-only import next to normal value imports.
export type QuizCat = "mech" | "next" | "death" | "job";
export type Tab = "map" | "fight" | QuizCat | "pressure" | "sheet";

// TS note: a generic interface, like a C# generic class. Deck<MapDrill> holds map drills
// and Deck<QuizItem> holds quiz cards.
export interface Deck<T> { items: T[]; i: number; right: number; done: number }
// TS note: Cur is a discriminated union on `kind`. Code checks `c.kind === "map"`
// before it touches map-only fields such as `c.results`.
/** The map drill on screen. `code` rebuilds its layout; `peek` is the answered step whose answer
    shows; `setupOpen` unfolds the setup. */
export interface MapCur { kind: "map"; item: MapDrill; scene: Scene; k: number; code: string; results: StepResult[]; counted: boolean; waiting?: boolean; peek?: number; setupOpen?: boolean }
export interface McqCur { kind: "mcq"; cat: QuizCat | "pressure"; item: QuizItem; q: Question; opts: Option[]; answered: boolean; pick: number; slow: boolean }
export type Cur = MapCur | McqCur | { kind: "pstart" } | { kind: "pdone" } | { kind: "sheet" } | { kind: "fight" };
export interface PressureRun { queue: QuizItem[]; i: number; right: number; wrong: number; froze: number }

interface Decks { map?: Deck<MapDrill>; mech?: Deck<QuizItem>; next?: Deck<QuizItem>; death?: Deck<QuizItem>; job?: Deck<QuizItem> }
interface AppState {
  slot: Slot;
  job: Job;
  order: "fight" | "weak";
  psecs: number;
  stats: Record<string, {s: number; r: number}>;
  tab: Tab;
  session: {right: number; total: number};
  decks: Decks;
  cur: Cur | null;
  pressure: PressureRun | null;
  raf: number;
  tout: number;
  confirmReset: boolean;
}

/* main.ts fills in render, so views can redraw the current tab without importing main.ts. */
export const app = { render: (): void => {} };

// TS note: Record<QuizCat, () => QuizItem[]> is like Dictionary<QuizCat, Func<List<QuizItem>>>,
// except that the compiler requires an entry for every QuizCat value. Leave one out and it is an error.
export const QUIZ_POOLS: Record<QuizCat, () => QuizItem[]> = {
  mech: () => MECH,
  next: () => NEXT_ITEMS,
  death: () => DEATH,
  job: () => JOB.filter(x => x.job === state.job)
};

export const TABS: Array<{id: Tab; label: string; lede: string}> = [
  {id:"map", label:"Where do I stand?", lede:"Click the arena where you go. Patterns that turn in the real fight turn here too, so read the boss and the floor, not the screen."},
  {id:"fight", label:"Full fight", lede:"The drills in fight order on the fight clock, with the boss cast bar. Click your spot before each hit lands."},
  {id:"mech", label:"Mechanics", lede:"What each mechanic does and what you do. Your answers follow your slot and your group's wtfdig link."},
  {id:"next", label:"What is next?", lede:"Knowing what comes next tells you how much time you have to raise. Times come from the fight timeline."},
  {id:"death", label:"Someone died", lede:"The decisions from your talk with Andrew: who first, when to raise, when to wait."},
  {id:"job", label:"My job", lede:"A suggested plan for your job, built from the current ability recasts. It is not your group's plan, so agree with your co-healer who uses what, and do not stack the same 10% on the same hit."},
  {id:"pressure", label:"Pressure round", lede:"Mixed questions on a timer. The goal is to pick something every time. A wrong answer beats a freeze."},
  {id:"sheet", label:"Cheat sheet", lede:"The rules and your timeline on one page."}
];

const savedSecs = LS.get("psecs", 6);
export const state: AppState = {
  // LS.get<string> reads any saved string. Each ternary then turns it into one of the allowed values.
  slot: LS.get<string>("slot", "H1") === "H2" ? "H2" : "H1",
  job: LS.get<string>("job", "whm") === "sge" ? "sge" : "whm",
  order: LS.get<string>("order", "fight") === "weak" ? "weak" : "fight",
  psecs: [4, 6, 8, 10].includes(savedSecs) ? savedSecs : 6,
  stats: LS.get<AppState["stats"]>("stats", {}) || {},
  tab: "map",
  session: {right: 0, total: 0},
  decks: {},
  cur: null,
  pressure: null,
  raf: 0,
  tout: 0,
  confirmReset: false
};

export const view = el("view");

export function record(id: string, ok: boolean): void {
  const st = state.stats[id] || {s: 0, r: 0};
  st.s++; if(ok) st.r++;
  state.stats[id] = st; LS.set("stats", state.stats);
  state.session.total++; if(ok) state.session.right++;
  const pct = Math.round(100 * state.session.right / state.session.total);
  el("score").textContent = "This session: " + state.session.right + " / " + state.session.total + " (" + pct + "%)";
}

/** Missed and unseen items weigh more, so they come up sooner. */
export function weight(id: string): number {
  const st = state.stats[id];
  if(!st) return 3;
  return Math.max(0.3, 1 + 3 * (st.s - st.r) - 0.25 * Math.min(st.r, 3));
}

export function weighted<T extends {id: string}>(list: T[]): T[] {
  const pool = list.slice(), out: T[] = [];
  while(pool.length){
    const ws = pool.map(x => weight(x.id));
    let t = ws.reduce((a, b) => a + b, 0) * Math.random(), idx = 0;
    for(; idx < ws.length - 1; idx++){ t -= ws[idx]; if(t <= 0) break; }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function makeDeck<T extends {id: string; order: number}>(src: T[]): Deck<T> {
  const items = state.order === "fight" ? src.slice().sort((a, b) => a.order - b.order) : weighted(src);
  return {items, i: 0, right: 0, done: 0};
}

// TS note: function overloads. The first two lines are signatures only, so callers see
// getDeck("map") return Deck<MapDrill> and getDeck("mech") return Deck<QuizItem>.
// Unlike C#, there is one implementation (the third function), and it must handle every case.
export function getDeck(cat: "map"): Deck<MapDrill>;
export function getDeck(cat: QuizCat): Deck<QuizItem>;
export function getDeck(cat: "map" | QuizCat): Deck<MapDrill> | Deck<QuizItem> {
  // TS note: `??=` assigns only when the left side is null or undefined, the same as C# 8.
  if(cat === "map") return state.decks.map ??= makeDeck(MAPS);
  return state.decks[cat] ??= makeDeck(QUIZ_POOLS[cat]());
}

export function stopTimer(): void {
  if(state.raf){ cancelAnimationFrame(state.raf); state.raf = 0; }
  if(state.tout){ clearTimeout(state.tout); state.tout = 0; }
}
