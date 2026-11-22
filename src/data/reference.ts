// The reference on the Cheat sheet: every mechanic in fight order, each with one Learn picture and
// the rule lines of its Learn cards. The time and the phase come from the picture's card.

import type { QuizItem } from "../types";
import { LEARN_CARDS } from "./questions";

/** One mechanic of the reference. */
export interface ReferenceEntry {
  name: string;
  /** The Learn card whose answer picture it shows. Its time and phase are the entry's. */
  picture: string;
  /** The Learn cards whose rules it lists, in order (the picture's card among them). */
  cards: readonly string[];
}

/** Every mechanic in fight order. The tests check that each Learn card is in exactly one entry. */
export const REFERENCE: readonly ReferenceEntry[] = [
  { name: "Raw Steel Trophy", picture: "k-raw-first", cards: ["k-raw-first"] },
  { name: "Trophy Weapons", picture: "k-first-weapon", cards: ["k-first-weapon"] },
  { name: "Sword", picture: "k-sword", cards: ["k-sword"] },
  { name: "Axe", picture: "k-axe", cards: ["k-axe"] },
  { name: "Scythe", picture: "k-scythe", cards: ["k-scythe"] },
  { name: "Void Stardust", picture: "k-void", cards: ["k-void", "k-void-target", "k-void-spread"] },
  { name: "Second weapon set", picture: "k-assault-2", cards: ["k-void-sprint", "k-assault-2"] },
  { name: "Void Stardust, second time", picture: "k-void-2", cards: ["k-void-2"] },
  { name: "Dance of Domination", picture: "k-dance-pair", cards: ["k-dance", "k-dance-north", "k-dance-pair"] },
  { name: "Raw Steel Trophy, second time", picture: "k-raw-second", cards: ["k-raw-second"] },
  { name: "Charybdistopia", picture: "k-charyb", cards: ["k-charyb"] },
  { name: "Ultimate Trophy Weapons", picture: "k-ult-spawn", cards: ["k-ult-spawn"] },
  { name: "Tornadoes", picture: "k-ult-tornado", cards: ["k-ult-tornado", "k-ult-touch"] },
  { name: "Great Wall of Fire", picture: "k-gwof", cards: ["k-gwof"] },
  { name: "Orbital Omen", picture: "k-orbital-move", cards: ["k-orbital", "k-orbital-move"] },
  { name: "Meteorain", picture: "k-meteor-drop", cards: ["k-meteor-order", "k-meteor-drop", "k-meteor-stack"] },
  { name: "Triple Tyrannhilation", picture: "k-triple", cards: ["k-triple"] },
  { name: "Arena Split", picture: "k-split-side", cards: ["k-split-side"] },
  { name: "Knockback tower", picture: "k-split-kb", cards: ["k-split-kb", "k-split-fb"] },
  { name: "Markers and tethers", picture: "k-split-corner", cards: ["k-split-corner", "k-split-towers23"] },
  { name: "Massive Meteor", picture: "k-massive", cards: ["k-massive"] },
  { name: "Arcadion Avalanche", picture: "k-slab", cards: ["k-slab"] },
  { name: "Ecliptic Stampede", picture: "k-ecl-start", cards: ["k-ecl-start", "k-ecl-adjust"] },
  { name: "Ecliptic towers", picture: "k-ecl-center", cards: ["k-ecl-prio", "k-ecl-center", "k-ecl-tether"] },
  { name: "Ecliptic puddles", picture: "k-ecl-two", cards: ["k-ecl-two", "k-ecl-four"] },
  { name: "Heartbreak Kick", picture: "k-hb", cards: ["k-hb"] },
];

/** The Learn card with this id. It throws for an id that is not a card, which the tests catch. */
export function learnCard(id: string): QuizItem {
  const card = LEARN_CARDS.find((c) => c.id === id);
  if (!card) throw new Error(`No Learn card ${id}`);
  return card;
}

/** The phases in fight order, each with its entries. */
export function referenceByPhase(): Array<{ phase: string; entries: ReferenceEntry[] }> {
  const out: Array<{ phase: string; entries: ReferenceEntry[] }> = [];
  for (const e of REFERENCE) {
    const phase = learnCard(e.picture).phase;
    const last = out.at(-1);
    if (last?.phase === phase) last.entries.push(e);
    else out.push({ phase, entries: [e] });
  }
  return out;
}
