import { useState } from "preact/hooks";

export interface SetupTextProps {
  text: string;
  /** True after the first answer: the text folds to two lines, with More and Less. */
  folded: boolean;
}

/** The setup text of a mechanic. It shows in full until the first answer. Then it folds to two
    lines, with More and Less to open and close it.
    Give it a `key` per mechanic (<SetupText key={id} ... />), so the next mechanic starts folded. */
export function SetupText({text, folded}: SetupTextProps) {
  // TS note: useState keeps a value between draws and gives a function to change it. A change
  // draws the component again.
  const [open, setOpen] = useState(false);
  if(!folded) return <p class="setup">{text}</p>;
  return <>
    <p class={"setup" + (open ? "" : " folded")}>{text}</p>
    <button type="button" class="linkbtn" onClick={() => setOpen(!open)}>{open ? "Less" : "More"}</button>
  </>;
}
