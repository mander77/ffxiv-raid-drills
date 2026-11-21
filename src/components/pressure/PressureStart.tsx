import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { QUICK_SIZE } from "../../lib/pressure";
import { DECIDE_SECONDS, usePressureStore } from "../../stores/pressure";

export interface PressureStartProps {
  onQuick: () => void;
  onRun: () => void;
  onWatch: () => void;
}

/** The start of Pressure: a quick round of timed questions, or the full fight on the clock. */
export function PressureStart({ onQuick, onRun, onWatch }: PressureStartProps) {
  const secs = usePressureStore((s) => s.secs);
  const setSecs = usePressureStore((s) => s.setSecs);
  const stops = usePressureStore((s) => s.stops);
  const setStops = usePressureStore((s) => s.setStops);
  const secsLabel = useId();
  const stopsId = useId();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Quick round · {QUICK_SIZE} questions</CardDescription>
          <CardTitle className="font-display text-xl tracking-wide">Timed questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">Questions from Learn and Timeline. Time to read, then a short timer to decide. Aim for zero freezes.</p>
          <div className="space-y-1.5">
            <p id={secsLabel} className="text-sm font-medium">
              Seconds to decide
            </p>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(secs)}
              aria-labelledby={secsLabel}
              onValueChange={(v) => {
                const next = DECIDE_SECONDS.find((n) => String(n) === v);
                if (next) setSecs(next);
              }}
            >
              {DECIDE_SECONDS.map((n) => (
                <ToggleGroupItem key={n} value={String(n)}>
                  {n}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <Button onClick={onQuick}>Start</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Full fight · every mechanic in order</CardDescription>
          <CardTitle className="font-display text-xl tracking-wide">The whole fight on the clock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            The run: click your spot before each hit lands. About 5 minutes, with your score at the end. Watch: the whole fight plays with
            the correct moves.
          </p>
          {/* A first run can stop at each new mechanic, so you can look before the clock runs. */}
          <div className="flex items-center gap-2">
            <Checkbox id={stopsId} checked={stops} onCheckedChange={(v) => setStops(v === true)} />
            <Label htmlFor={stopsId}>Stop at each new mechanic, so I can look first</Label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onRun}>Start the run</Button>
            <Button variant="outline" onClick={onWatch}>
              Watch the correct moves
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
