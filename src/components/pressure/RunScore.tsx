import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Fight } from "../../data/fight";
import type { StepResult } from "../../types";
import { Tally } from "../Tally";

export interface RunScoreProps {
  fight: Fight;
  /** One list of answers per mechanic. */
  results: readonly (readonly StepResult[])[];
  /** True after Quit: the score so far. */
  stopped: boolean;
  onAgain: () => void;
  /** Watch the right moves for this same fight. */
  onWatch: () => void;
}

/** After the run: your score, and each mechanic with a wrong or missed spot, with a link to
    practice it on its own. */
export function RunScore({ fight, results, stopped, onAgain, onWatch }: RunScoreProps) {
  const all = results.flat();
  const right = all.filter((x) => x.ok).length;
  const slow = all.filter((x) => x.missed).length;
  const wrong = all.length - right - slow;
  const misses = fight.segs.filter((_g, si) => results[si].some((x) => !x.ok));
  // After Quit: how far you got, counted in mechanics you answered at least once.
  const reached = results.filter((x) => x.length).length;
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardDescription>Full fight · {stopped ? `Stopped at mechanic ${reached} of ${fight.segs.length}` : "Done"}</CardDescription>
        <CardTitle className="text-2xl">
          {right} of {all.length} spots right
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tally right={right} wrong={wrong} missed={slow} missedLabel="Too slow" />
        {misses.length ? (
          <section aria-labelledby="practice-these" className="space-y-2">
            <h3 id="practice-these" className="font-semibold">
              Practice these
            </h3>
            <ul className="divide-y rounded-lg border">
              {misses.map((g) => (
                <li key={g.title} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{g.title}</span>
                  {g.drills[0] && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/practice/${g.drills[0]}`}>Practice it</Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm">
            {stopped ? "Every spot right so far." : "Every spot right. Each run gets a new pattern, so run it again."}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button onClick={onAgain}>Run again</Button>
          <Button variant="outline" onClick={onWatch}>
            Watch the right moves
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
