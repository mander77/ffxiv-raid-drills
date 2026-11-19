import { test, assert } from "vitest";
import { MECH } from "../src/data/questions";
import { MECH_FIGS } from "../src/data/figs";
import { figSVG } from "../src/arena";
import type { Slot } from "../src/types";

const SLOTS: Slot[] = ["H1", "H2"];

test("every Mechanics question has an arena picture for both slots", () => {
  for(const item of MECH){
    const make = MECH_FIGS[item.id];
    if(!make) throw new Error(item.id + " has no picture");
    for(const s of SLOTS){
      const f = make(s), before = figSVG(f, false, ""), after = figSVG(f, true, "");
      assert.include(before, "<svg", item.id);
      assert.notInclude(before, 'class="zone ok"', item.id + ": the answer shows before you answer");
      if(f.answer?.length) assert.include(after, 'class="zone ok"', item.id + ": the answer does not show after you answer");
    }
  }
});

test("every picture belongs to a Mechanics question", () => {
  const ids = new Set(MECH.map(m => m.id));
  for(const id of Object.keys(MECH_FIGS)) assert.ok(ids.has(id), id + " is not a Mechanics question");
});

test("the pictures are the same every time, so the answer cannot move after you pick", () => {
  for(const item of MECH) for(const s of SLOTS){
    const make = MECH_FIGS[item.id];
    if(make) assert.equal(figSVG(make(s), true, ""), figSVG(make(s), true, ""), item.id);
  }
});
