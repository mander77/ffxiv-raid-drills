// The Learn page (/learn/<card>): what each mechanic does, and what you do in it. Each card has an
// arena picture; you pick an answer to see it on the picture, then lock it in.
import { useMemo } from "react";
import { PageContainer } from "../components/PageContainer";
import { type ChipGroup, QuizDeck } from "../components/quiz/QuizDeck";
import type { FightData } from "../data/fights/types";
import { useFight } from "../hooks/useFight";
import { tabOf } from "../tabs";
import type { QuizItem } from "../types";

/** The Learn cards in fight order, and one chip per mechanic, with its cards in fight order. */
function deckOf(fight: FightData): { cards: QuizItem[]; chips: ChipGroup[] } {
  const cards = [...fight.learnCards].sort((a, b) => a.order - b.order);
  const chips = fight.learnGroups
    .map((g) => ({ name: g.name, ids: cards.filter((c) => g.ids.includes(c.id)).map((c) => c.id) }))
    .filter((g) => g.ids.length > 0);
  return { cards, chips };
}

export function LearnPage() {
  const fight = useFight();
  const { cards, chips } = useMemo(() => deckOf(fight), [fight]);
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/learn")?.lede}</p>
        <QuizDeck tab="learn" items={cards} chips={chips} chipLabel="Go to a Mechanic" previewAnswers />
      </PageContainer>
    </main>
  );
}
