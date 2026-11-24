import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useFight, useFightLink } from "../../hooks/useFight";
import { type RoundTab, roundOf, useProgressStore } from "../../stores/progress";
import { useSlotStore } from "../../stores/slot";
import type { QuizItem } from "../../types";
import { ChipRow } from "../ChipRow";
import { NextCardIcon, PreviousCardIcon } from "../icons";
import { RoundDone } from "../RoundDone";
import { QuestionCard } from "./QuestionCard";

/** A chip over the cards: its name, and the cards it covers, by id, in fight order. */
export interface ChipGroup {
  name: string;
  ids: string[];
}

export interface QuizDeckProps {
  /** The tab, which is also the start of its address: /learn or /timeline. */
  tab: RoundTab;
  /** The cards, in fight order. */
  items: readonly QuizItem[];
  /** The chips: the mechanics on Learn, the phases on Timeline. */
  chips: readonly ChipGroup[];
  /** What the chip row is for, for screen readers. */
  chipLabel: string;
  /** Show each answer on the picture before you lock it in (Learn). */
  previewAnswers?: boolean;
}

/** A tab of question cards: one card at a time, in fight order, with Back, Next and the chips.
    The card is in the address (/learn/k-sword), so a link opens it. After the last card, the
    round ends with your score. */
export function QuizDeck({ tab, items, chips, chipLabel, previewAnswers = false }: QuizDeckProps) {
  const { card } = useParams();
  const navigate = useNavigate();
  const slot = useSlotStore((s) => s.slot);
  const fight = useFight().id;
  const inFight = useFightLink();
  const round = useProgressStore((s) => roundOf(s, fight, tab));
  const record = useProgressStore((s) => s.record);
  const visit = useProgressStore((s) => s.visit);
  const newRound = useProgressStore((s) => s.newRound);
  const finish = useProgressStore((s) => s.finish);

  const i = items.findIndex((it) => it.id === card);
  const item = i >= 0 ? items[i] : undefined;

  // Remember the card, so the tab opens on it again.
  useEffect(() => {
    if (item) visit(fight, tab, item.id);
  }, [item, fight, tab, visit]);

  const link = (id: string): string => inFight(`/${tab}/${id}`);

  // /learn with no card: the round is done, or it opens on the card you were on, or the first one.
  if (card === undefined) {
    if (round.finished) {
      const mine = round.slot === slot;
      return (
        <RoundDone
          correct={mine ? round.correct : 0}
          done={mine ? round.done : 0}
          onAgain={() => {
            newRound(fight, tab);
            navigate(link(items[0].id));
          }}
        />
      );
    }
    return <Navigate to={link(round.current ?? items[0].id)} replace />;
  }
  // A card that does not exist: start from the first.
  if (!item) return <Navigate to={link(items[0].id)} replace />;

  function goNext(): void {
    if (i < items.length - 1) navigate(link(items[i + 1].id));
    else {
      finish(fight, tab);
      navigate(inFight(`/${tab}`));
    }
  }

  const top = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{item.phase}</span> · {item.time} · Card {i + 1} of {items.length}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" aria-label="Back a Card" disabled={i <= 0} onClick={() => navigate(link(items[i - 1].id))}>
            <PreviousCardIcon aria-hidden="true" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next Card"
            disabled={i >= items.length - 1}
            onClick={() => navigate(link(items[i + 1].id))}
          >
            Next
            <NextCardIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ChipRow label={chipLabel}>
        {chips.map((g) => (
          <Button
            key={g.name}
            variant={g.ids.includes(item.id) ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full"
            aria-current={g.ids.includes(item.id) ? "true" : undefined}
            onClick={() => navigate(link(g.ids[0]))}
          >
            {g.name}
          </Button>
        ))}
      </ChipRow>
    </div>
  );

  return (
    <QuestionCard
      key={`${item.id}-${slot}`}
      item={item}
      slot={slot}
      previewAnswers={previewAnswers}
      top={top}
      onAnswer={(ok) => record(fight, item.id, ok, tab, slot)}
      onNext={goNext}
    />
  );
}
