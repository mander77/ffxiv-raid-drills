import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CorrectAnswerIcon, IncorrectAnswerIcon } from "./icons";

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
      {ok ? <CorrectAnswerIcon aria-hidden="true" /> : <IncorrectAnswerIcon aria-hidden="true" />}
      <AlertTitle>{ok ? "Correct" : "Not there"}</AlertTitle>
      <AlertDescription>
        <p>
          <span className="font-medium">{question}</span> {answer}
        </p>
      </AlertDescription>
    </Alert>
  );
}
