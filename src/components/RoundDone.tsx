import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface RoundDoneProps {
  correct: number;
  done: number;
  onAgain: () => void;
}

/** The end of a round on Learn, Timeline or Practice: how many you answered correctly, and Go again. */
export function RoundDone({ correct, done, onAgain }: RoundDoneProps) {
  const pct = done ? Math.round((100 * correct) / done) : 0;
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardDescription>Round done</CardDescription>
        <CardTitle className="font-display text-2xl tracking-wide">
          {correct} of {done} correct ({pct}%)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Your progress stays in this browser.</p>
        <Button onClick={onAgain}>Go Again</Button>
      </CardContent>
    </Card>
  );
}
