// A second, made-up fight for the tests: the smallest FightData that fills every tab, in its own
// folder, with no change to the shared code. Its names and numbers are the tests' own choice, not a
// real fight.
import type { FightData } from "../../../src/data/fights/types";
import type { Drill, Fight, QuizItem, Scene } from "../../../src/types";

const PHASE = "Phase 1: Test Phase";

const scene = (): Scene => ({
  setup: ["The boss casts a test spread."],
  rule: ["Spread out."],
  boss: { x: 50, y: 50, f: 0 },
  overlays: [],
  steps: [{ q: "Click your test spot.", z: { c: [50, 80], r: 10 }, a: ["South."] }],
});

const DRILL: Drill = { id: "t-spread", order: 1, phase: PHASE, time: "0:10", title: "Test Spread", kind: "spread", build: scene };

const LEARN: QuizItem = {
  id: "t-learn",
  order: 1,
  phase: PHASE,
  time: "0:10",
  build: () => ({
    prompt: "Test Spread: where do you go?",
    options: [{ t: "South.", ok: true }, { t: "North." }],
    why: ["The test says south."],
    rule: ["Test rule: go south."],
  }),
};

const TIMELINE_CARD: QuizItem = {
  id: "n-0",
  order: 1,
  phase: "Timeline",
  time: "0:10",
  build: () => ({
    prompt: "Test Spread just happened. What comes next?",
    options: [{ t: "Test Enrage", ok: true }, { t: "Test Spread" }],
    why: ["The enrage ends the test."],
    rule: ["Test Enrage comes last."],
  }),
};

function build(_s: unknown, code: string): Fight {
  return {
    segs: [{ title: "Test Spread", drills: [DRILL.id], scene: scene(), k: 0, from: 5, due: [10] }],
    events: [
      { t: 10, name: "Test Spread", cats: ["spot"] },
      { t: 30, name: "Test Enrage", cats: ["enrage"] },
    ],
    hits: [{ t: 30, name: "Test Enrage", kind: "enrage", cat: "enrage" }],
    end: 32,
    split: [0, 0],
    summary: "The test fight has one pattern.",
    code,
    choices: {},
  };
}

export const TEST_FIGHT: FightData = {
  id: "test",
  info: { short: "TEST", full: "The Test Boss (Savage)", strats: ["Test Strat"] },
  links: { guide: "https://example.com/guide", cactbot: "https://example.com/cactbot", bossmod: "https://example.com/bossmod" },
  sources: [{ href: "https://example.com/guide", label: "Test guide" }],
  arena: { hitbox: 10, tower: 8, scytheSafe: 12 },
  drills: [DRILL],
  learnCards: [LEARN],
  learnGroups: [{ name: "Test", ids: [LEARN.id] }],
  hero: { card: LEARN.id, label: "Test Spread on the arena" },
  pictures: { [LEARN.id]: () => ({ overlays: [], boss: { x: 50, y: 50, f: 0 }, answer: [{ c: [50, 80], r: 10 }] }) },
  timelineCards: [TIMELINE_CARD],
  timeline: [
    { t: "0:10", n: "Test Spread", job: () => ["Go south."] },
    { t: "0:30", n: "Test Enrage", job: () => ["Use everything."] },
  ],
  timelineNote: "Test times.",
  reference: [{ name: "Test Spread", picture: LEARN.id, cards: [LEARN.id], drills: [DRILL.id], timeline: TIMELINE_CARD.id }],
  phases: [
    {
      name: PHASE,
      rows: [
        { t: 10, name: "Test Spread", cats: ["spot"], note: "Spread." },
        { t: 30, name: "Test Enrage", cats: ["enrage"], note: "The end." },
      ],
    },
  ],
  abilities: [
    { t: 10, name: "Test Spread", cats: ["spot"], note: "Spread.", phase: PHASE },
    { t: 30, name: "Test Enrage", cats: ["enrage"], note: "The end.", phase: PHASE },
  ],
  timelineCategories: (row) => (row === 0 ? ["spot"] : ["enrage"]),
  enrage: 30,
  clock: { random: {}, rows: [], help: "The test fight has no picks.", clean: () => ({}), build, busterPieces: () => [] },
};
