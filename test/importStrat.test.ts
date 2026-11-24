// The strat import (scripts/import-strat.mjs): reading a wtfdig chunk without running it, picking
// the strats an address names, and the committed notes of M11S.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assert, test } from "vitest";
// @ts-expect-error: a plain Node.js script with no type declarations.
import { chunkValues, findStrats, imagesOf, notesOf, parseAddress, pick } from "../scripts/import-strat.mjs";

/** A small chunk in wtfdig's shape: a toggle (the Arena Split), two strats and a drawing call. */
const CHUNK = [
  "import{t as t}from'./x.js';",
  "var d={toxic:[{mechanic:`Split`,description:`G1 West\nG2 East`,imageUrl:`./m11s/toxic-split.webp`}],",
  "hector:[{mechanic:`Split`,description:`Tanks North`,imageUrl:`./m11s/hector-split.webp`}]},",
  "v=[{stratName:`hector`,description:`Hector`,stratUrl:{Video:`https://example.com/v`},strats:[",
  "{phaseName:`Raw Steel`,mechs:[{mechanic:`Axe`,description:`Party spread`,strats:[",
  "{role:`Healer`,party:1,description:`SSW far`,imageUrl:`./m11s/axe.webp`,mask:t(41.1,84.8,7.5)}]}]},",
  "{phaseName:`Void`,description:`Bait clockwise`,imageUrl:`./m11s/void.webp`,url:`https://example.com/6`},",
  "{phaseName:`Arena Split`,tag:`arenasplit`,mechs:d}]},{stratName:`toxic`,strats:[]}],",
  "y={fightKey:`m11s`,title:`AAC Heavyweight M3 (Savage)`,abbreviatedTitle:`M11S`,subtitle:`M11S Patch 7.4`,",
  "strats:{hector:{label:`Hector (Toxic)`,defaults:{arenasplit:`hector`}}},",
  "toggles:[{key:`arenasplit`,label:`Arena Split`,defaultValue:`toxic`,options:[{value:`toxic`,label:`Toxic`},{value:`hector`,label:`Hector No Buddies`}]}],",
  "defaultStratName:`hector`};export{y as n,v as r};",
].join("");

test("a wtfdig address gives the tier, the fight and the choices; an empty choice is a default", () => {
  assert.deepEqual(parseAddress("https://wtfdig.info/74/m11s#hector::fixed"), {
    tier: "74",
    fight: "m11s",
    choices: ["hector", "", "fixed"],
  });
  assert.throws(() => parseAddress("https://example.com/74/m11s"));
});

test("the chunk is read as data, the toggle's option picks the mechanics, and an empty choice takes the default", () => {
  const { config, strats } = findStrats(chunkValues(CHUNK));
  assert.equal(config.fightKey, "m11s");
  const { strat, toggles } = pick(config, strats, ["hector", ""]);
  assert.equal(strat.stratName, "hector");
  assert.deepEqual(toggles, { arenasplit: { label: "Arena Split", value: "hector", name: "Hector No Buddies" } });
  const notes = notesOf("https://wtfdig.info/74/m11s#hector:", config, strat, toggles);
  assert.deepEqual(
    notes.phases.map((p: { phase: string }) => p.phase),
    ["Raw Steel", "Void", "Arena Split"],
  );
  assert.deepEqual(notes.phases[0].mechanics[0].roles[0], {
    role: "Healer",
    party: 1,
    lines: ["SSW far"],
    image: "https://wtfdig.info/74/m11s/axe.webp",
    spot: { x: 41.1, y: 84.8, r: 7.5 },
  });
  assert.deepEqual(notes.phases[1], {
    phase: "Void",
    lines: ["Bait clockwise"],
    image: "https://wtfdig.info/74/m11s/void.webp",
    source: "https://example.com/6",
    mechanics: [],
  });
  assert.deepEqual(notes.phases[2].mechanics[0].lines, ["Tanks North"], "the Hector option, not Toxic");
  assert.deepEqual(imagesOf(notes), [
    "https://wtfdig.info/74/m11s/axe.webp",
    "https://wtfdig.info/74/m11s/void.webp",
    "https://wtfdig.info/74/m11s/hector-split.webp",
  ]);
  assert.throws(() => pick(config, strats, ["hector", "nobuddies"]), /no option "nobuddies"/);
  assert.throws(() => pick(config, strats, ["usb"]), /no strat "usb"/);
});

test("M11S's notes are for the static's strats: Hector, its Arena Split, and the Fixed Ecliptic", () => {
  const notes = JSON.parse(readFileSync(join(import.meta.dirname, "..", "notes", "m11s", "strat.json"), "utf8"));
  assert.equal(notes.address, "https://wtfdig.info/74/m11s#hector::fixed");
  assert.equal(notes.strat.name, "hector");
  assert.equal(notes.toggles.arenasplit.value, "hector");
  assert.equal(notes.toggles.ecliptic.value, "fixed");
  assert.isAbove(notes.phases.length, 0);
});
