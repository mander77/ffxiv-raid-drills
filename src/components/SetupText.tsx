import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SetupTextProps {
  text: string;
  /** True after the first answer: the text folds to two lines, with More and Less. */
  folded: boolean;
}

/** The setup text of a mechanic. It shows in full until the first answer. Then it folds to two
    lines, with More and Less to open and close it.
    Give it a `key` per mechanic (<SetupText key={id} ... />), so the next mechanic starts folded. */
export function SetupText({ text, folded }: SetupTextProps) {
  const [open, setOpen] = useState(false);
  if (!folded) return <p className="text-sm">{text}</p>;
  return (
    <div>
      <p className={cn("text-sm", !open && "line-clamp-2")}>{text}</p>
      <Button variant="link" size="sm" className="h-auto px-0" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Less" : "More"}
      </Button>
    </div>
  );
}
