export interface StepChipsProps {
  /** How many steps the mechanic has. */
  count: number;
  /** The steps answered so far, in order. The step after them is the one you are on. */
  results: readonly {ok: boolean}[];
}

/** One chip per step of a mechanic. An answered step shows a tick or a cross; the step you are on
    has a dark edge. */
export function StepChips({count, results}: StepChipsProps) {
  const now = results.length;
  // TS note: Array.from({length: n}, fn) makes an array of n items from fn(_, index), like
  // Enumerable.Range(0, n).Select(...) in C#.
  return <ol class="chips" aria-label="Steps">{Array.from({length:count}, (_x, i) => {
    const r = results[i];
    const cls = r ? "chip " + (r.ok ? "ok" : "bad") : "chip" + (i === now ? " now" : "");
    return <li key={i}><span class={cls}>{i + 1}{r ? (r.ok ? " ✓" : " ✗") : ""}</span></li>;
  })}</ol>;
}
