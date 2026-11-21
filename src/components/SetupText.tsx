import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface SetupTextProps {
  text: string;
  /** True after the first answer: the text folds to two lines, with More and Less. */
  folded: boolean;
}

/** The setup text of a mechanic. It shows in full until the first answer. Then it folds to two
    lines, with More and Less to open and close it (a shadcn/ui Collapsible).
    Give it a `key` per mechanic (<SetupText key={id} ... />), so the next mechanic starts folded. */
export function SetupText({ text, folded }: SetupTextProps) {
  // TS note: useState keeps a value between draws and gives a function to change it. A change
  // draws the component again. The type (boolean) comes from the first value.
  const [open, setOpen] = useState(false);
  if (!folded) return <p className="text-sm">{text}</p>;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Folded, the first two lines show; open, the whole text shows in the Collapsible's content. */}
      {!open && <p className="line-clamp-2 text-sm">{text}</p>}
      <CollapsibleContent>
        <p className="text-sm">{text}</p>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button variant="link" size="sm" className="h-auto px-0">
          {open ? "Less" : "More"}
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}
