// The Timeline page (/timeline/<card>): which mechanic comes next in the fight. Each card shows the
// fight timeline at that moment, the way the cactbot overlay shows it.
import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { type ChipGroup, QuizDeck } from "../components/quiz/QuizDeck";
import type { FightData } from "../data/fights/types";
import { useFight } from "../hooks/useFight";
import { tabOf } from "../tabs";
import { sec } from "../time";
import type { QuizItem } from "../types";

/** The Timeline cards in fight order, and one chip per phase ("P2 · Arena Split"), with the cards
    that ask about a moment in it. */
function deckOf(fight: FightData): { cards: QuizItem[]; chips: ChipGroup[] } {
  const cards = [...fight.timelineCards].sort((a, b) => a.order - b.order);
  /** When each phase starts, in seconds. */
  const starts = fight.phases.map((p, k) => (k === 0 ? 0 : Math.min(...p.rows.map((a) => a.t))));
  const chips = fight.phases
    .map((p, k) => ({
      name: `P${k + 1} · ${p.name.split(": ")[1] ?? p.name}`,
      ids: cards.filter((c) => starts.reduce((at, start, x) => (sec(c.time) >= start ? x : at), 0) === k).map((c) => c.id),
    }))
    .filter((g) => g.ids.length > 0);
  return { cards, chips };
}

export function TimelinePage() {
  const fight = useFight();
  const { cards, chips } = useMemo(() => deckOf(fight), [fight]);
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/timeline")?.lede}</p>
        <QuizDeck tab="timeline" items={cards} chips={chips} chipLabel="Go to a Phase" />
      </PageContainer>
    </main>
  );
}
