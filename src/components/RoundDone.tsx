import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface RoundDoneProps {
  right: number;
  done: number;
  onAgain: () => void;
}

/** The end of a round on Learn, Timeline or Practice: how many you got right, and Go again. */
export function RoundDone({ right, done, onAgain }: RoundDoneProps) {
  const pct = done ? Math.round((100 * right) / done) : 0;
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardDescription>Round done</CardDescription>
        <CardTitle className="text-2xl">
          {right} of {done} right ({pct}%)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Your progress stays in this browser.</p>
        <Button onClick={onAgain}>Go again</Button>
      </CardContent>
    </Card>
  );
}
