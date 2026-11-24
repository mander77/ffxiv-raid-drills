// The source import (scripts/import-sources.mjs): its parsers on small samples, and every fight's
// source list against its generated files. `npm run check:sources` compares the generated files
// with the pinned sources themselves.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assert, test } from "vitest";
// @ts-expect-error: a plain Node.js script with no type declarations.
import { fillShapes, parseBossmod, parseMechanics, parseTriggers, REPOS } from "../scripts/import-sources.mjs";

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
