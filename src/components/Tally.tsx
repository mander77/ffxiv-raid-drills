export interface TallyProps {
  right: number;
  wrong: number;
  missed: number;
  /** The name of the third box: "Froze" in the quick round, "Too slow" in the run. */
  missedLabel: string;
}

/** The count at the end of a round: right, wrong, and the ones you missed. */
export function Tally({right, wrong, missed, missedLabel}: TallyProps) {
  return <div class="tally">
    <div class="ok"><span>Right</span><div class="big">{right}</div></div>
    <div class="bad"><span>Wrong</span><div class="big">{wrong}</div></div>
    <div class="slow"><span>{missedLabel}</span><div class="big">{missed}</div></div>
  </div>;
}
