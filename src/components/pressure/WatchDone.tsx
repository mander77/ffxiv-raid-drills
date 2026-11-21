import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface WatchDoneProps {
  /** What the fight had: its weapon orders and other picks. */
  summary: string;
  /** Run this same fight. */
  onRun: () => void;
  onWatch: () => void;
}

/** After Watch the right moves: run the same fight, or watch it again. */
export function WatchDone({ summary, onRun, onWatch }: WatchDoneProps) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardDescription>The right moves · Done</CardDescription>
        <CardTitle className="font-display text-2xl tracking-wide">That was the right way through</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{summary}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onRun}>Run this fight</Button>
          <Button variant="outline" onClick={onWatch}>
            Watch again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
