// The fight review's coverage check: is anything the boss does missing from the site, or played
// without being drawn? It lists every cactbot timeline line, every BossMod ability with an area
// and every named BossMod state, and looks for each one on the site. It also lists the steps
// that resolve an attack but draw nothing on the arena.
//
// It is not one of the site's tests. To run it, copy it into test/ of a review worktree, run
//   FIGHT=<id> npx vitest run test/coverage.test.ts
// read the lists it prints, then delete the copy. FIGHT defaults to the first fight.
//
// Every line it prints is a lead, not a finding: open the source and the site and decide. A
// lead can be fine on purpose (a cast with no area, a marker line), and the report says why.
// No list here proves that a mechanic is complete: the review still reads every step.
import { expect, test } from "vitest";
import { FIGHTS, fightById } from "../src/data/fights";
import type { Choices, Fight, Scene, Slot, Step } from "../src/types";

const fight = fightById(process.env.FIGHT) ?? FIGHTS[0];
const SLOTS: Slot[] = ["H1", "H2"];
const CODES = "2222 2345 3K7Q 4ZZ9 5MPA 6BXR 7HJW 8C3T 9DLE AF4N".split(" ");
/** How far, in seconds, a site time may be from a source time and still count as the same. */
const NEAR = 1.5;

interface Line {
  t: number;
  name: string;
  ids: readonly string[];
}
interface Ability {
  id: string;
  from?: string;
  cast?: number;
  shape?: string;
}
interface State {
  name?: string;
  at?: number;
  call?: string;
  aid?: string;
  aids?: string[];
  component?: string;
  group?: string;
  states?: State[];
}
const gens = import.meta.glob<{ CACTBOT_LINES: readonly Line[]; BOSSMOD_ABILITIES: Record<string, Ability> }>(
  "../src/data/fights/*/source.gen.ts",
  { eager: true },
);
const extras = import.meta.glob<{ states?: { phases: State[] } }>("../src/data/fights/*/sources.extra.gen.json", {
  eager: true,
  import: "default",
});
const sources = import.meta.glob<string>("../src/data/fights/*/*.ts", { eager: true, query: "?raw", import: "default" });
const gen = gens[`../src/data/fights/${fight.id}/source.gen.ts`];
const extra = extras[`../src/data/fights/${fight.id}/sources.extra.gen.json`];
/** The fight's own files, as text, without the generated ones. */
const siteText = Object.entries(sources)
  .filter(([path]) => path.includes(`/fights/${fight.id}/`) && !path.endsWith(".gen.ts"))
  .map(([, text]) => text)
  .join("\n");

/** A marker line ("--middle--") or a branch's maybe-line ("Raw Steel (Axe)?"): no hit of its own. */
const isMarker = (l: Line): boolean => l.name.startsWith("--") || l.name.endsWith("?");
const near = (a: number, b: number): boolean => Math.abs(a - b) <= NEAR;

/** Every pick value of the full fight, one build each, plus the random builds. */
function allBuilds(s: Slot): Fight[] {
  const { clock } = fight;
  const builds: Fight[] = CODES.map((code) => clock.build(s, code, clock.random));
  for (const row of clock.rows)
    for (const [value] of row.options) {
      const choices: Choices = { ...clock.random, [row.key]: value };
      for (const code of CODES.slice(0, 3)) builds.push(clock.build(s, code, choices));
    }
  return builds;
}

/** True when a step draws something on the arena once it is asked or answered. */
const drawsSomething = (step: Step): boolean =>
  !!(step.reveal?.length || step.revealAt || step.cue?.length || step.drop || step.hits?.length);

function quietSteps(where: string, scene: Scene, out: Set<string>): void {
  scene.steps.forEach((step, i) => {
    if (!step.lookAhead && !drawsSomething(step)) out.add(`${where}, step ${i + 1} ("${step.q}")`);
  });
}

test(`coverage of ${fight.id}: every cast, ability and state is on the site and drawn`, () => {
  expect(gen, `no source.gen.ts for ${fight.id}`).toBeDefined();
  const lines = gen.CACTBOT_LINES.filter((l) => !isMarker(l));
  const builds = SLOTS.flatMap(allBuilds);
  const report: string[] = [];

  /** True when a Pressure stretch plays the time, or a hit on the clock falls near it. */
  const covered = (t: number): boolean =>
    builds.some(
      (f) =>
        f.hits.some((h) => near(h.t, t)) ||
        f.segs.some((seg) => seg.due.length && t >= seg.from - NEAR && t <= seg.due[seg.due.length - 1] + NEAR),
    );

  // 1. cactbot lines with no row on the ability list (the Timeline tab and the Cheat Sheet) and
  //    no hit on the full fight's clock, in any build.
  const noRow = lines.filter(
    (l) => !fight.abilities.some((a) => near(a.t, l.t)) && !builds.some((f) => f.hits.some((h) => near(h.t, l.t))),
  );
  report.push(`## cactbot lines with no ability row and no hit within ${NEAR} s (${noRow.length})`);
  for (const l of noRow) report.push(`- ${l.t} s ${l.name} [${l.ids.join(", ")}]`);

  // 2. cactbot lines that no Pressure stretch and no hit covers, in any build.
  const unplayed = lines.filter((l) => !covered(l.t));
  report.push(`## cactbot lines that Pressure never plays or shows as a hit (${unplayed.length})`);
  for (const l of unplayed) report.push(`- ${l.t} s ${l.name}`);

  // 3. BossMod abilities with an area (not single-target, not an auto attack) whose size the
  //    fight never reads with bossmod("Name"): an attack that is never drawn at its own size.
  const unread = Object.entries(gen.BOSSMOD_ABILITIES).filter(
    ([name, a]) =>
      a.shape &&
      a.shape !== "single-target" &&
      !name.startsWith("AutoAttack") &&
      !new RegExp(`bossmod\\(\\s*"${name}"\\s*\\)`).test(siteText),
  );
  report.push(`## BossMod abilities with an area that no file reads with bossmod() (${unread.length})`);
  for (const [name, a] of unread) report.push(`- ${name} [${a.id}] ${a.from ?? ""} ${a.shape}`);

  // 4. Named BossMod states with no cactbot line near their time: a cross-check of the order.
  const states: State[] = [];
  const walk = (list: State[] = []): void => {
    for (const st of list) {
      if (st.name && typeof st.at === "number") states.push(st);
      walk(st.states);
    }
  };
  for (const phase of extra?.states?.phases ?? []) walk(phase.states);
  const lonely = states.filter((st) => !gen.CACTBOT_LINES.some((l) => Math.abs(l.t - (st.at ?? 0)) <= 3));
  report.push(`## Named BossMod states with no cactbot line within 3 s (${lonely.length} of ${states.length})`);
  for (const st of lonely) report.push(`- ${st.at} s "${st.name}" (${st.aid ?? st.aids?.join("/") ?? st.component ?? st.call})`);
  const unshown = states.filter((st) => !covered(st.at ?? 0));
  report.push(`## Named BossMod states that Pressure never plays (${unshown.length})`);
  for (const st of unshown) report.push(`- ${st.at} s "${st.name}"`);

  // 5. Steps that resolve something but draw nothing on the arena, in Practice (every variant)
  //    and in Pressure (every pick).
  const quiet = new Set<string>();
  for (const s of SLOTS)
    for (const drill of fight.drills)
      for (const v of drill.variants ?? [null]) quietSteps(`Practice ${drill.id}${v ? ` (${v})` : ""}`, drill.build(s, v), quiet);
  for (const f of builds) for (const seg of f.segs) quietSteps(`Pressure "${seg.title}"`, seg.scene, quiet);
  report.push(`## Steps that draw nothing on the arena (${quiet.size})`);
  report.push(...[...quiet].sort().map((q) => `- ${q}`));

  // 6. Gaps between the tabs: a Pressure stretch with no Practice drill, a drill the Cheat Sheet
  //    never lists, and a Cheat Sheet mechanic with no Learn card or no drill. A mechanic that
  //    only the run plays is taught nowhere else.
  const gaps = new Set<string>();
  const drillIds = new Set(fight.drills.map((d) => d.id));
  for (const f of builds)
    for (const seg of f.segs) {
      if (!seg.drills.length) gaps.add(`- Pressure "${seg.title}": no Practice drill`);
      for (const id of seg.drills) if (!drillIds.has(id)) gaps.add(`- Pressure "${seg.title}": drill ${id} does not exist`);
    }
  const listed = new Set(fight.reference.flatMap((r) => r.drills));
  for (const d of fight.drills) if (!listed.has(d.id)) gaps.add(`- Practice ${d.id}: no Cheat Sheet mechanic lists it`);
  for (const r of fight.reference) {
    if (!r.cards.length) gaps.add(`- Cheat Sheet "${r.name}": no Learn card`);
    if (!r.drills.length) gaps.add(`- Cheat Sheet "${r.name}": no drill`);
  }
  report.push(`## Gaps between the tabs (${gaps.size})`);
  report.push(...[...gaps].sort());

  console.log(`# Coverage of ${fight.id}\n\n${report.join("\n")}`);
  expect(report.filter((r) => r.startsWith("- "))).toEqual([]);
}, 600_000);
