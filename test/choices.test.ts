import { test, assert } from "vitest";
import { buildFight, CHOICE_ROWS, RANDOM, choicesText, parseChoices, type Choices, type Fight, type Picks } from "../src/data/fight";
import { newCode } from "../src/util";

const RUNS = 40;
const seg = (f: Fight, title: string) => {
  const g = f.segs.find(x => x.title.startsWith(title));
  if(!g) throw new Error("no stretch " + title);
  return g;
};
const WEAPON = new Set(["axe", "sword", "scythe"]);
/** The type of the weapon the boss takes first, read from the drawing (spawn 0). */
const firstWeapon = (f: Fight, title: string): string | undefined =>
  seg(f, title).scene.overlays.find(o => o.spawn === 0 && WEAPON.has(o.t))?.t;

/* What the arena shows for each pick, read from the built scenes, not only from f.picks. */
const SHOWS: { [K in keyof Picks]: (f: Fight, v: string) => boolean } = {
  raw: (f, v) => f.segs[0].title === "Raw Steel Trophy: " + v,
  void: (f, v) => /Comet/.test(seg(f, "Void Stardust into").scene.steps[4].q) === (v === "spread"),
  set1: (f, v) => firstWeapon(f, "Assault Evolved") === v,
  set2: (f, v) => seg(f, "Void Stardust into").scene.steps[0].a.startsWith("The " + v + ","),
  // The first of the six weapons spawns south and slightly west for clockwise, slightly east otherwise.
  ult: (f, v) => {
    const o = seg(f, "Ultimate Trophy Weapons").scene.overlays.find(x => x.spawn === 0 && WEAPON.has(x.t));
    return Boolean(o && "x" in o && (o.x < 50) === (v === "cw"));
  },
  fireball: (f, v) => {
    const g = f.segs.find(x => x.drills[0] === "m-ecl-two" || x.drills[0] === "m-ecl-four");
    return Boolean(g && g.drills[0] === "m-ecl-" + v && g.title.endsWith(v === "four" ? "Four-way Fireball" : "Two-way Fireball"));
  },
  wall: (f, v) => f.segs[f.segs.length - 1].scene.setup.includes(v.toUpperCase() + " wall")
};

test("each choice gives the chosen pattern, in every run", () => {
  for(const row of CHOICE_ROWS) for(const [v] of row.options){
    const c: Choices = {...RANDOM, [row.key]: v};
    for(let i = 0; i < RUNS; i++){
      const f = buildFight(i % 2 ? "H1" : "H2", newCode(), c);
      assert.equal(f.picks[row.key], v, row.label + " = " + v + ": the fight reports another pick");
      assert.ok(SHOWS[row.key](f, v), row.label + " = " + v + ": the arena does not show it");
    }
  }
});

test("Random still gives every pattern", () => {
  for(const row of CHOICE_ROWS){
    const seen = new Set<string>();
    for(let i = 0; i < 200; i++) seen.add(buildFight("H1").picks[row.key]);
    assert.sameMembers([...seen], row.options.map(([v]) => v), row.label + ": Random never gave some values");
  }
});

test("a choice changes only its own part: the rest still comes from the fight code", () => {
  for(let i = 0; i < 20; i++){
    const code = newCode(), plain = buildFight("H1", code);
    for(const row of CHOICE_ROWS) for(const [v] of row.options){
      const f = buildFight("H1", code, {...RANDOM, [row.key]: v});
      for(const other of CHOICE_ROWS) if(other.key !== row.key)
        assert.equal(f.picks[other.key], plain.picks[other.key], code + ": choosing " + row.key + " changed " + other.key);
      // The same code and choice always build the same fight.
      assert.deepEqual(buildFight("H1", code, {...RANDOM, [row.key]: v}).picks, f.picks);
    }
  }
});

test("a fight link carries the choices", () => {
  const c: Choices = {...RANDOM, raw:"scythe", set2:"sword", ult:"ccw", wall:"north"};
  assert.equal(choicesText(c), "raw=scythe,set2=sword,ult=ccw,wall=north");
  assert.deepEqual(parseChoices(choicesText(c)), c);
  assert.equal(choicesText(RANDOM), "");
  assert.deepEqual(parseChoices(""), RANDOM);
  // Unknown parts and values from a hand-edited link become Random.
  assert.deepEqual(parseChoices("raw=hammer,ult=cw,bogus=1"), {...RANDOM, ult:"cw"});
});
