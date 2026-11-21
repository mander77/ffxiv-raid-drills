// The Learn page (/mech/<card>): what each mechanic does, and what you do in it. Each card has an
// arena picture; you pick an answer to see it on the picture, then lock it in.
import { PageContainer } from "../components/PageContainer";
import { type ChipGroup, QuizDeck } from "../components/quiz/QuizDeck";
import { MECH, MECH_GROUPS } from "../data/questions";
import { tabOf } from "../tabs";

/** The Learn cards, in fight order. */
const CARDS = [...MECH].sort((a, b) => a.order - b.order);

/** One chip per mechanic, with its cards in fight order. */
const CHIPS: ChipGroup[] = MECH_GROUPS.map((g) => ({
  name: g.name,
  ids: CARDS.filter((c) => g.ids.includes(c.id)).map((c) => c.id),
})).filter((g) => g.ids.length > 0);

export function LearnPage() {
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/mech")?.lede}</p>
        <QuizDeck tab="mech" items={CARDS} chips={CHIPS} chipLabel="Go to a mechanic" previewAnswers />
      </PageContainer>
    </main>
  );
}
