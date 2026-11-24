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
//   more from one file: M11S's "arenaSplit" reads the Arena Split from its Flatliner file.
//
// Each fight gets two generated files in its folder: source.gen.ts (what the site reads) and
// sources.extra.gen.json (the triggers and the mechanic files, for the draft). Never edit them by
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
    const at = tenth(t - offset);
    const key = `${at}|${name}`;
    const known = seen.get(key);
    if (known) {
      for (const id of ids) if (!known.ids.includes(id)) known.ids.push(id);
    } else seen.set(key, { t: at, name, ids });
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

/** The Arena Split in BossMod's Flatliner file, in yalms from the arena's center: each platform's
    center ("p + new WDir(16, 0)"), its half width and half length ("CurveApprox.Rect(new WDir(0,
    20), new WDir(10, 0))"), the x of each side portal line ("0x16 => -21"), and how far from its
    portal a tether counts as stretched ("StretchDistance = 48f", which BossMod calls an estimate). */
export function parseSplit(flatliner) {
  const rect = /var plat = CurveApprox\.Rect\(new WDir\(0, (\d+(?:\.\d+)?)\), new WDir\((\d+(?:\.\d+)?), 0\)\)/.exec(flatliner);
  const offset = /plat\.Select\(p => p \+ new WDir\((\d+(?:\.\d+)?), 0\)\)/.exec(flatliner);
  const lines = /class MajesticMeteorain[\s\S]*?var xpos = index switch\s*\{([\s\S]*?)\};/.exec(flatliner);
  const stretch = /StretchDistance = (\d+(?:\.\d+)?)f;/.exec(flatliner);
  if (!rect || !offset || !lines || !stretch) throw new Error("bossmod: no Arena Split in the Flatliner file");
  const xs = [...lines[1].matchAll(/0x[0-9A-F]+ => (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (xs.length === 0) throw new Error("bossmod: no Majestic Meteorain lines in the Flatliner file");
  return {
    platformCenter: Number(offset[1]),
    platformHalfWidth: Number(rect[2]),
    platformHalfLength: Number(rect[1]),
    lines: xs,
    stretch: Number(stretch[1]),
  };
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

/** The classes in one BossMod mechanic file, each with what it is built on (its base class),
    the abilities it names (AID.x), the AoE shapes it makes ("Circle(5)") and the positions and
    directions it names ("WPos(100, 90)"), in yalms. */
export function parseMechanics(text) {
  const starts = [...text.matchAll(/^(?:public |internal |sealed |abstract )*class (\w+)(?:\([^)]*\))?\s*:\s*([\w.]+(?:<[^>]*>)?)/gm)];
  return starts.map((m, i) => {
    const block = text.slice(m.index, starts[i + 1]?.index ?? text.length);
    const all = (re) => [...new Set([...block.matchAll(re)].map((x) => x[1]))];
    return {
      name: m[1],
      base: m[2],
      aids: all(/\bAID\.(\w+)/g),
      shapes: all(/new (AOEShape\w+\([^)]*\))/g).map((x) => x.replace(/^AOEShape/, "")),
      positions: all(/new (W(?:Pos|Dir)\(\s*-?[\d.]+f?,\s*-?[\d.]+f?\s*\))/g).map((x) => x.replace(/f(?=[,)])/g, "").replace(/\s+/g, " ")),
    };
  });
}

/** The extras a fight can ask for: each reads one more file of the BossMod module folder and
    adds a value to source.gen.ts. */
const EXTRAS = {
  arenaSplit: {
    parse: parseSplit,
    out: (v) => [
      "/** BossMod's Arena Split, in yalms from the arena's center: the center of each platform (west",
      "    and east), its half width and half length, the x of each side portal line (Majestic",
      "    Meteorain), and how far from its portal a tether counts as stretched (BossMod's estimate). */",
      `export const BOSSMOD_SPLIT = ${ts(v)} as const;`,
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
    "    its name, and its ability ids. */",
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
    "/** Half the width of BossMod's square arena, in yalms. */",
    `export const BOSSMOD_ARENA_HALF = ${bossmod.arenaHalf};`,
    "",
    ...Object.entries(extras).flatMap(([name, v]) => EXTRAS[name].out(v)),
  ];
  return out.join("\n");
}

/** The second generated file's text: the triggers and the mechanic files, for the draft. */
export function generateExtra(sources, triggers, mechanics) {
  const { cactbot, bossmod } = sources;
  const extra = {
    _generated: "By npm run import:sources (scripts/import-sources.mjs). Do not edit it by hand.",
    pins: { cactbot: cactbot.commit, bossmod: bossmod.commit },
    triggers: { file: `https://github.com/${cactbot.repo}/blob/${cactbot.commit}/${cactbot.triggers}`, list: triggers },
    mechanics,
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
  const triggers = parseTriggers(await get(s.cactbot.repo, s.cactbot.triggers));
  const { folder, mechanics: files = [] } = s.bossmod.module;
  const name = moduleName(folder);
  const bossmod = {
    name,
    folder,
    ...parseBossmod(await get(s.bossmod.repo, `${folder}/${name}Enums.cs`), await get(s.bossmod.repo, `${folder}/${name}.cs`)),
  };
  const mechanics = [];
  for (const file of files) mechanics.push({ file, classes: parseMechanics(await get(s.bossmod.repo, `${folder}/${file}`)) });
  const extras = {};
  for (const [extra, file] of Object.entries(s.extras ?? {}))
    extras[extra] = EXTRAS[extra].parse(await get(s.bossmod.repo, `${folder}/${file}`));
  return {
    [join(FIGHTS, fight, "source.gen.ts")]: generate(s, lines, bossmod, extras),
    [join(FIGHTS, fight, "sources.extra.gen.json")]: generateExtra(s, triggers, mechanics),
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
