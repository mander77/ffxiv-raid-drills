// The Learn page (/learn/<card>): what each mechanic does, and what you do in it. Each card has an
// arena picture; you pick an answer to see it on the picture, then lock it in.
import { PageContainer } from "../components/PageContainer";
import { type ChipGroup, QuizDeck } from "../components/quiz/QuizDeck";
import { LEARN_CARDS, LEARN_GROUPS } from "../data/fights/m11s/questions";
import { tabOf } from "../tabs";

/** The Learn cards, in fight order. */
const CARDS = [...LEARN_CARDS].sort((a, b) => a.order - b.order);

/** One chip per mechanic, with its cards in fight order. */
const CHIPS: ChipGroup[] = LEARN_GROUPS.map((g) => ({
  name: g.name,
  ids: CARDS.filter((c) => g.ids.includes(c.id)).map((c) => c.id),
})).filter((g) => g.ids.length > 0);

export function LearnPage() {
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/learn")?.lede}</p>
        <QuizDeck tab="learn" items={CARDS} chips={CHIPS} chipLabel="Go to a Mechanic" previewAnswers />
      </PageContainer>
    </main>
  );
}
