export interface LastAnswerProps {
  ok: boolean;
  /** The step's question. */
  q: string;
  /** The step's right answer. */
  a: string;
}

/** The answer to the step before: right or not, its question, and the right answer. */
export function LastAnswer({ok, q, a}: LastAnswerProps) {
  return <div class={"lastans " + (ok ? "ok" : "bad")}><span class="tag">{ok ? "Right" : "Not there"}</span><b>{q}</b> {a}</div>;
}
