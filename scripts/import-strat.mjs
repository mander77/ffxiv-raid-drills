// Imports the strat notes of one fight from wtfdig, for the strats a static uses, into
// notes/<fight>/strat.json: for each mechanic, the text for each role and light party, the image
// names, and the links to wtfdig's own sources. The draft of a new fight reads them; the site
// does not. Nothing goes into src/data/.
//
//   npm run import:strat -- "https://wtfdig.info/74/m11s#hector::fixed"
//   npm run import:strat -- "https://wtfdig.info/74/m11s#hector::fixed" --refresh   fetch the page again
//
// The address is the one wtfdig shows: the tier (74), the fight (m11s), then after "#" the strat
// and the option of each of the fight's toggles, in order. An empty part means the strat's
// default: "hector::fixed" is the Hector strat, its default Arena Split, and the Fixed Ecliptic.
//
// wtfdig draws its pages in the browser, so the strats are in its JavaScript. The script fetches
// the page, the page's route file (nodes/<n>.js), and the chunks it imports until one holds the
// fight's config. It reads that chunk with Vite's JavaScript parser and never runs wtfdig's code. Every
// download is cached in .cache/wtfdig/ (git ignores it), so a second run sends no requests;
// --refresh fetches the page and its files again. The images go into the cache too.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache", "wtfdig");
const SITE = "https://wtfdig.info";
/** The pause between two requests to wtfdig, in milliseconds, so the script stays gentle. */
const PAUSE = 400;

/** The tier, the fight and the choices in a wtfdig address. */
export function parseAddress(address) {
  const m = /^https:\/\/wtfdig\.info\/(\d+)\/([a-z0-9]+)(?:#(.*))?$/.exec(address);
  if (!m) throw new Error(`Not a wtfdig fight address: ${address} (for example https://wtfdig.info/74/m11s#hector::fixed)`);
  return { tier: m[1], fight: m[2], choices: (m[3] ?? "").split(":") };
}

let requests = 0;
/** A file from wtfdig, from the cache unless `fresh` asks for a new copy. */
async function get(url, fresh = false, binary = false) {
  const file = join(CACHE, new URL(url).pathname);
  const path = file.endsWith("/") || !/\.[a-z]+$/.test(file) ? join(file, "index.html") : file;
  if (!fresh && existsSync(path)) return binary ? readFileSync(path) : readFileSync(path, "utf8");
  if (requests++) await new Promise((r) => setTimeout(r, PAUSE));
  const res = await fetch(url, { headers: { "user-agent": "ffxiv-raid-drills strat import" } });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  return body;
}

/** The value of a piece of JavaScript that is only data: objects, arrays, text, numbers and the
    names of other top-level values. A call (wtfdig's drawing helpers) becomes { call, args }.
    `node` is a node of the parser's tree (ESTree); `names` maps a top-level name to its value's node. */
function dataOf(node, names, seen = new Set()) {
  const v = (n) => dataOf(n, names, seen);
  switch (node?.type) {
    case "Literal":
      return node.value;
    case "TemplateLiteral":
      return node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? String(v(node.expressions[i])) : "")).join("");
    case "UnaryExpression":
      return node.operator === "-" ? -v(node.argument) : node.operator === "!" ? !v(node.argument) : null;
    case "ArrayExpression":
      return node.elements.flatMap((e) => (e?.type === "SpreadElement" ? (v(e.argument) ?? []) : [e ? v(e) : null]));
    case "ObjectExpression": {
      const out = {};
      for (const p of node.properties) {
        if (p.type === "SpreadElement") Object.assign(out, v(p.argument));
        else if (!p.computed) out[p.key.type === "Identifier" ? p.key.name : p.key.value] = v(p.value);
      }
      return out;
    }
    case "Identifier": {
      const init = names.get(node.name);
      if (!init || seen.has(node.name)) return null;
      seen.add(node.name);
      const out = v(init);
      seen.delete(node.name);
      return out;
    }
    case "CallExpression":
      return { call: node.callee.type === "Identifier" ? node.callee.name : node.callee.type, args: node.arguments.map(v) };
    default:
      return null;
  }
}

/** Every top-level value in a wtfdig chunk, by its (short) name: `var a=..., b=...`. */
export function chunkValues(code) {
  const names = new Map();
  for (const st of parseAst(code).body)
    if (st.type === "VariableDeclaration")
      for (const d of st.declarations) if (d.id.type === "Identifier" && d.init) names.set(d.id.name, d.init);
  const values = new Map();
  for (const name of names.keys()) values.set(name, dataOf(names.get(name), names));
  return values;
}

/** The fight's config (with `fightKey`) and its list of strats (each with `stratName`). */
export function findStrats(values) {
  const all = [...values.values()];
  const config = all.find((x) => x && typeof x === "object" && !Array.isArray(x) && typeof x.fightKey === "string");
  const strats = all.find((x) => Array.isArray(x) && x.length && x.every((s) => s && typeof s.stratName === "string"));
  return config && strats ? { config, strats } : null;
}

/** The strat and the option of each toggle that the address's choices pick. An empty choice is
    the strat's default. */
export function pick(config, strats, choices) {
  const name = choices[0] || config.defaultStratName;
  const strat = strats.find((s) => s.stratName === name);
  if (!strat) throw new Error(`wtfdig has no strat "${name}" (it has ${strats.map((s) => s.stratName).join(", ")})`);
  const toggles = {};
  (config.toggles ?? []).forEach((t, i) => {
    const value = choices[i + 1] || config.strats?.[name]?.defaults?.[t.key] || t.defaultValue;
    const option = t.options.find((o) => o.value === value);
    if (!option) throw new Error(`wtfdig's ${t.label} has no option "${value}" (it has ${t.options.map((o) => o.value).join(", ")})`);
    toggles[t.key] = { label: t.label, value, name: option.label, ...(option.url ? { source: option.url } : {}) };
  });
  return { strat, toggles };
}

/** A mask, a ring on the image round the player's spot: its middle and radius, in percent. */
const maskOf = (m) => (m?.call && m.args.length === 3 ? { x: m.args[0], y: m.args[1], r: m.args[2] } : undefined);
/** Text in short lines, one per line of wtfdig's text. */
const lines = (text) =>
  typeof text === "string"
    ? text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

/** The notes for the picked strat: each phase and mechanic, with the text and image for each role
    and light party. A phase with a toggle (a tag) takes the mechanics of the toggle's option. */
export function notesOf(address, config, strat, toggles) {
  const { tier, fight } = parseAddress(address);
  const image = (u) => (u ? new URL(u, `${SITE}/${tier}/`).href : undefined);
  const phases = strat.strats.map((p) => {
    const mechs = Array.isArray(p.mechs) ? p.mechs : (p.mechs?.[toggles[p.tag]?.value] ?? []);
    return {
      phase: p.phaseName,
      ...(p.tag ? { toggle: p.tag, option: toggles[p.tag]?.value } : {}),
      ...(p.description ? { lines: lines(p.description) } : {}),
      ...(p.imageUrl ? { image: image(p.imageUrl) } : {}),
      ...(p.url ? { source: p.url } : {}),
      mechanics: mechs.map((m) => ({
        mechanic: m.mechanic,
        lines: lines(m.description),
        ...(m.imageUrl ? { image: image(m.imageUrl) } : {}),
        ...(m.url ? { source: m.url } : {}),
        ...(m.strats?.length
          ? {
              roles: m.strats.map((r) => ({
                role: r.role,
                party: r.party,
                lines: lines(r.description),
                ...(r.imageUrl ? { image: image(r.imageUrl) } : {}),
                ...(maskOf(r.mask) ? { spot: maskOf(r.mask) } : {}),
              })),
            }
          : {}),
      })),
    };
  });
  return {
    _generated: "By npm run import:strat (scripts/import-strat.mjs) from wtfdig. Do not edit it by hand.",
    address,
    fight: { id: fight, tier, name: config.abbreviatedTitle, title: config.title, patch: config.subtitle },
    strat: {
      name: strat.stratName,
      label: config.strats?.[strat.stratName]?.label ?? strat.description,
      ...(strat.notes ? { notes: strat.notes } : {}),
    },
    toggles,
    sources: strat.stratUrl && typeof strat.stratUrl === "object" ? strat.stratUrl : {},
    phases,
  };
}

/** Every image the notes name, once. */
export const imagesOf = (notes) => [
  ...new Set(
    notes.phases
      .flatMap((p) => [p.image, ...p.mechanics.flatMap((m) => [m.image, ...(m.roles ?? []).map((r) => r.image)])])
      .filter(Boolean),
  ),
];

async function main() {
  const args = process.argv.slice(2);
  const address = args.find((a) => !a.startsWith("--"));
  if (!address) throw new Error('Give the wtfdig address: npm run import:strat -- "https://wtfdig.info/74/m11s#hector::fixed"');
  const fresh = args.includes("--refresh");
  const { tier, fight, choices } = parseAddress(address);

  // The page, its route file, then its chunks until one holds the fight's config.
  const page = await get(`${SITE}/${tier}/${fight}`, fresh);
  const routes = [...page.matchAll(/_app\/immutable\/nodes\/(\d+)\.[\w-]+\.js/g)].filter((m) => m[1] !== "0").map((m) => m[0]);
  if (routes.length === 0) throw new Error(`${SITE}/${tier}/${fight}: no route file in the page`);
  let found = null;
  for (const route of [...new Set(routes)]) {
    const node = await get(`${SITE}/${route}`, fresh);
    for (const chunk of [...new Set([...node.matchAll(/from"\.\.\/chunks\/([\w-]+\.js)"/g)].map((m) => m[1]))]) {
      const code = await get(`${SITE}/_app/immutable/chunks/${chunk}`, fresh);
      if (!code.includes("fightKey:")) continue;
      found = findStrats(chunkValues(code));
      if (found) break;
    }
    if (found) break;
  }
  if (!found) throw new Error(`${SITE}/${tier}/${fight}: no chunk with the fight's strats`);
  if (found.config.fightKey !== fight) throw new Error(`wtfdig's chunk is for ${found.config.fightKey}, not ${fight}`);

  const { strat, toggles } = pick(found.config, found.strats, choices);
  const notes = notesOf(address, found.config, strat, toggles);
  const images = imagesOf(notes);
  for (const url of images) await get(url, false, true);

  const out = join(ROOT, "notes", fight, "strat.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(notes, null, 2)}\n`);
  const count = notes.phases.reduce((n, p) => n + p.mechanics.length, 0);
  console.log(
    `wrote notes/${fight}/strat.json: ${notes.phases.length} phases, ${count} mechanics, ${images.length} images (${requests} requests)`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
