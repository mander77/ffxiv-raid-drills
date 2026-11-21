export interface RuleBoxProps {
  text: string;
}

/** The rule of a mechanic: why the right spot is right. */
export function RuleBox({text}: RuleBoxProps) {
  // TS note: text in JSX is escaped for you, so a "<" in the rule shows as a "<". The screens that
  // build HTML as text call esc() for this by hand.
  return <div class="rule"><span>Rule</span><strong>{text}</strong></div>;
}
