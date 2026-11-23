import { assert, test } from "vitest";
import { DRILLS } from "../src/data/drills";
import { buildFight, CHOICE_ROWS, type Choices, choicesText, type Fight, type Picks, parseChoices, RANDOM } from "../src/data/fight";
import { newCode } from "../src/util";

const REPEATS = 40;
const seg = (f: Fight, title: string) => {
  const g = f.segs.find((x) => x.title.startsWith(title));
  if (!g) throw new Error(`no stretch ${title}`);
  return g;
};
const WEAPON = new Set(["axe", "sword", "scythe"]);
/** The weapons in the order the boss takes them, read from the step answers ("Axe, east: ..."). */
const orderIn = (steps: Array<{ a: readonly string[] }>): string => steps.map((st) => st.a[0].split(",")[0].toLowerCase()).join("-");

/* What the arena shows for each pick, read from the built scenes, not only from f.picks. */
const SHOWS: { [K in keyof Picks]: (f: Fight, v: string) => boolean } = {
  raw: (f, v) => f.segs[0].title.toLowerCase() === `raw steel trophy: ${v}`,
  void: (f, v) => /Comet/.test(seg(f, "Void Stardust into").scene.steps[4].q) === (v === "spread"),
  set1: (f, v) => orderIn(seg(f, "Assault Evolved").scene.steps) === v,
  // The Void Stardust stretch asks for the first weapon, then the puddles, then all three weapons.
  set2: (f, v) =>
    orderIn(seg(f, "Void Stardust into").scene.steps.slice(5)) === v &&
    seg(f, "Void Stardust into").scene.steps[0].a[0].startsWith(`The ${v.split("-")[0]},`),
  // The first of the six weapons spawns south and slightly west for clockwise, slightly east otherwise.
  ult: (f, v) => {
    const o = seg(f, "Ultimate Trophy Weapons").scene.overlays.find((x) => x.spawn === 0 && WEAPON.has(x.t));
    return Boolean(o && "x" in o && o.x < 50 === (v === "cw"));
  },
  fireball: (f, v) => {
    const g = f.segs.find((x) => x.drills[0] === "m-ecl-two" || x.drills[0] === "m-ecl-four");
    return Boolean(g && g.drills[0] === `m-ecl-${v}` && g.title.endsWith(v === "four" ? "Four-way Fireball" : "Two-way Fireball"));
  },
  wall: (f, v) => f.segs[f.segs.length - 1].scene.setup.some((line) => line.includes(`${v.toUpperCase()} wall`)),
};

test("each choice gives the chosen pattern, in every run", () => {
  for (const row of CHOICE_ROWS)
    for (const [v] of row.options) {
      const c: Choices = { ...RANDOM, [row.key]: v };
      for (let i = 0; i < REPEATS; i++) {
        const f = buildFight(i % 2 ? "H1" : "H2", newCode(), c);
        assert.equal(f.picks[row.key], v, `${row.label} = ${v}: the fight reports another pick`);
        assert.ok(SHOWS[row.key](f, v), `${row.label} = ${v}: the arena does not show it`);
      }
    }
});

test("Random still gives every pattern", () => {
  for (const row of CHOICE_ROWS) {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(buildFight("H1").picks[row.key]);
    assert.sameMembers(
      [...seen],
      row.options.map(([v]) => v),
      `${row.label}: Random never gave some values`,
    );
  }
});

test("a choice changes only its own part: the rest still comes from the fight code", () => {
  for (let i = 0; i < 20; i++) {
    const code = newCode(),
      plain = buildFight("H1", code);
    for (const row of CHOICE_ROWS)
      for (const [v] of row.options) {
        const f = buildFight("H1", code, { ...RANDOM, [row.key]: v });
        for (const other of CHOICE_ROWS)
          if (other.key !== row.key)
            assert.equal(f.picks[other.key], plain.picks[other.key], `${code}: choosing ${row.key} changed ${other.key}`);
        // The same code and choice always build the same fight.
        assert.deepEqual(buildFight("H1", code, { ...RANDOM, [row.key]: v }).picks, f.picks);
      }
  }
});

test("Step by step drills follow the picks that fit them", () => {
  const drill = (id: string) => {
    const m = DRILLS.find((x) => x.id === id);
    if (!m) throw new Error(`missing drill ${id}`);
    return m;
  };
  const orders = CHOICE_ROWS.find((r) => r.key === "set1")?.options.map(([o]) => o) ?? [];
  assert.lengthOf(orders, 6);
  for (const o of orders) {
    assert.equal(orderIn(drill("m-assault").build("H1", null, o).steps), o, `Assault Evolved follows ${o}`);
    assert.equal(orderIn(drill("m-void").build("H2", "spread", o).steps.slice(5)), o, `Void Stardust's second set follows ${o}`);
  }
  for (const dir of ["cw", "ccw"]) {
    const first = drill("m-ultimate")
      .build("H1", null, dir)
      .overlays.find((x) => x.spawn === 0 && WEAPON.has(x.t));
    assert.ok(first && "x" in first && first.x < 50 === (dir === "cw"), `Ultimate follows ${dir}`);
  }
  // Every pick a drill follows is a real one, and a followed variant takes that pick's values.
  for (const m of DRILLS)
    if (m.follows) {
      for (const k of [m.follows.variant, m.follows.pick])
        if (k)
          assert.ok(
            CHOICE_ROWS.some((r) => r.key === k),
            `${m.id} follows an unknown pick ${k}`,
          );
      const row = CHOICE_ROWS.find((r) => r.key === m.follows?.variant);
      if (row)
        assert.sameMembers(
          m.variants ?? [],
          row.options.map(([v]) => v),
          `${m.id}: its variants are the pick's values`,
        );
    }
});

test("a fight link carries the choices", () => {
  const c: Choices = { ...RANDOM, raw: "scythe", set2: "scythe-sword-axe", ult: "ccw", wall: "north" };
  assert.equal(choicesText(c), "raw=scythe,set2=scythe-sword-axe,ult=ccw,wall=north");
  assert.deepEqual(parseChoices(choicesText(c)), c);
  assert.equal(choicesText(RANDOM), "");
  assert.deepEqual(parseChoices(""), RANDOM);
  // Unknown parts and values from a hand-edited link become Random.
  assert.deepEqual(parseChoices("raw=hammer,ult=cw,bogus=1"), { ...RANDOM, ult: "cw" });
  // An order must hold each weapon once.
  assert.deepEqual(parseChoices("set1=axe-axe-sword,set2=sword"), RANDOM);
});
