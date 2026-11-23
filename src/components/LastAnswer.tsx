import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Lines } from "../types";
import { CorrectAnswerIcon, IncorrectAnswerIcon } from "./icons";
import { LineList } from "./LineList";

export interface LastAnswerProps {
  /** True when the spot was correct. */
  ok: boolean;
  /** The step's correct move, one short line each. */
  answer: Lines;
}

/** The answer to the step before: correct or not, and the correct move as a short list. The
    question is not repeated: the prompt bar has just asked it. */
export function LastAnswer({ ok, answer }: LastAnswerProps) {
  return (
    <Alert variant={ok ? "correct" : "incorrect"}>
      {ok ? <CorrectAnswerIcon aria-hidden="true" /> : <IncorrectAnswerIcon aria-hidden="true" />}
      <AlertTitle>{ok ? "Correct" : "Not there"}</AlertTitle>
      <AlertDescription>
        <LineList lines={answer} />
      </AlertDescription>
    </Alert>
  );
}
