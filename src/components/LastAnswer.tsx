import { CircleCheck, CircleX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface LastAnswerProps {
  /** True when the spot was correct. */
  ok: boolean;
  /** The step's question. */
  question: string;
  /** The step's correct answer. */
  answer: string;
}

/** The answer to the step before: correct or not, its question, and the correct answer. */
export function LastAnswer({ ok, question, answer }: LastAnswerProps) {
  return (
    <Alert variant={ok ? "default" : "destructive"}>
      {ok ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
      <AlertTitle>{ok ? "Correct" : "Not there"}</AlertTitle>
      <AlertDescription>
        <p>
          <span className="font-medium">{question}</span> {answer}
        </p>
      </AlertDescription>
    </Alert>
  );
}
