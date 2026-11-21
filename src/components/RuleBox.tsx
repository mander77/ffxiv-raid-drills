import { Lightbulb } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface RuleBoxProps {
  /** The rule of the mechanic: why the correct spot is the one to stand in. */
  rule: string;
}

/** The rule of a mechanic, shown after the answer and with Show me. */
export function RuleBox({ rule }: RuleBoxProps) {
  return (
    <Alert>
      <Lightbulb aria-hidden="true" />
      <AlertTitle>Rule</AlertTitle>
      <AlertDescription>{rule}</AlertDescription>
    </Alert>
  );
}
