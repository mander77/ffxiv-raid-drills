// The source import (scripts/import-sources.mjs): its parsers on small samples, and every fight's
// source list against its generated files. `npm run check:sources` compares the generated files
// with the pinned sources themselves.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assert, test } from "vitest";
// @ts-expect-error: a plain Node.js script with no type declarations.
import { fillShapes, parseBossmod, parseMechanics, parseStates, parseTriggers, REPOS } from "../scripts/import-sources.mjs";

const FIGHTS = join(import.meta.dirname, "..", "src", "data", "fights");
const lists = readdirSync(FIGHTS).filter((d) => existsSync(join(FIGHTS, d, "sources.json")));

test("every fight with a source list has it checked, from the two repositories, with both generated files", () => {
  assert.include(lists, "m11s");
  for (const fight of lists) {
    const s = JSON.parse(readFileSync(join(FIGHTS, fight, "sources.json"), "utf8"));
    assert.isTrue(s.checked, `${fight}: a person checks sources.json, then sets "checked": true`);
    assert.equal(s.cactbot.repo, REPOS.cactbot, fight);
    assert.equal(s.bossmod.repo, REPOS.bossmod, fight);
    const gen = readFileSync(join(FIGHTS, fight, "source.gen.ts"), "utf8");
    assert.include(
      gen,
      `cactbot:"${s.cactbot.commit}", bossmod:"${s.bossmod.commit}"`,
      `${fight}: source.gen.ts is from the pinned commits`,
    );
    const extra = JSON.parse(readFileSync(join(FIGHTS, fight, "sources.extra.gen.json"), "utf8"));
    assert.deepEqual(extra.pins, { cactbot: s.cactbot.commit, bossmod: s.bossmod.commit }, fight);
    assert.deepEqual(
      extra.mechanics.map((m: { file: string }) => m.file),
      s.bossmod.module.mechanics,
      `${fight}: one entry per mechanic file`,
    );
  }
});

test("a trigger: its id (with an escaped quote and a comment after it), ability ids, callouts and notes", () => {
  const text = [
    "  triggers: [",
    "    {",
    "      id: 'R10S Divers\\' Dare', // the dare",
    "      type: 'StartsUsing',",
    "      netRegex: { id: ['B5B6', 'B5B7'], source: 'Red Hot', capture: false },",
    "      // Tanks first.",
    "      infoText: (_data, _matches, output) => output.text!(),",
    "      outputStrings: {",
    "        text: {",
    "          en: 'Tank Buster',",
    "          de: 'Tank Buster',",
    "        },",
    "        stack: Outputs.stackMarker,",
    "      },",
    "    },",
    "  ],",
  ].join("\n");
  assert.deepEqual(parseTriggers(text), [
    {
      id: "R10S Divers' Dare",
      type: "StartsUsing",
      netRegex: "{ id: ['B5B6', 'B5B7'], source: 'Red Hot', capture: false }",
      ids: ["B5B6", "B5B7"],
      kinds: ["infoText"],
      outputs: { text: "Tank Buster", stack: "Outputs.stackMarker" },
      notes: ["Tanks first."],
    },
  ]);
});

test("a mechanic file: each class with its base, abilities, shapes (as BossMod writes them) and positions", () => {
  const text = [
    "class HotAerial(BossModule module) : Components.GenericAOEs(module, AID.HotAerialAOE)",
    "{",
    "    private static readonly AOEShapeCircle _shape = new AOEShapeCircle(6);",
    "    private readonly WPos _center = new WPos(100f, 90);",
    "}",
    "class Blast(BossModule module) : FlamePuddle(module, [AID.BlastAOE], new AOEShapeCone(60, 22.5f.Degrees()), OID.Cone);",
    "class Deep(BossModule module) : Components.StandardAOEs(module, AID.DeepAOE, BigCone)",
    "{",
    "    public static readonly AOEShapeCone BigCone = new(60, 60.Degrees());",
    "}",
  ].join("\n");
  assert.deepEqual(parseMechanics(text), [
    { name: "HotAerial", base: "Components.GenericAOEs", aids: ["HotAerialAOE"], shapes: ["Circle(6)"], positions: ["WPos(100, 90)"] },
    { name: "Blast", base: "FlamePuddle", aids: ["BlastAOE"], shapes: ["Cone(60, 22.5deg)"], positions: [] },
    { name: "Deep", base: "Components.StandardAOEs", aids: ["DeepAOE"], shapes: ["Cone(60, 60deg)"], positions: [] },
  ]);
});

test("a shape the enums leave out comes from the one class that names it, in full widths", () => {
  const unknown = (text: string) => ({ id: "B5F5", from: "Helper->self", cast: 0, shape: "unknown", text });
  const abilities = {
    Blast: unknown("range 60 ?-degree cone"),
    Floater: unknown("range 60 width ? rect"),
    Two: unknown("range 60 ?-degree cone"),
    Lost: unknown("???"),
  };
  const mechanics = [
    {
      file: "Air.cs",
      classes: [
        { name: "Puddle", aids: ["Blast"], shapes: ["Cone(60, 22.5deg)"] },
        { name: "Floaters", aids: ["Floater"], shapes: ["Rect(60, 4)"] },
        { name: "Proteans", aids: ["Two"], shapes: ["Cone(60, 30deg)", "Cone(60, 15deg)"] },
      ],
    },
  ];
  const out = fillShapes(abilities, mechanics);
  assert.deepEqual(out.Blast, {
    id: "B5F5",
    from: "Helper->self",
    cast: 0,
    shape: "cone",
    range: 60,
    angle: 45,
    sizeFrom: "Air.cs Puddle",
  });
  assert.deepEqual(out.Floater, {
    id: "B5F5",
    from: "Helper->self",
    cast: 0,
    shape: "rect",
    range: 60,
    width: 8,
    sizeFrom: "Air.cs Floaters",
  });
  assert.equal(out.Two.shape, "unknown", "two sizes: the sources do not say which");
  assert.equal(out.Lost.shape, "unknown", "no class names it");
});

test("an ability with no shape BossMod states keeps its text", () => {
  const enums = [
    "public enum OID : uint",
    "{",
    "    Boss = 0x4AF2, // R5.000, x1",
    "}",
    "public enum AID : uint",
    "{",
    "    Hit = 46518, // Boss->self, 5.0s cast, range 8 circle",
    "    Odd = 46519, // Helper->self, no cast, range 60 ?-degree cone",
    "}",
  ].join("\n");
  const module = "public class X(ModuleInit init) : BossModule(init, new(100, 100), new ArenaBoundsSquare(20));";
  const out = parseBossmod(enums, module);
  assert.deepEqual(out.abilities.Hit, { id: "B5B6", from: "Boss->self", cast: 5, shape: "circle", range: 8 });
  assert.deepEqual(out.abilities.Odd, { id: "B5B7", from: "Helper->self", cast: 0, shape: "unknown", text: "range 60 ?-degree cone" });
  assert.equal(out.arenaHalf, 20);
});

test("a state list: casts, waits and phase blocks in fight order, with their times and components", () => {
  const text = [
    "class XStates : StateMachineBuilder",
    "{",
    "    public XStates(BossModule module) : base(module)",
    "    {",
    "        _module = (X)module;",
    "        DeathPhase(0, SinglePhase);",
    "    }",
    "    private void SinglePhase(uint id)",
    "    {",
    "        Block(id, 5.2f);",
    '        Cast(id + 0x10000, AID.Enrage, 5, 8, "Enrage");',
    "    }",
    "    void Block(uint id, float delay)",
    "    {",
    '        Cast(id, AID.Raidwide, delay, 5, "Raidwide") // the first hit',
    "            .ActivateOnEnter<Raidwide>()",
    "            .ActivateOnEnter<Hints>(_config.Hints)",
    "            .DeactivateOnExit<Raidwide>();",
    '        ComponentCondition<Towers>(id + 0x10, 2.2f, t => t.NumCasts > 0, "Towers")',
    "            .ExecOnExit<Towers>(t => t.Risky = true);",
    '        ActorTargetable(id + 0x20, _module.B2, false, 1, "Blue disappears")',
    "            .SetHint(StateMachine.StateHint.DowntimeStart);",
    "    }",
    "}",
  ].join("\n");
  assert.deepEqual(parseStates(text), [
    {
      call: "DeathPhase",
      id: "0x0",
      method: "SinglePhase",
      states: [
        {
          group: "Block",
          id: "0x0",
          from: 0,
          delay: 5.2,
          states: [
            {
              id: "0x0",
              call: "Cast",
              aid: "Raidwide",
              delay: 5.2,
              cast: 5,
              name: "Raidwide",
              start: 5.2,
              at: 10.2,
              activate: ["Raidwide", "Hints if _config.Hints"],
              deactivate: ["Raidwide"],
            },
            {
              id: "0x10",
              call: "ComponentCondition",
              component: "Towers",
              delay: 2.2,
              name: "Towers",
              condition: "t => t.NumCasts > 0",
              at: 12.4,
              exec: [{ component: "Towers", when: "exit", code: "t => t.Risky = true" }],
            },
            {
              id: "0x20",
              call: "ActorTargetable",
              actor: "_module.B2",
              targetable: false,
              delay: 1,
              name: "Blue disappears",
              at: 13.4,
              hints: ["+DowntimeStart"],
            },
          ],
        },
        { id: "0x10000", call: "Cast", aid: "Enrage", delay: 5, cast: 8, name: "Enrage", start: 18.4, at: 26.4 },
      ],
    },
  ]);
});

test("a state list stops on a call the parser does not know", () => {
  const states = (body: string) =>
    [
      "class XStates : StateMachineBuilder",
      "{",
      "    public XStates(BossModule module) : base(module) { DeathPhase(0, P1); }",
      `    void P1(uint id) { ${body} }`,
      "}",
    ].join("\n");
  assert.throws(() => parseStates(states("CastStartFork(id, dispatch, 2);")), /a call the parser does not know: CastStartFork/);
  assert.throws(
    () => parseStates(states("Cast(id, AID.X, 2, 3).OnEnter(() => Foo());")),
    /a chained call the parser does not know: \.OnEnter/,
  );
  assert.throws(() => parseStates(states("if (x) Cast(id, AID.X, 2, 3);")), /a statement the parser does not know/);
});

// BossMod's state list against cactbot's timeline. cactbot is the source of every fight time;
// the state list is only a cross-check. Each named state should come with a cactbot line: the
// one at its time (counted from the line of the state before it), within MARGIN, and of one of
// its abilities when one is there. A state with no such line is listed in STATE_MISMATCHES, a
// question for the owner. Never change a time to make this pass.

/** How far apart a state and its cactbot line can be, in seconds. BossMod's delays are its
    estimates, written to a tenth. The app's choice. */
const MARGIN = 1;

/** The named states with no cactbot line within MARGIN, by fight and state id: questions for
    the owner. */
const STATE_MISMATCHES: Record<string, string[]> = {
  m10s: [
    "0x302", // "Stack 3": cactbot writes the three Pyrotation hits as one line, "Pyrotation x3"
    "0x30253", // "Safe cone bait": BossMod expects it 1.3 s after cactbot's "Cutback Blaze"
    "0x50010", // "Voidzone appears": no cactbot line for the voidzone
    "0x70012", // "Stack finish": the last of "Pyrotation x3", one line in cactbot
  ],
  m11s: [
    "0x212", // "Puddles start": BossMod waits for the first Cometite cast to start; cactbot lines are the hits
    "0x40302", // "Stacks 5": cactbot writes the five hits as one line, "Massive Meteor x5"
  ],
};

interface State {
  id: string;
  name?: string;
  at: number;
  aid?: string;
  aids?: string[];
  component?: string;
  states?: State[];
}
interface Line {
  t: number;
  name: string;
  ids: readonly string[];
}

/** Every state in fight order, out of its phase blocks. */
const flatStates = (xs: State[]): State[] => xs.flatMap((x) => (x.states ? flatStates(x.states) : [x]));

/** Each named state with its cactbot line (or none), and the time BossMod expects it at, from the
    line of the state before it. */
function crossCheck(fight: string, lines: readonly Line[], abilities: Record<string, { id: string }>) {
  const extra = JSON.parse(readFileSync(join(FIGHTS, fight, "sources.extra.gen.json"), "utf8"));
  const classes = new Map<string, string[]>(
    extra.mechanics.flatMap((m: { classes: { name: string; aids: string[] }[] }) => m.classes.map((c) => [c.name, c.aids])),
  );
  const idsOf = (s: State) =>
    new Set(
      [s.aid, ...(s.aids ?? []), ...(classes.get(s.component ?? "") ?? [])].flatMap((n) => (n && abilities[n] ? [abilities[n].id] : [])),
    );
  let last = { t: 0, at: 0 };
  return flatStates(extra.states.phases[0].states)
    .filter((s) => s.name)
    .map((s) => {
      const expected = Math.round((last.t + s.at - last.at) * 10) / 10;
      const ids = idsOf(s);
      const near = lines.filter((l) => Math.abs(l.t - expected) <= MARGIN + 1e-9);
      const byTime = (a: Line, b: Line) => Math.abs(a.t - expected) - Math.abs(b.t - expected);
      const line = near.filter((l) => l.ids.some((i) => ids.has(i))).sort(byTime)[0] ?? near.sort(byTime)[0];
      if (line) last = { t: line.t, at: s.at };
      return { state: s, expected, line, closest: [...lines].sort(byTime)[0] };
    });
}

test("each named BossMod state comes with a cactbot line at its time", async () => {
  for (const fight of lists) {
    const gen = await import(`../src/data/fights/${fight}/source.gen.ts`);
    const found = crossCheck(fight, gen.CACTBOT_LINES, gen.BOSSMOD_ABILITIES);
    const missing = found.filter((f) => !f.line);
    for (const f of missing)
      console.log(
        `${fight} ${f.state.id} "${f.state.name}": BossMod expects it at ${f.expected}; the closest cactbot line is "${f.closest.name}" at ${f.closest.t}`,
      );
    assert.deepEqual(
      missing.map((f) => f.state.id),
      STATE_MISMATCHES[fight] ?? [],
      `${fight}: a named state with no cactbot line is a question for the owner (STATE_MISMATCHES)`,
    );
  }
});
