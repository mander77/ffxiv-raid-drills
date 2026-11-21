// The Timeline page (/next/<card>): which mechanic comes next in the fight. Each card shows the
// fight timeline at that moment, the way the cactbot overlay shows it.
import { PageContainer } from "../components/PageContainer";
import { type ChipGroup, QuizDeck } from "../components/quiz/QuizDeck";
import { PHASES } from "../data/abilities";
import { NEXT_ITEMS } from "../data/questions";
import { tabOf } from "../tabs";
import { sec } from "../time";

/** The Timeline cards, in fight order. */
const CARDS = [...NEXT_ITEMS].sort((a, b) => a.order - b.order);

/** When each phase starts, in seconds. */
const PHASE_STARTS = PHASES.map((p, k) => (k === 0 ? 0 : Math.min(...p.rows.map((a) => a.t))));

/** One chip per phase ("P2 · Arena Split"), with the cards that ask about a moment in it. */
const CHIPS: ChipGroup[] = PHASES.map((p, k) => ({
  name: `P${k + 1} · ${p.name.split(": ")[1] ?? p.name}`,
  ids: CARDS.filter((c) => PHASE_STARTS.reduce((at, start, x) => (sec(c.time) >= start ? x : at), 0) === k).map((c) => c.id),
})).filter((g) => g.ids.length > 0);

export function TimelinePage() {
  return (
    <main>
      <PageContainer className="space-y-6 py-6">
        <p className="text-muted-foreground">{tabOf("/next")?.lede}</p>
        <QuizDeck tab="next" items={CARDS} chips={CHIPS} chipLabel="Go to a phase" />
      </PageContainer>
    </main>
  );
}
