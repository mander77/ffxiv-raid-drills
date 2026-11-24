// Imports the fight's times and attack sizes from its two sources, at pinned commits, into
// src/data/fights/m11s/source.gen.ts. The data files read every fight time and attack size from that file.
//
//   npm run import:sources            downloads the pinned files and writes the generated file
//   npm run import:sources -- --check  writes nothing; fails if the generated file is out of date
//
// The sources:
// - cactbot's timeline for the fight: every fight time. Its fight starts at 0, and each branch
//   (axe or scythe first, Comet or Crushing Comet first) runs at its own offset. The import
//   removes the offsets, so each time is seconds into the fight.
// - BossMod's module for the fight: every attack's size and shape, and the boss's hitbox.
//   The enums file lists each ability with its shape in a comment, such as "range 8 circle".
//   Its Flatliner file gives the two platforms of the Arena Split and where the side portal
//   lines (Majestic Meteorain) can fire.
//
// Downloads come only from the two official GitHub repositories, at the commits below, into
// .cache/sources/ (git ignores it). To move a pin, change the commit here, run the import, and
// review the new generated file in its own commit.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "fights", "m11s", "source.gen.ts");
const CACHE = join(ROOT, ".cache", "sources");

/** The pinned sources of M11S (The Tyrant, Savage). */
const CACTBOT = {
  repo: "OverlayPlugin/cactbot",
  commit: "96abb89fd22293744a9cdef58066a5b37520eda6",
  path: "ui/raidboss/data/07-dt/raid/r11s.txt",
};
const BOSSMOD = {
  repo: "awgil/ffxiv_bossmod",
  commit: "3004b0a7b5edd9ea8afaea69e71263c76668fff6",
  enums: "BossMod.Modules/Dawntrail/Savage/RM11STheTyrant/RM11STheTyrantEnums.cs",
  module: "BossMod.Modules/Dawntrail/Savage/RM11STheTyrant/RM11STheTyrant.cs",
  flatliner: "BossMod.Modules/Dawntrail/Savage/RM11STheTyrant/Flatliner.cs",
};

/** One file of a repository at a commit, from the cache or from GitHub. */
async function download(repo, commit, path) {
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
    cross", "range 60 width 6 rect", "range 60 90-degree cone" or "single-target". */
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
  throw new Error(`bossmod: no shape in "${text}"`);
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

/** The generated file's text. */
export function generate(lines, bossmod) {
  const out = [
    "// Generated by `npm run import:sources` (scripts/import-sources.mjs). Do not edit it by hand:",
    "// change the pins in the script and run the import again.",
    "//",
    `// cactbot: https://github.com/${CACTBOT.repo}/blob/${CACTBOT.commit}/${CACTBOT.path}`,
    `// BossMod: https://github.com/${BOSSMOD.repo}/blob/${BOSSMOD.commit}/${BOSSMOD.enums}`,
    "",
    "/** The pinned commit of each source. */",
    `export const PINS = ${ts({ cactbot: CACTBOT.commit, bossmod: BOSSMOD.commit })} as const;`,
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
    "/** BossMod's Arena Split, in yalms from the arena's center: the center of each platform (west",
    "    and east), its half width and half length, the x of each side portal line (Majestic",
    "    Meteorain), and how far from its portal a tether counts as stretched (BossMod's estimate). */",
    `export const BOSSMOD_SPLIT = ${ts(bossmod.split)} as const;`,
    "",
  ];
  return out.join("\n");
}

async function main() {
  const check = process.argv.includes("--check");
  const timeline = await download(CACTBOT.repo, CACTBOT.commit, CACTBOT.path);
  const enums = await download(BOSSMOD.repo, BOSSMOD.commit, BOSSMOD.enums);
  const module = await download(BOSSMOD.repo, BOSSMOD.commit, BOSSMOD.module);
  const flatliner = await download(BOSSMOD.repo, BOSSMOD.commit, BOSSMOD.flatliner);
  const text = generate(parseCactbot(timeline), { ...parseBossmod(enums, module), split: parseSplit(flatliner) });
  if (check) {
    const now = existsSync(OUT) ? readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
    if (now !== text) {
      console.error("src/data/fights/m11s/source.gen.ts does not match the pinned sources. Run: npm run import:sources");
      process.exit(1);
    }
    console.log("src/data/fights/m11s/source.gen.ts matches the pinned sources.");
  } else {
    writeFileSync(OUT, text);
    console.log("wrote src/data/fights/m11s/source.gen.ts");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
