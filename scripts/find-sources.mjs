// Finds a new fight's files in cactbot and BossMod, at their newest commits, and writes a first
// src/data/fights/<id>/sources.json for a person to check. The import (npm run import:sources)
// uses it only once that person sets "checked": true.
//
//   npm run find:sources -- m10s
//   npm run find:sources -- m10s --cactbot r10s --bossmod RM10S   name the files when the guess fails
//
// The guess: fight "m10s" is cactbot's "r10s.txt" and "r10s.ts" (any expansion folder), and the
// BossMod module folder whose name starts with "RM10S". The mechanic files are the other .cs
// files of the module folder. It reads only the two official GitHub repositories, through
// GitHub's API (their file lists).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REPOS } from "./import-sources.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** GitHub's API, as JSON. */
async function api(path) {
  const res = await fetch(`https://api.github.com/${path}`, { headers: { accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

/** The newest commit of a repository's default branch, and every file and folder path in it. */
async function newest(repo) {
  const { default_branch: branch } = await api(`repos/${repo}`);
  const { sha } = await api(`repos/${repo}/commits/${branch}`);
  const tree = await api(`repos/${repo}/git/trees/${sha}?recursive=1`);
  if (tree.truncated) throw new Error(`${repo}: GitHub sent only part of the file list`);
  return { commit: sha, paths: tree.tree.map((t) => ({ path: t.path, folder: t.type === "tree" })) };
}

/** Exactly one path that fits, or a clear error. */
function one(paths, what) {
  if (paths.length !== 1) throw new Error(`${what}: found ${paths.length} (${paths.join(", ") || "none"}). Name it with an option.`);
  return paths[0];
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const fight = args[0];
  if (!fight || fight.startsWith("--")) throw new Error("Name the fight: npm run find:sources -- m10s");
  const out = join(ROOT, "src", "data", "fights", fight, "sources.json");
  if (existsSync(out) && !args.includes("--force")) throw new Error(`${out} exists. Add --force to write it again.`);
  const cactbotName = option("cactbot") ?? fight.replace(/^m/, "r");
  const bossmodPrefix = option("bossmod") ?? `R${fight.toUpperCase()}`;

  const cactbot = await newest(REPOS.cactbot);
  const timeline = one(
    cactbot.paths
      .filter((p) => !p.folder && p.path.startsWith("ui/raidboss/data/") && p.path.endsWith(`/${cactbotName}.txt`))
      .map((p) => p.path),
    `cactbot timeline ${cactbotName}.txt`,
  );
  const triggers = timeline.replace(/\.txt$/, ".ts");
  if (!cactbot.paths.some((p) => p.path === triggers)) throw new Error(`cactbot: no triggers file ${triggers}`);

  const bossmod = await newest(REPOS.bossmod);
  const folder = one(
    bossmod.paths.filter((p) => p.folder && p.path.split("/").at(-1).startsWith(bossmodPrefix)).map((p) => p.path),
    `BossMod module folder ${bossmodPrefix}*`,
  );
  const name = folder.split("/").at(-1);
  const own = new Set([`${name}.cs`, `${name}Enums.cs`, `${name}States.cs`, `${name}Config.cs`]);
  const files = bossmod.paths.filter((p) => !p.folder && dirname(p.path) === folder).map((p) => p.path.split("/").at(-1));
  for (const need of [`${name}.cs`, `${name}Enums.cs`]) if (!files.includes(need)) throw new Error(`BossMod: no ${folder}/${need}`);
  const mechanics = files.filter((f) => f.endsWith(".cs") && !own.has(f)).sort();

  const sources = {
    fight: fight.toUpperCase(),
    checked: false,
    review: [
      "Check that the timeline, the triggers and the module folder are this fight's.",
      "Check the mechanic files: drop any that are not about a mechanic.",
      `Then set "checked": true, delete this list, and run npm run import:sources -- ${fight}`,
    ],
    cactbot: { repo: REPOS.cactbot, commit: cactbot.commit, timeline, triggers },
    bossmod: { repo: REPOS.bossmod, commit: bossmod.commit, module: { folder, mechanics } },
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(sources, null, 2)}\n`);
  console.log(`wrote ${out.slice(ROOT.length + 1)}: check it, then set "checked": true`);
}

await main();
