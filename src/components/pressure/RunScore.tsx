import { Fragment } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
import type { Fight } from "../../data/fights/m11s/fight";
import type { StepResult } from "../../types";
import { Tally } from "../Tally";

export interface RunScoreProps {
  fight: Fight;
  /** One list of answers per mechanic. */
  results: readonly (readonly StepResult[])[];
  /** True after Quit: the score so far. */
  stopped: boolean;
  onAgain: () => void;
  /** Watch the correct moves for this same fight. */
  onWatch: () => void;
}

/** After the run: your score, and each mechanic with an incorrect or missed spot, with a link to
    practice it on its own. */
export function RunScore({ fight, results, stopped, onAgain, onWatch }: RunScoreProps) {
  const all = results.flat();
  const correct = all.filter((x) => x.ok).length;
  const slow = all.filter((x) => x.missed).length;
  const incorrect = all.length - correct - slow;
  const misses = fight.segs.filter((_g, si) => results[si].some((x) => !x.ok));
  // After Quit: how far you got, counted in mechanics you answered at least once.
  const reached = results.filter((x) => x.length).length;
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardDescription>Full fight · {stopped ? `Stopped at mechanic ${reached} of ${fight.segs.length}` : "Done"}</CardDescription>
        <CardTitle className="font-display text-2xl tracking-wide">
          {correct} of {all.length} spots correct
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tally correct={correct} incorrect={incorrect} missed={slow} missedLabel="Too slow" />
        {misses.length ? (
          <section aria-labelledby="practice-these" className="space-y-2">
            <h3 id="practice-these" className="font-semibold">
              Practice These
            </h3>
            <ItemGroup aria-labelledby="practice-these" className="rounded-lg border">
              {misses.map((g, i) => (
                <Fragment key={g.title}>
                  {i > 0 && <ItemSeparator />}
                  <Item size="sm" role="listitem">
                    <ItemContent>
                      <ItemTitle>{g.title}</ItemTitle>
                    </ItemContent>
                    {g.drills[0] && (
                      <ItemActions>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/practice/${g.drills[0]}`}>Practice It</Link>
                        </Button>
                      </ItemActions>
                    )}
                  </Item>
                </Fragment>
              ))}
            </ItemGroup>
          </section>
        ) : (
          <p className="text-sm">
            {stopped ? "Every spot correct so far." : "Every spot correct. Each run gets a new pattern, so run it again."}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button onClick={onAgain}>Run Again</Button>
          <Button variant="outline" onClick={onWatch}>
            Watch the Correct Moves
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
