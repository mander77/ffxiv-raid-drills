import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { quickRound } from "../../lib/pressure";
import { usePressureStore } from "../../stores/pressure";
import { scoresOf, useProgressStore } from "../../stores/progress";
import { useSlotStore } from "../../stores/slot";
import { QuestionCard } from "../quiz/QuestionCard";
import { Tally } from "../Tally";

export interface QuickRoundProps {
  /** Back to the start of Pressure: Quit, or Change speed at the end. */
  onBack: () => void;
}

/** The counts of a quick round. */
interface Counts {
  correct: number;
  incorrect: number;
  froze: number;
}
const NO_COUNTS: Counts = { correct: 0, incorrect: 0, froze: 0 };

/** The quick round: timed cards from Learn and Timeline, the ones you miss most often first. Each
    card gives you time to read, then the seconds you chose to decide. When the time runs out, you
    froze. At the end: your counts, and Go again. */
export function QuickRound({ onBack }: QuickRoundProps) {
  const slot = useSlotStore((s) => s.slot);
  const secs = usePressureStore((s) => s.secs);
  const score = useProgressStore((s) => s.score);
  // The cards are picked once per round, when it starts.
  const [cards, setCards] = useState(() => quickRound(scoresOf(useProgressStore.getState(), slot)));
  const [i, setI] = useState(0);
  const [counts, setCounts] = useState<Counts>(NO_COUNTS);

  function again(): void {
    setCards(quickRound(scoresOf(useProgressStore.getState(), slot)));
    setI(0);
    setCounts(NO_COUNTS);
  }
  function handleAnswer(id: string, ok: boolean): void {
    score(id, ok, slot);
    setCounts((c) => (ok ? { ...c, correct: c.correct + 1 } : { ...c, incorrect: c.incorrect + 1 }));
  }
  function handleTimeout(id: string): void {
    score(id, false, slot);
    setCounts((c) => ({ ...c, froze: c.froze + 1 }));
  }

  if (i >= cards.length) {
    const msg =
      counts.froze === 0
        ? "No freezes. You made a choice every time, which is the habit you want in the fight."
        : "Each freeze is a moment you would stand still in the fight. Go again and aim for zero freezes, even if some answers are incorrect.";
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardDescription>Round done</CardDescription>
          <CardTitle className="font-display text-2xl tracking-wide">
            {counts.correct} of {cards.length} correct
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tally correct={counts.correct} incorrect={counts.incorrect} missed={counts.froze} missedLabel="Froze" />
          <p className="text-sm">{msg}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={again}>Go Again</Button>
            <Button variant="outline" onClick={onBack}>
              Change Speed
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const item = cards[i];
  return (
    <QuestionCard
      key={`${i}-${item.id}-${slot}`}
      item={item}
      slot={slot}
      decideSecs={secs}
      top={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Quick round</span> · Card {i + 1} of {cards.length}
          </p>
          {/* Quit: back to the start. Each answer so far is already in your scores. */}
          <Button variant="outline" size="sm" onClick={onBack}>
            Quit
          </Button>
        </div>
      }
      onAnswer={(ok) => handleAnswer(item.id, ok)}
      onTimeout={() => handleTimeout(item.id)}
      onNext={() => setI(i + 1)}
    />
  );
}
