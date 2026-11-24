// The lookups of the Cheat Sheet's reference (a fight's `reference`): the cards and drills an
// entry names, the answer for your slot, and the entries by phase.
import type { FightData } from "../data/fights/types";
import type { Drill, QuizItem, ReferenceEntry, Slot } from "../types";

/** The Learn card with this id. It throws for an id that is not a card, which the tests catch. */
export function learnCard(fight: FightData, id: string): QuizItem {
  const card = fight.learnCards.find((c) => c.id === id);
  if (!card) throw new Error(`No Learn card ${id}`);
  return card;
}

/** The Practice drill with this id. It throws for an id that is not a drill. */
export function practiceDrill(fight: FightData, id: string): Drill {
  const drill = fight.drills.find((m) => m.id === id);
  if (!drill) throw new Error(`No drill ${id}`);
  return drill;
}

/** The Timeline card with this id. It throws for an id that is not a card. */
export function timelineCard(fight: FightData, id: string): QuizItem {
  const card = fight.timelineCards.find((c) => c.id === id);
  if (!card) throw new Error(`No Timeline card ${id}`);
  return card;
}

/** The correct answer of a Learn card for your slot, when it is not the same for the other slot.
    Otherwise undefined: the card's rule already says it for everyone. */
export function slotAnswer(fight: FightData, id: string, slot: Slot): string | undefined {
  const answerFor = (s: Slot): string | undefined =>
    learnCard(fight, id)
      .build(s)
      .options.find((o) => o.ok)?.t;
  const mine = answerFor(slot);
  return mine !== answerFor(slot === "H1" ? "H2" : "H1") ? mine : undefined;
}

/** The phases in fight order, each with its entries. */
export function referenceByPhase(fight: FightData): Array<{ phase: QuizItem["phase"]; entries: ReferenceEntry[] }> {
  const out: Array<{ phase: QuizItem["phase"]; entries: ReferenceEntry[] }> = [];
  for (const e of fight.reference) {
    const phase = learnCard(fight, e.picture).phase;
    const last = out.at(-1);
    if (last?.phase === phase) last.entries.push(e);
    else out.push({ phase, entries: [e] });
  }
  return out;
}
