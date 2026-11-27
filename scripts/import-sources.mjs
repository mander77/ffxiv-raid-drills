// Imports a fight's times and attack sizes from its two sources, at pinned commits, into the
// fight's folder. The data files read every fight time and attack size from source.gen.ts.
//
//   npm run import:sources                 imports every fight that has a sources.json
//   npm run import:sources -- m11s         imports one fight
//   npm run import:sources -- --check      writes nothing; fails if a generated file is out of date
//
// Each fight lists its sources in src/data/fights/<id>/sources.json: the repositories, the
// pinned commits, the files, and the choices a person made about them. `npm run find:sources`
// (scripts/find-sources.mjs) writes a first list for a new fight, marked "checked": false. The
// import uses a list only once a person has checked it and set "checked": true.
//
// The sources:
// - cactbot's timeline for the fight: every fight time. Its fight starts at 0, and each branch
//   (axe or scythe first, Comet or Crushing Comet first) runs at its own offset. The import
//   removes the offsets, so each time is seconds into the fight.
// - cactbot's triggers for the fight: what each callout says, and which mechanics have random
//   parts (the draft of a new fight reads them; the site does not).
// - BossMod's module folder for the fight: every attack's size and shape, the boss's hitbox and
//   the arena, from the enums and module files. Its mechanic files hold positions and safe spots
//   (for the draft too). A fight's "extras" read
//   more from one file: M11S's "arenaSplit" reads the Arena Split from its Flatliner file, and
//   "ultimateCalls" reads a call table (named in sources.json) from cactbot's triggers file.
//
// - BossMod's state list for the fight (<module>States.cs): the boss's states in fight order,
//   grouped by phase block, with their delays and the components they turn on and off (for the
//   draft; cactbot stays the source of every time, and test/importSources.test.ts checks the two
//   against each other).
//
// Each fight gets two generated files in its folder: source.gen.ts (what the site reads) and
// sources.extra.gen.json (the triggers, the mechanic files and the state list, for the draft). Never edit them by
// hand: change sources.json and run the import again.
//
// Downloads come only from the two official GitHub repositories, at the pinned commits, into
// .cache/sources/ (git ignores it). To move a pin, change the commit in sources.json, run the
// import, and review the new generated files in their own commit.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIGHTS = join(ROOT, "src", "data", "fights");
const CACHE = join(ROOT, ".cache", "sources");

/** The only repositories the import downloads from. */
export const REPOS = { cactbot: "OverlayPlugin/cactbot", bossmod: "awgil/ffxiv_bossmod" };

/** One file of a repository at a commit, from the cache or from GitHub. */
async function download(repo, commit, path) {
  if (!Object.values(REPOS).includes(repo)) throw new Error(`${repo} is not cactbot or BossMod`);
  const file = join(CACHE, `${repo.replace("/", "@")}@${commit}`, path);
  if (existsSync(file)) return readFileSync(file, "utf8");
  const url = `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  // Some files start with a byte order mark. It is not part of the text.
  const text = (await res.text()).replace(/^﻿/, "");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return text;
}

/** One decimal, as the sources write their times. */
const tenth = (n) => Math.round(n * 10) / 10;

/** The timeline's lines, each at its time into the fight, without the branch offsets. Lines
    that only sync the timeline ("--sync--", "--Reset--") are left out. The same line in more
    than one branch (at the same time into the fight) is kept once. */
export function parseCactbot(text) {
  const labelOffset = new Map();
  const seen = new Map();
  let offset = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = /^(\d+(?:\.\d+)?)\s+(?:label\s+"([^"]+)"|"([^"]*)"(.*))$/.exec(line);
    if (!m) continue;
    const t = Number(m[1]);
    const [, , label, name, rest = ""] = m;
    if (label) {
      // A branch starts here. A jump to it set its offset; with no jump, the timeline runs on.
      if (labelOffset.has(label)) offset = labelOffset.get(label);
      continue;
    }
    // The rest of the line, without its comment, is where the ids and the jump are.
    const body = rest.replace(/\s#.*$/, "").replace(/^\s*#/, "");
    const jump = /\b(?:force)?jump\s+"([^"]+)"/.exec(body);
    if (jump) {
      const target = text.match(new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)\\s+label\\s+"${jump[1]}"`, "m"));
      if (!target) throw new Error(`cactbot: no label "${jump[1]}"`);
      const to = tenth(Number(target[1]) - (t - offset));
      if (labelOffset.has(jump[1]) && labelOffset.get(jump[1]) !== to) {
        throw new Error(`cactbot: two jumps give "${jump[1]}" different offsets`);
      }
      labelOffset.set(jump[1], to);
    }
    if (name === "--sync--" || name === "--Reset--") continue;
    const ids = [...(/\bid:\s*(\[[^\]]*\]|"[^"]*")/.exec(rest)?.[1] ?? "").matchAll(/"([0-9A-F]+)"/g)].map((x) => x[1]);
    // How long the line lasts, as written: for a line of several hits, from its first to its last.
    // Read like the ids, also when the line's sync is commented out.
    const duration = /\bduration\s+(\d+(?:\.\d+)?)/.exec(rest)?.[1];
    const at = tenth(t - offset);
    const key = `${at}|${name}`;
    const known = seen.get(key);
    if (known) {
      for (const id of ids) if (!known.ids.includes(id)) known.ids.push(id);
    } else seen.set(key, { t: at, name, ids, ...(duration ? { duration: Number(duration) } : {}) });
  }
  return [...seen.values()].sort((a, b) => a.t - b.t || a.name.localeCompare(b.name));
}

/** The shape in a BossMod comment: "range 8 circle", "range 5-60 donut", "range 40 width 10
    cross", "range 60 width 6 rect", "range 60 90-degree cone" or "single-target". A comment
    with no shape the import knows ("???", "range 9?-13 donut") keeps its text as "unknown". */
function parseShape(text) {
  let m = /range (\d+(?:\.\d+)?) circle/.exec(text);
  if (m) return { shape: "circle", range: Number(m[1]) };
  m = /range (\d+(?:\.\d+)?)-(\d+(?:\.\d+)?) donut/.exec(text);
  if (m) return { shape: "donut", inner: Number(m[1]), range: Number(m[2]) };
  m = /range (\d+(?:\.\d+)?) width (\d+(?:\.\d+)?) (rect|cross)/.exec(text);
  if (m) return { shape: m[3], range: Number(m[1]), width: Number(m[2]) };
  m = /range (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)-degree cone/.exec(text);
  if (m) return { shape: "cone", range: Number(m[1]), angle: Number(m[2]) };
  if (/single-target/.test(text)) return { shape: "single-target" };
  return { shape: "unknown", text: text.trim() };
}

/** The actors (with their hitbox radius) and the abilities (with their cast and shape) in
    BossMod's enums file. */
export function parseBossmod(enums, module) {
  const block = (name) => {
    const m = new RegExp(`enum ${name} : uint\\s*\\{([\\s\\S]*?)\\}`).exec(enums);
    if (!m) throw new Error(`bossmod: no enum ${name}`);
    return m[1].split(/\r?\n/);
  };
  const actors = {};
  for (const line of block("OID")) {
    const m = /^\s*(\w+) = 0x([0-9A-F]+), \/\/ R(\d+(?:\.\d+)?)/.exec(line);
    if (m) actors[m[1]] = { id: m[2], radius: Number(m[3]) };
  }
  const abilities = {};
  for (const line of block("AID")) {
    const m = /^\s*(\w+) = (\d+), \/\/ ([^,]+), ([^,]+), (.*)$/.exec(line);
    if (!m) continue;
    const [, name, id, from, castText, rest] = m;
    const cast = /^(\d+(?:\.\d+)?)(?:\+(\d+(?:\.\d+)?))?s cast$/.exec(castText);
    abilities[name] = {
      id: Number(id).toString(16).toUpperCase(),
      from,
      cast: cast ? Number(cast[1]) : 0,
      ...(cast?.[2] ? { delay: Number(cast[2]) } : {}),
      ...parseShape(rest),
    };
  }
  // The arena: a square, given by half its width ("new ArenaBoundsSquare(20)").
  const square = /BossModule\(init, new\(\d+, \d+\), new ArenaBoundsSquare\((\d+)\)\)/.exec(module);
  if (!square) throw new Error("bossmod: no square arena in the module");
  return { actors, abilities, arenaHalf: Number(square[1]) };
}

/** The voidzones in a BossMod file: each class that is a plain voidzone around an actor, by class
    name, with that actor and its radius in yalms ("class Maelstrom(BossModule module) :
    Components.Voidzone(module, 4, OID.Maelstrom);"). */
export function parseVoidzones(text) {
  const out = {};
  for (const m of text.matchAll(/class (\w+)\(BossModule module\) : Components\.Voidzone\(module, (\d+(?:\.\d+)?)f?, OID\.(\w+)\)/g))
    out[m[1]] = { actor: m[3], radius: Number(m[2]) };
  return out;
}

/** The Arena Split in BossMod's Flatliner file, in yalms from the arena's center: each platform's
    center ("p + new WDir(16, 0)"), its half width and half length ("CurveApprox.Rect(new WDir(0,
    20), new WDir(10, 0))"), the x of each side portal line ("0x16 => -21") and how far north of
    the center it starts ("_sources.Add(new(100 + xpos, 75))": 25), and how far from its
    portal a tether counts as stretched ("StretchDistance = 48f", which BossMod calls an estimate),
    how far a tower knocks the players in it ("KnockbackFromCastTarget(module,
    AID.ExplosionTower, 23"), and how far Flatliner knocks the party away from the arena's center
    (its class Flatliner: "yield return new(Arena.Center, 15, _activation)"). */
export function parseSplit(flatliner) {
  const rect = /var plat = CurveApprox\.Rect\(new WDir\(0, (\d+(?:\.\d+)?)\), new WDir\((\d+(?:\.\d+)?), 0\)\)/.exec(flatliner);
  const offset = /plat\.Select\(p => p \+ new WDir\((\d+(?:\.\d+)?), 0\)\)/.exec(flatliner);
  const lines = /class MajesticMeteorain[\s\S]*?var xpos = index switch\s*\{([\s\S]*?)\};/.exec(flatliner);
  const lineFrom = /_sources\.Add\(new\(100 \+ xpos, (\d+(?:\.\d+)?)\)\)/.exec(flatliner);
  const stretch = /StretchDistance = (\d+(?:\.\d+)?)f;/.exec(flatliner);
  const knockback = /class ExplosionKnockback[^\n]*KnockbackFromCastTarget\(module, AID\.ExplosionTower, (\d+(?:\.\d+)?)/.exec(flatliner);
  const flat = /class Flatliner\(BossModule module\)[\s\S]*?yield return new\(Arena\.Center, (\d+(?:\.\d+)?), _activation\)/.exec(
    flatliner,
  );
  if (!rect || !offset || !lines || !lineFrom || !stretch || !knockback || !flat)
    throw new Error("bossmod: no Arena Split in the Flatliner file");
  const xs = [...lines[1].matchAll(/0x[0-9A-F]+ => (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (xs.length === 0) throw new Error("bossmod: no Majestic Meteorain lines in the Flatliner file");
  return {
    platformCenter: Number(offset[1]),
    platformHalfWidth: Number(rect[2]),
    platformHalfLength: Number(rect[1]),
    lines: xs,
    lineFrom: 100 - Number(lineFrom[1]),
    stretch: Number(stretch[1]),
    towerKnockback: Number(knockback[1]),
    flatlinerKnockback: Number(flat[1]),
  };
}

/** Triple Tyrannhilation's line of sight, in yalms: the radius of each comet (rock) that blocks the
    Shockwaves. BossMod marks it as a guess. */
export function parseLineOfSight(meteorain) {
  const radius = /class TripleTyrannhilation[\s\S]*?CometRadius = (\d+(?:\.\d+)?)f;/.exec(meteorain);
  if (!radius) throw new Error("bossmod: no Triple Tyrannhilation comet radius in the Meteorain file");
  return { cometRadius: Number(radius[1]) };
}

/** A cactbot call table for weapons that spawn one after another (M11S's
    ultimateTrophyWeaponsMap, named in sources.json): for each weapon, in spawn order, how long
    after its spawn the call comes ("delay") and how long the call counts down to its hit
    ("duration"), in seconds. The table's empty slots ("undefined", for the weapons of earlier
    sets) are left out. */
export function parseWeaponCalls(triggers, name) {
  if (!/^\w+$/.test(name)) throw new Error(`cactbot: "${name}" is not a name`);
  const table = new RegExp(`^const ${name}\\b[^=]*= \\[([\\s\\S]*?)^\\];`, "m").exec(triggers);
  if (!table) throw new Error(`cactbot: no ${name} in the triggers file`);
  const entries = table[1].split(/(?<=\}|undefined),/).filter((x) => x.trim());
  const calls = entries
    .filter((x) => x.trim() !== "undefined")
    .map((x) => {
      const m = /^\s*\{\s*delay: (\d+(?:\.\d+)?),\s*duration: (\d+(?:\.\d+)?),?\s*\}\s*$/.exec(x);
      if (!m) throw new Error(`cactbot: an entry of ${name} the import does not read: ${x.trim()}`);
      return { delay: Number(m[1]), duration: Number(m[2]) };
    });
  if (calls.length === 0) throw new Error(`cactbot: ${name} has no calls`);
  return calls;
}

/** A value as TypeScript text, on one line. */
const ts = (v) =>
  typeof v === "string"
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? `[${v.map(ts).join(", ")}]`
      : typeof v === "object"
        ? `{${Object.entries(v)
            .map(([k, x]) => `${k}:${ts(x)}`)
            .join(", ")}}`
        : String(v);

/** The triggers in cactbot's triggers file, each with its id, its log line type, its netRegex
    as written, the ability ids it watches, the kinds of callout it makes, its English callouts
    (by output name) and the comments in it. */
export function parseTriggers(text) {
  const starts = [...text.matchAll(/^ {6}id: '((?:[^'\\]|\\.)+)',(?: *\/\/.*)?$/gm)];
  return starts.map((m, i) => {
    const block = text.slice(m.index, starts[i + 1]?.index ?? text.length);
    const netRegex = /^ {6}netRegex: (.*),$/m.exec(block)?.[1];
    const ids = netRegex ? [...(/\bid: (\[[^\]]*\]|'[^']*')/.exec(netRegex)?.[1] ?? "").matchAll(/'([0-9A-F]{4})'/g)].map((x) => x[1]) : [];
    const outputs = {};
    for (const o of block.matchAll(/^ {8}(\w+): \{\s*\n\s*en: '((?:[^'\\]|\\.)*)'/gm)) outputs[o[1]] = o[2];
    for (const o of block.matchAll(/^ {8}(\w+): (Outputs\.\w+),$/gm)) outputs[o[1]] = o[2];
    const kinds = [...new Set([...block.matchAll(/^ {6}(infoText|alertText|alarmText|tts|response):/gm)].map((k) => k[1]))];
    const notes = [...block.matchAll(/^\s*\/\/ ?(.*)$/gm)].map((c) => c[1].trim()).filter(Boolean);
    return {
      id: m[1].replace(/\\(.)/g, "$1"),
      type: /^ {6}type: '(\w+)',$/m.exec(block)?.[1] ?? null,
      ...(netRegex ? { netRegex } : {}),
      ids,
      kinds,
      outputs,
      ...(notes.length ? { notes } : {}),
    };
  });
}

/** The text inside the brackets that open at `open` (the index of a "("), with brackets inside it. */
function inBrackets(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

/** One argument of a BossMod shape: a number ("60", "7.5f"), an angle ("22.5f.Degrees()", as
    { deg: 22.5 }), or its text when it is neither. */
function shapeArg(text) {
  const t = text.trim();
  if (/^-?\d+(?:\.\d+)?f?$/.test(t)) return Number(t.replace(/f$/, ""));
  const deg = /^(-?\d+(?:\.\d+)?)f?\.Degrees\(\)$/.exec(t);
  return deg ? { deg: Number(deg[1]) } : t;
}

/** The arguments in a shape's brackets, split at the commas outside inner brackets. */
function shapeArgs(inside) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < inside.length; i++) {
    if (inside[i] === "(") depth++;
    else if (inside[i] === ")") depth--;
    else if (inside[i] === "," && depth === 0) {
      out.push(inside.slice(from, i));
      from = i + 1;
    }
  }
  if (inside.trim()) out.push(inside.slice(from));
  return out.map(shapeArg);
}

/** A shape as short text: "Cone(60, 22.5deg)". */
const shapeText = (s) => `${s.kind}(${s.args.map((a) => (typeof a === "object" ? `${a.deg}deg` : a)).join(", ")})`;

/** The AoE shapes a piece of BossMod code makes, as BossMod writes them: "new AOEShapeCone(60,
    22.5f.Degrees())", and "AOEShapeCone Cone = new(60, ...)" for a named shape. `named` (by name)
    collects the named ones, so a class that only names one ("BigCone") makes it too. */
function shapesIn(text, named = new Map()) {
  const out = [];
  for (const m of text.matchAll(/new AOEShape(\w+)\(/g))
    out.push({ kind: m[1], args: shapeArgs(inBrackets(text, m.index + m[0].length - 1)) });
  for (const m of text.matchAll(/AOEShape(\w+) (\w+) = new\(/g)) {
    const shape = { kind: m[1], args: shapeArgs(inBrackets(text, m.index + m[0].length - 1)) };
    named.set(m[2], shape);
    out.push(shape);
  }
  for (const m of text.matchAll(/AOEShape (\w+) = new AOEShape(\w+)\(/g)) {
    named.set(m[1], { kind: m[2], args: shapeArgs(inBrackets(text, m.index + m[0].length - 1)) });
  }
  return out;
}

/** The classes in one BossMod mechanic file, each with what it is built on (its base class),
    the abilities it names (AID.x), the AoE shapes it makes (as BossMod writes them: "Cone(60,
    22.5deg)", where a cone's angle is half its width, and a rectangle's or a cross's width is
    half its width) and the positions and directions it names ("WPos(100, 90)"), in yalms. */
export function parseMechanics(text) {
  const starts = [...text.matchAll(/^(?:public |internal |sealed |abstract )*class (\w+)(?:\([^)]*\))?\s*:\s*([\w.]+(?:<[^>]*>)?)/gm)];
  const named = new Map();
  shapesIn(text, named);
  return starts.map((m, i) => {
    const block = text.slice(m.index, starts[i + 1]?.index ?? text.length);
    const all = (re) => [...new Set([...block.matchAll(re)].map((x) => x[1]))];
    const shapes = [...shapesIn(block), ...[...named].filter(([name]) => new RegExp(`\\b${name}\\b`).test(block)).map(([, s]) => s)];
    return {
      name: m[1],
      base: m[2],
      aids: all(/\bAID\.(\w+)/g),
      shapes: [...new Set(shapes.map(shapeText))],
      positions: all(/new (W(?:Pos|Dir)\(\s*-?[\d.]+f?,\s*-?[\d.]+f?\s*\))/g).map((x) => x.replace(/f(?=[,)])/g, "").replace(/\s+/g, " ")),
    };
  });
}

/** A BossMod shape as source.gen.ts writes a shape, in full widths: a cone's angle and a
    rectangle's or a cross's width are twice BossMod's half values. Null for a shape the site
    does not draw, or one with a size that is not a number. */
function fullShape(text) {
  const m = /^(\w+)\((.*)\)$/.exec(text);
  if (!m) return null;
  const args = m[2] ? m[2].split(", ").map((a) => (a.endsWith("deg") ? Number(a.slice(0, -3)) : Number(a))) : [];
  if (args.some((a) => !Number.isFinite(a))) return null;
  const [a, b, c] = args;
  if (m[1] === "Circle" && args.length === 1) return { shape: "circle", range: a };
  if (m[1] === "Donut" && args.length === 2) return { shape: "donut", inner: a, range: b };
  if (m[1] === "Cone" && args.length === 2) return { shape: "cone", range: a, angle: b * 2 };
  if (m[1] === "Rect" && args.length >= 2) return { shape: "rect", range: a, width: b * 2, ...(c ? { back: c } : {}) };
  if (m[1] === "Cross" && args.length === 2) return { shape: "cross", range: a, width: b * 2 };
  return null;
}

/** Fill in each ability whose enums comment gives no full shape ("range 60 ?-degree cone",
    "???") from the mechanic files: when the classes that name the ability make exactly one shape
    that fits what the comment does say (its kind and range), that shape is the ability's, and
    `sizeFrom` names the file and the class. The others stay "unknown". */
export function fillShapes(abilities, mechanics) {
  for (const [name, a] of Object.entries(abilities)) {
    if (a.shape !== "unknown") continue;
    const kind = /\b(circle|donut|cone|rect|cross)$/.exec(a.text)?.[1];
    const range = /^range (\d+(?:\.\d+)?)\b/.exec(a.text)?.[1];
    const found = new Map();
    for (const { file, classes } of mechanics)
      for (const c of classes)
        if (c.aids.includes(name))
          for (const text of c.shapes) {
            const shape = fullShape(text);
            if (shape && (!kind || shape.shape === kind) && (!range || shape.range === Number(range)))
              found.set(ts(shape), { shape, from: `${file} ${c.name}` });
          }
    if (found.size !== 1) continue;
    const [{ shape, from }] = found.values();
    const { text, ...rest } = a;
    delete rest.shape;
    abilities[name] = { ...rest, ...shape, sizeFrom: from };
  }
  return abilities;
}

// The boss's state list, from BossMod's <module>States.cs. It is C# code: a class whose
// constructor names the phases ("DeathPhase(0, SinglePhase)"), and methods that call
// StateMachineBuilder (BossMod/BossModule/StateMachineBuilder.cs) once per state, in fight order:
//
//   Cast(id + 0x10, AID.CrownOfArcadia, 5.2f, 5, "Raidwide")
//       .ActivateOnEnter<CrownOfArcadia>()
//       .DeactivateOnExit<CrownOfArcadia>();
//   ComponentCondition<TrophyWeaponsAOE>(id + 0x112, 2.2f, t => t.NumCasts > 0, "Weapon 1");
//   TrophyWeapons(id + 0x100, 5.2f);        a phase block: a method of the same class
//
// Each state waits its delay after the state before it. A cast waits its delay to start, then its
// cast time to end. The parser reads only the calls below, and stops on any other, so a new kind
// of call is never skipped without a person seeing it.

/** The StateMachineBuilder calls the parser knows, with their parameters in order (as
    StateMachineBuilder.cs names them). "delay" and "castTime" add to the time; a call with both
    is a cast that starts after its delay and ends after its cast time. */
const STATE_CALLS = {
  Cast: ["id", "aid", "delay", "castTime", "name", "interruptible"],
  CastMulti: ["id", "aids", "delay", "castTime", "name", "interruptible"],
  CastStart: ["id", "aid", "delay", "name"],
  CastStartMulti: ["id", "aids", "delay", "name"],
  CastEnd: ["id", "castTime", "name", "interruptible"],
  ActorCast: ["id", "actor", "aid", "delay", "castTime", "isBoss", "name", "interruptible"],
  ActorCastMulti: ["id", "actor", "aids", "delay", "castTime", "isBoss", "name", "interruptible"],
  ActorCastStart: ["id", "actor", "aid", "delay", "isBoss", "name"],
  ActorCastStartMulti: ["id", "actor", "aids", "delay", "isBoss", "name"],
  ActorCastEnd: ["id", "actor", "castTime", "isBoss", "name", "interruptible"],
  ComponentCondition: ["id", "delay", "condition", "name", "maxOverdue", "checkDelay"],
  Condition: ["id", "delay", "condition", "name", "maxOverdue", "checkDelay"],
  Timeout: ["id", "delay", "name"],
  SimpleState: ["id", "delay", "name"],
  Targetable: ["id", "targetable", "delay", "name", "checkDelay"],
  ActorTargetable: ["id", "actor", "targetable", "delay", "name", "checkDelay"],
};

/** The calls that start a phase, in the constructor, with their parameters in order. */
const PHASE_CALLS = {
  DeathPhase: ["id", "method"],
  SimplePhase: ["id", "method", "name", "duration"],
};

/** The calls chained after a state or a phase: what it turns on and off. */
const CHAIN_CALLS = new Set([
  "ActivateOnEnter",
  "DeactivateOnEnter",
  "DeactivateOnExit",
  "ExecOnEnter",
  "ExecOnExit",
  "SetHint",
  "ClearHint",
]);

/** The index of the bracket that closes the one at `open`, past strings and other brackets. */
function closing(text, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      while (text[++i] !== '"') if (text[i] === "\\") i++;
    } else if (pairs[c]) stack.push(pairs[c]);
    else if (c === stack[stack.length - 1] && stack.pop() && stack.length === 0) return i;
  }
  throw new Error(`bossmod states: no closing bracket for "${text.slice(open, open + 40)}"`);
}

/** Text split at `sep` where it is outside strings and brackets. */
function splitTop(text, sep) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      while (text[++i] !== '"') if (text[i] === "\\") i++;
    } else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === sep && depth === 0) {
      out.push(text.slice(from, i).trim());
      from = i + 1;
    }
  }
  out.push(text.slice(from).trim());
  return out.filter(Boolean);
}

/** C# text without its comments ("// ..." to the end of a line, "/* ... *\/"), strings kept. */
function withoutComments(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      const from = i;
      while (text[++i] !== '"') if (text[i] === "\\") i++;
      out += text.slice(from, i + 1);
    } else if (text.startsWith("//", i)) while (i < text.length && text[i] !== "\n") i++;
    else if (text.startsWith("/*", i)) i = text.indexOf("*/", i) + 1;
    else out += text[i];
  }
  return `${out}\n`;
}

/** One argument's value: a number ("5.2f", "0x10"), a sum with the method's parameters ("id +
    0x10"), true or false, a string, an ability ("AID.X", as its name), a list of abilities, or
    its text (a lambda, an actor). `env` holds the method's parameters. */
function stateValue(text, env) {
  const t = text.trim();
  if (/^"(?:[^"\\]|\\.)*"$/.test(t)) return JSON.parse(t);
  if (t === "true" || t === "false") return t === "true";
  const aid = /^AID\.(\w+)$/.exec(t);
  if (aid) return aid[1];
  if (t.startsWith("[") && t.endsWith("]")) return splitTop(t.slice(1, -1), ",").map((x) => stateValue(x, env));
  if (/^[\w.]+(?:\s*[+-]\s*[\w.]+)*$/.test(t)) {
    const parts = t.split(/\s*([+-])\s*/);
    let sum = 0;
    let sign = 1;
    for (const p of parts) {
      if (p === "+" || p === "-") {
        sign = p === "+" ? 1 : -1;
        continue;
      }
      let n;
      if (/^0x[0-9A-Fa-f]+$/.test(p)) n = Number.parseInt(p, 16);
      else if (/^\d+(?:\.\d+)?f?$/.test(p)) n = Number(p.replace(/f$/, ""));
      else if (p in env) n = env[p];
      else return t;
      if (typeof n !== "number") return t;
      sum += sign * n;
    }
    return sum;
  }
  return t;
}

/** A call's arguments bound to its parameter names, positional first, then "name: value". */
function bindArgs(args, params, env, where) {
  const out = {};
  args.forEach((a, i) => {
    const named = /^(\w+):\s*([\s\S]*)$/.exec(a);
    const key = named ? named[1] : params[i];
    if (!key || !params.includes(key)) throw new Error(`bossmod states: ${where}: an argument "${a}" the parser does not know`);
    out[key] = stateValue(named ? named[2] : a, env);
  });
  return out;
}

/** One statement as a call: its name, its type argument ("ComponentCondition<T>"), its
    arguments, and the calls chained after it. Null for an assignment ("_module = ..."). */
function parseCall(statement, where) {
  if (/^[\w.]+\s*=[^=>]/.test(statement)) return null;
  const head = /^(\w+)(?:<(\w+)>)?\(/.exec(statement);
  if (!head) throw new Error(`bossmod states: ${where}: a statement the parser does not know: "${statement.slice(0, 80)}"`);
  const end = closing(statement, head[0].length - 1);
  const call = { name: head[1], type: head[2], args: splitTop(statement.slice(head[0].length, end), ","), chain: [] };
  let rest = statement.slice(end + 1).trim();
  while (rest) {
    const m = /^\.(\w+)(?:<(\w+)>)?\(/.exec(rest);
    if (!m) throw new Error(`bossmod states: ${where}: text after a call the parser does not know: "${rest.slice(0, 80)}"`);
    const close = closing(rest, m[0].length - 1);
    call.chain.push({ name: m[1], type: m[2], args: splitTop(rest.slice(m[0].length, close), ",") });
    rest = rest.slice(close + 1).trim();
  }
  return call;
}

/** What the calls chained after a state or a phase turn on and off. A component that BossMod
    turns on only under a setting gets " if <the setting>". */
function chainEffects(chain, where) {
  const out = {};
  const add = (key, v) => {
    out[key] ??= [];
    out[key].push(v);
  };
  for (const c of chain) {
    if (!CHAIN_CALLS.has(c.name)) throw new Error(`bossmod states: ${where}: a chained call the parser does not know: .${c.name}`);
    if (c.name === "SetHint" || c.name === "ClearHint") {
      add("hints", `${c.name === "SetHint" ? "+" : "-"}${c.args[0].replace(/^StateMachine\.\w+Hint\./, "")}`);
      continue;
    }
    if (!c.type) throw new Error(`bossmod states: ${where}: .${c.name} with no component`);
    if (c.name.startsWith("Exec")) {
      add("exec", { component: c.type, when: c.name === "ExecOnEnter" ? "enter" : "exit", code: c.args[0] });
      continue;
    }
    const key = { ActivateOnEnter: "activate", DeactivateOnEnter: "deactivateOnEnter", DeactivateOnExit: "deactivate" }[c.name];
    add(key, c.args[0] && c.args[0] !== "true" ? `${c.type} if ${c.args[0]}` : c.type);
  }
  return out;
}

/** The methods of the states class: each one's parameter names and its statements. */
function stateMethods(text) {
  const methods = {};
  for (const m of text.matchAll(/^\s*(?:(?:private|public|protected|internal|static)\s+)*void (\w+)\(([^)]*)\)\s*\{/gm)) {
    const open = m.index + m[0].length - 1;
    const params = m[2] ? m[2].split(",").map((p) => p.trim().split(/\s+/).pop()) : [];
    methods[m[1]] = { params, body: splitTop(text.slice(open + 1, closing(text, open)), ";") };
  }
  return methods;
}

/** BossMod's state list for a fight, from its <module>States.cs: each phase with its states in
    fight order. Each state has its id, its call, the ability it casts (or the component it
    waits on), its delay after the state before it, its cast time, its name, and its time into the
    phase ("at", where a cast ends; "start", where it starts), as BossMod expects them. A phase
    block (a method of the class) is a group with its own states inside. */
export function parseStates(raw) {
  const text = withoutComments(raw);
  const cls = /class (\w+)States\s*:\s*StateMachineBuilder/.exec(text);
  if (!cls) throw new Error("bossmod states: no class that builds a StateMachineBuilder");
  const ctor = new RegExp(`public ${cls[1]}States\\(BossModule module\\)\\s*:\\s*base\\(module\\)\\s*\\{`).exec(text);
  if (!ctor) throw new Error(`bossmod states: no constructor ${cls[1]}States(BossModule module)`);
  const ctorOpen = ctor.index + ctor[0].length - 1;
  const methods = stateMethods(text);
  const hex = (n) => `0x${n.toString(16).toUpperCase()}`;

  /** The states of one method, from time `t`, with its parameters in `env`. */
  function run(method, env, clock, stack) {
    const def = methods[method];
    if (stack.includes(method)) throw new Error(`bossmod states: ${method} calls itself`);
    const out = [];
    for (const statement of def.body) {
      const where = `${method}: "${statement.split("\n")[0].trim().slice(0, 60)}"`;
      const call = parseCall(statement, where);
      if (!call) throw new Error(`bossmod states: ${where}: an assignment in a phase method`);
      if (STATE_CALLS[call.name]) {
        const a = bindArgs(call.args, STATE_CALLS[call.name], env, where);
        for (const k of ["id", "delay", "castTime"])
          if (k in a && typeof a[k] !== "number") throw new Error(`bossmod states: ${where}: ${k} "${a[k]}" is not a number`);
        const state = { id: hex(a.id), call: call.name };
        if (call.type) state.component = call.type;
        if (a.aid) state.aid = a.aid;
        if (a.aids) state.aids = a.aids;
        if (a.actor) state.actor = a.actor;
        if (typeof a.targetable === "boolean") state.targetable = a.targetable;
        if ("delay" in a) state.delay = a.delay;
        if ("castTime" in a) state.cast = a.castTime;
        if (a.name) state.name = a.name;
        if (a.condition) state.condition = a.condition;
        clock.t += a.delay ?? 0;
        if ("castTime" in a && "delay" in a) state.start = tenth(clock.t);
        clock.t += a.castTime ?? 0;
        state.at = tenth(clock.t);
        out.push({ ...state, ...chainEffects(call.chain, where) });
      } else if (methods[call.name]) {
        const params = methods[call.name].params;
        if (call.args.length !== params.length) throw new Error(`bossmod states: ${where}: ${call.name} takes ${params.length} arguments`);
        const inner = Object.fromEntries(params.map((p, i) => [p, stateValue(call.args[i], env)]));
        if (call.chain.length) throw new Error(`bossmod states: ${where}: a call chained after a phase block`);
        const group = { group: call.name, id: hex(inner.id), from: tenth(clock.t) };
        if (typeof inner.delay === "number") group.delay = inner.delay;
        group.states = run(call.name, inner, clock, [...stack, method]);
        out.push(group);
      } else throw new Error(`bossmod states: ${where}: a call the parser does not know: ${call.name}`);
    }
    return out;
  }

  const phases = [];
  for (const statement of splitTop(text.slice(ctorOpen + 1, closing(text, ctorOpen)), ";")) {
    const where = `constructor: "${statement.slice(0, 60)}"`;
    const call = parseCall(statement, where);
    if (!call) continue;
    if (!PHASE_CALLS[call.name]) throw new Error(`bossmod states: ${where}: a call the parser does not know: ${call.name}`);
    const a = bindArgs(call.args, PHASE_CALLS[call.name], {}, where);
    if (!methods[a.method]) throw new Error(`bossmod states: ${where}: no method ${a.method} in the class`);
    phases.push({
      call: call.name,
      id: hex(a.id),
      method: a.method,
      ...(a.name ? { name: a.name } : {}),
      ...(typeof a.duration === "number" ? { duration: a.duration } : {}),
      ...chainEffects(call.chain, where),
      states: run(a.method, { id: a.id }, { t: 0 }, []),
    });
  }
  if (phases.length === 0) throw new Error("bossmod states: the constructor starts no phase");
  return phases;
}

/** The extras a fight can ask for: each reads one more file of the BossMod module folder (the
    file sources.json names), or with `cactbot`, cactbot's triggers file (sources.json names
    what it reads there), and adds a value to source.gen.ts. */
const EXTRAS = {
  arenaSplit: {
    parse: parseSplit,
    out: (v) => [
      "/** BossMod's Arena Split, in yalms from the arena's center: the center of each platform (west",
      "    and east), its half width and half length, the x of each side portal line (Majestic",
      "    Meteorain) and how far north of the center each line starts, how far from its portal a",
      "    tether counts as stretched (BossMod's estimate), and",
      "    how far a tower knocks the players in it, and how far Flatliner knocks the party away from",
      "    the arena's center. */",
      `export const BOSSMOD_SPLIT = ${ts(v)} as const;`,
      "",
    ],
  },
  lineOfSight: {
    parse: parseLineOfSight,
    out: (v) => [
      "/** BossMod's Triple Tyrannhilation, in yalms: the radius of each comet that blocks the",
      '    Shockwaves (BossMod: "guessing"). */',
      `export const BOSSMOD_LOS = ${ts(v)} as const;`,
      "",
    ],
  },
  ultimateCalls: {
    cactbot: true,
    parse: parseWeaponCalls,
    out: (v) => [
      "/** cactbot's call for each weapon of Ultimate Trophy Weapons (trigger \"R11S Ultimate Trophy",
      '    Weapons"), in spawn order: how long after the weapon spawns the call comes (delay), and',
      "    how long the call counts down to the weapon's hit (duration), in seconds. */",
      `export const CACTBOT_ULTIMATE_CALLS = ${ts(v)} as const;`,
      "",
    ],
  },
};

/** The folder name of a BossMod module folder is also the name of its enums and module files. */
const moduleName = (folder) => basename(folder);

/** The generated file's text. */
export function generate(sources, lines, bossmod, extras) {
  const { cactbot } = sources;
  const out = [
    "// Generated by `npm run import:sources` (scripts/import-sources.mjs). Do not edit it by hand:",
    "// change the fight's sources.json and run the import again.",
    "//",
    `// cactbot: https://github.com/${cactbot.repo}/blob/${cactbot.commit}/${cactbot.timeline}`,
    `// BossMod: https://github.com/${sources.bossmod.repo}/blob/${sources.bossmod.commit}/${bossmod.folder}/${bossmod.name}Enums.cs`,
    "",
    "/** The pinned commit of each source. */",
    `export const PINS = ${ts({ cactbot: cactbot.commit, bossmod: sources.bossmod.commit })} as const;`,
    "",
    "/** cactbot's timeline: each line's time in seconds into the fight (branch offsets removed),",
    "    its name, its ability ids, and how long it lasts, when the line says. */",
    "export const CACTBOT_LINES = [",
    ...lines.map((l) => `  ${ts(l)},`),
    "] as const;",
    "",
    "/** BossMod's actors, with their hitbox radius in yalms. */",
    "export const BOSSMOD_ACTORS = {",
    ...Object.entries(bossmod.actors).map(([k, v]) => `  ${k}:${ts(v)},`),
    "} as const;",
    "",
    "/** BossMod's abilities: the ability id (as cactbot writes it), who casts it at what, the cast",
    "    and the delay after it in seconds, and the shape, in yalms. A cone's angle is its full",
    "    width in degrees. */",
    "export const BOSSMOD_ABILITIES = {",
    ...Object.entries(bossmod.abilities).map(([k, v]) => `  ${k}:${ts(v)},`),
    "} as const;",
    "",
    "/** BossMod's voidzones: the actor each one sits on, and its radius in yalms. */",
    "export const BOSSMOD_VOIDZONES = {",
    ...Object.entries(bossmod.voidzones).map(([k, v]) => `  ${k}:${ts(v)},`),
    "} as const;",
    "",
    "/** Half the width of BossMod's square arena, in yalms. */",
    `export const BOSSMOD_ARENA_HALF = ${bossmod.arenaHalf};`,
    "",
    ...Object.entries(extras).flatMap(([name, v]) => EXTRAS[name].out(v)),
  ];
  return out.join("\n");
}

/** The second generated file's text: the triggers, the mechanic files and the state list, for
    the draft. */
export function generateExtra(sources, triggers, mechanics, states) {
  const { cactbot, bossmod } = sources;
  const extra = {
    _generated: "By npm run import:sources (scripts/import-sources.mjs). Do not edit it by hand.",
    pins: { cactbot: cactbot.commit, bossmod: bossmod.commit },
    triggers: { file: `https://github.com/${cactbot.repo}/blob/${cactbot.commit}/${cactbot.triggers}`, list: triggers },
    mechanics,
    states: { file: `https://github.com/${bossmod.repo}/blob/${bossmod.commit}/${states.path}`, phases: states.phases },
  };
  return `${JSON.stringify(extra, null, 2)}\n`;
}

/** A fight's sources.json, checked: every field the import needs, only the two repositories. */
export function readSources(fight) {
  const file = join(FIGHTS, fight, "sources.json");
  if (!existsSync(file)) throw new Error(`no src/data/fights/${fight}/sources.json (npm run find:sources -- ${fight} writes one)`);
  const s = JSON.parse(readFileSync(file, "utf8"));
  if (s.checked !== true) throw new Error(`src/data/fights/${fight}/sources.json is not checked yet: check it, then set "checked": true`);
  const need = [s.cactbot?.commit, s.cactbot?.timeline, s.cactbot?.triggers, s.bossmod?.commit, s.bossmod?.module];
  if (need.some((x) => !x)) throw new Error(`src/data/fights/${fight}/sources.json misses a commit, a path or the module folder`);
  if (s.cactbot.repo !== REPOS.cactbot || s.bossmod.repo !== REPOS.bossmod)
    throw new Error(`${fight}: the repositories must be ${Object.values(REPOS).join(" and ")}`);
  for (const name of Object.keys(s.extras ?? {})) if (!EXTRAS[name]) throw new Error(`${fight}: no extra "${name}" in the import`);
  return s;
}

/** The fights that have a sources.json, by folder name. */
export const fightsWithSources = () =>
  readdirSync(FIGHTS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(FIGHTS, d.name, "sources.json")))
    .map((d) => d.name)
    .sort();

/** Both generated files of one fight, as text, from its checked sources.json (or from `s`, for a
    test). */
export async function importFight(fight, s = readSources(fight)) {
  const get = (repo, path) => download(repo, s.cactbot.repo === repo ? s.cactbot.commit : s.bossmod.commit, path);
  const lines = parseCactbot(await get(s.cactbot.repo, s.cactbot.timeline));
  const triggersText = await get(s.cactbot.repo, s.cactbot.triggers);
  const triggers = parseTriggers(triggersText);
  const { folder, mechanics: files = [] } = s.bossmod.module;
  const name = moduleName(folder);
  const moduleText = await get(s.bossmod.repo, `${folder}/${name}.cs`);
  const bossmod = {
    name,
    folder,
    ...parseBossmod(await get(s.bossmod.repo, `${folder}/${name}Enums.cs`), moduleText),
    voidzones: parseVoidzones(moduleText),
  };
  const mechanics = [];
  for (const file of files) {
    const text = await get(s.bossmod.repo, `${folder}/${file}`);
    mechanics.push({ file, classes: parseMechanics(text) });
    Object.assign(bossmod.voidzones, parseVoidzones(text));
  }
  fillShapes(bossmod.abilities, mechanics);
  const statesPath = `${folder}/${name}States.cs`;
  const states = { path: statesPath, phases: parseStates(await get(s.bossmod.repo, statesPath)) };
  const extras = {};
  for (const [extra, value] of Object.entries(s.extras ?? {}))
    extras[extra] = EXTRAS[extra].cactbot
      ? EXTRAS[extra].parse(triggersText, value)
      : EXTRAS[extra].parse(await get(s.bossmod.repo, `${folder}/${value}`));
  return {
    [join(FIGHTS, fight, "source.gen.ts")]: generate(s, lines, bossmod, extras),
    [join(FIGHTS, fight, "sources.extra.gen.json")]: generateExtra(s, triggers, mechanics, states),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const asked = args.filter((a) => !a.startsWith("--"));
  const fights = asked.length ? asked : fightsWithSources();
  let stale = false;
  for (const fight of fights) {
    for (const [file, text] of Object.entries(await importFight(fight))) {
      const shown = file.slice(ROOT.length + 1).replaceAll("\\", "/");
      if (check) {
        const now = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
        if (now === text) console.log(`${shown} matches the pinned sources.`);
        else {
          console.error(`${shown} does not match the pinned sources. Run: npm run import:sources -- ${fight}`);
          stale = true;
        }
      } else {
        writeFileSync(file, text);
        console.log(`wrote ${shown}`);
      }
    }
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
