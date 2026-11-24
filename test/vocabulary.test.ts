// The site's vocabulary: src/data/vocabulary.ts must say what docs/vocabulary.md says, and no
// player text may hold a word that the file's Checklist searches find.
import { readFileSync } from "node:fs";
import { assert, test } from "vitest";
import { KINDS } from "../src/components/MechanicIcon";
import { ABILITIES } from "../src/data/fights/m11s/abilities";
import { DRILLS } from "../src/data/fights/m11s/drills";
import { buildFight, CHOICE_ROWS } from "../src/data/fights/m11s/fight";
import { LEARN_PICTURES } from "../src/data/fights/m11s/pictures";
import { LEARN_CARDS, TIMELINE_CARDS } from "../src/data/fights/m11s/questions";
import { TIMELINE } from "../src/data/fights/m11s/timeline";
import { CHECKS, CONVERSIONS } from "../src/data/vocabulary";
import type { Slot } from "../src/types";
import { withSeed } from "../src/util";

const DOC = readFileSync(new URL("../docs/vocabulary.md", import.meta.url), "utf8");
const SLOTS: Slot[] = ["H1", "H2"];
/** Codes for the random parts, so each pattern's text is read. */
const CODES = ["ABCD", "QWER", "ZXCV", "TYUI", "GHJK", "BNMP"];

/** The rows of the table in the section `title` of the doc, as cells. A "|" with a "\" before it
    is part of a cell. */
function tableRows(title: string): string[][] {
  const section = DOC.split(`## ${title}`)[1]?.split("\n## ")[0] ?? "";
  return section
    .split("\n")
    .filter((l) => l.startsWith("| ") && !/^\|[-| ]+\|$/.test(l))
    .slice(1)
    .map((l) =>
      l
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((c) => c.trim()),
    );
}

test("the conversion table in the code is the one in docs/vocabulary.md", () => {
  const doc = tableRows("Conversion table").map(([from, to, when]) => ({ from: from.split(", "), to, ...(when ? { when } : {}) }));
  assert.deepEqual(CONVERSIONS, doc);
});

test("the searches in the code are the Checklist's searches in docs/vocabulary.md", () => {
  const doc = tableRows("Checklist")
    .filter((row) => row[0].startsWith("`"))
    .map(([search, means]) => ({
      searches: [...search.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\\\|/g, "|")),
      means,
    }));
  assert.deepEqual(
    CHECKS.map((c) => ({ searches: c.searches.map((r) => r.source), means: c.means })),
    doc,
  );
});

/** Every line of player text, each with where it is. */
function playerText(): [string, string][] {
  const out: [string, string][] = [];
  const add = (where: string, ...lines: string[]) => {
    for (const line of lines) out.push([where, line]);
  };
  for (const s of SLOTS)
    for (const code of CODES)
      withSeed(code, () => {
        for (const m of DRILLS) {
          add(m.id, m.title);
          for (const v of m.variants ?? [null]) {
            const sc = m.build(s, v);
            add(`${m.id} setup`, ...sc.setup);
            add(`${m.id} rule`, ...sc.rule);
            for (const st of sc.steps) add(`${m.id} step`, st.q, ...st.a);
          }
        }
        for (const c of [...LEARN_CARDS, ...TIMELINE_CARDS]) {
          const q = c.build(s);
          add(c.id, q.prompt, ...q.options.map((o) => o.t), ...q.why, ...q.rule);
          const pic = LEARN_PICTURES[c.id]?.(s);
          if (pic?.note) add(`${c.id} picture`, pic.note);
          for (const o of [...(pic?.overlays ?? []), ...(pic?.before ?? []), ...(pic?.after ?? [])])
            if (o.t === "tag") add(`${c.id} tag`, o.s);
        }
        const f = buildFight(s, code);
        add("fight", f.summary, ...f.segs.map((g) => g.title));
      });
  for (const s of SLOTS) for (const row of TIMELINE) add(`timeline ${row.t}`, row.n, ...row.job(s));
  for (const a of ABILITIES) add(`ability ${a.name}`, a.name, a.note);
  for (const k of Object.values(KINDS)) add(`kind ${k.name}`, k.name, k.meaning);
  for (const r of CHOICE_ROWS) add("settings", r.label, ...r.options.map(([, text]) => text));
  return out;
}

test("no player text has a word that the Checklist searches find", () => {
  const lines = playerText();
  assert.isAbove(new Set(lines.map(([, l]) => l)).size, 500, "the test reads the player text");
  const found = new Set<string>();
  for (const [where, line] of lines)
    for (const check of CHECKS)
      for (const search of check.searches) {
        const m = new RegExp(search.source, "g");
        for (const hit of line.matchAll(m)) {
          const before = line.slice(0, hit.index).trimEnd().split(/\s+/).pop();
          if (check.notAfter && before === check.notAfter) continue;
          found.add(`${where}: "${hit[0]}" in "${line}" (${check.means})`);
        }
      }
  assert.deepEqual([...found], []);
});
