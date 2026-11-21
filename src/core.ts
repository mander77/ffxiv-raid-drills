// Shared app state, decks and scoring.
import { LS, el } from "./util";
import { MAPS } from "./data/drills";
import { MECH, NEXT_ITEMS } from "./data/questions";
import { cleanChoices, type Choices } from "./data/fight";
import type { MapDrill, Option, Question, QuizItem, Scene, Slot, StepResult } from "./types";

// TS note: other files import these types with `import { state, type Deck } from "./core"`.
// The `type` keyword inside the braces marks a type-only import next to normal value imports.
export type QuizCat = "mech" | "next";
export type Tab = "home" | "map" | QuizCat | "pressure" | "sheet";

// TS note: a generic interface, like a C# generic class. Deck<MapDrill> holds map drills
// and Deck<QuizItem> holds quiz cards.
export interface Deck<T> { items: T[]; i: number; right: number; done: number }
// TS note: Cur is a discriminated union on `kind`. Code checks `c.kind === "map"`
// before it touches map-only fields such as `c.results`.
/** Where a Practice mechanic is between clicks:
    - "ask": a step is asked, and the floor shows no answer for it.
    - "right": the last spot was right. It stays on the floor, and the next click answers the next step.
    - "wrong": the last spot was wrong. The mechanic holds until you press Next step.
    When every step is answered, the mechanic is done, whatever the phase. */
export type MapPhase = "ask" | "right" | "wrong";
/** One Practice mechanic on screen. `code` rebuilds its pattern; `setupOpen` unfolds the setup.
    `shown` is true while Show me draws the right spot for the step asked; `helped` is true once
    Show me was used, so this try does not count in your score. `counted` is true once this try is
    in your score. */
export interface MapCur { kind: "map"; item: MapDrill; scene: Scene; k: number; code: string; results: StepResult[]; phase: MapPhase; counted: boolean; setupOpen: boolean; shown: boolean; helped: boolean }
/** A multiple-choice card. `opts` are the answers in the order shown; `k` is each one's place in
    the question's own list, which the answer previews follow. `sel` is the answer picked for a
    preview but not locked in yet (-1 for none), and `pick` the one locked in. */
export interface McqCur { kind: "mcq"; cat: QuizCat | "pressure"; item: QuizItem; q: Question; opts: Array<Option & {k: number}>; answered: boolean; pick: number; sel: number; slow: boolean }
export type Cur = MapCur | McqCur | { kind: "pstart" } | { kind: "pdone" } | { kind: "sheet" } | { kind: "home" } | { kind: "fight" };
interface PressureRun { queue: QuizItem[]; i: number; right: number; wrong: number; froze: number }

interface Decks { map?: Deck<MapDrill>; mech?: Deck<QuizItem>; next?: Deck<QuizItem> }
interface AppState {
  slot: Slot;
  /** The fight pattern picks, set in the player's Settings panel. */
  choices: Choices;
  psecs: number;
  stats: Record<string, {s: number; r: number}>;
  tab: Tab;
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
const QUIZ_POOLS: Record<QuizCat, () => QuizItem[]> = {
  mech: () => MECH,
  next: () => NEXT_ITEMS
};

/** In the order a player learns the fight: what each mechanic does, where you stand, what comes
    next, then all of it fast. The cheat sheet comes last because it sums up the rest. Each intro
    is one short line: the screen itself shows what to do. */
export const TABS: readonly {id: Tab; label: string; lede: string}[] = [
  {id:"home", label:"Home", lede:"Practice M11S, The Tyrant (Savage), as a healer, away from the raid."},
  {id:"mech", label:"Learn", lede:"What each mechanic does, and what you do in it. Pick an answer to see it on the picture."},
  {id:"map", label:"Practice", lede:"Click where you stand. One mechanic at a time, no timer."},
  {id:"next", label:"Timeline", lede:"Which mechanic comes next in the fight."},
  {id:"pressure", label:"Pressure", lede:"The same questions, fast: timed questions, or the whole fight on the clock."},
  {id:"sheet", label:"Cheat sheet", lede:"The rules and your timeline on one page."}
];

const savedSecs = LS.get("psecs", 6);
export const state: AppState = {
  // LS.get<string> reads any saved string. Each ternary then turns it into one of the allowed values.
  slot: LS.get<string>("slot", "H1") === "H2" ? "H2" : "H1",
  choices: cleanChoices(LS.get<unknown>("fchoices", null)),
  psecs: [4, 6, 8, 10].includes(savedSecs) ? savedSecs : 6,
  stats: LS.get<AppState["stats"]>("stats", {}) || {},
  tab: "map",
  decks: {},
  cur: null,
  pressure: null,
  raf: 0,
  tout: 0,
  confirmReset: false
};

export const view = el("view");

/** Save the fight pattern picks; the app keeps them for the next visit. */
export function setChoices(c: Choices): void { state.choices = c; LS.set("fchoices", c); }

/** Save a right or wrong answer to the stats for that question or drill. They stay in this
    browser, and the Pressure round uses them to ask missed questions more often. */
export function record(id: string, ok: boolean): void {
  const st = state.stats[id] || {s: 0, r: 0};
  st.s++; if(ok) st.r++;
  state.stats[id] = st; LS.set("stats", state.stats);
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

function makeDeck<T extends {id: string; order: number}>(src: readonly T[]): Deck<T> {
  // Every deck runs in fight order.
  const items = src.slice().sort((a, b) => a.order - b.order);
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
