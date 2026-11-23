import type { Ref } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Lines } from "../types";
import { RuleIcon } from "./icons";
import { LineList } from "./LineList";

export interface RuleBoxProps {
  /** The rule of the mechanic, one short line each: why the correct spot is the one to stand in. */
  rule: Lines;
  /** The box's element, for the card to scroll it into view. */
  ref?: Ref<HTMLDivElement>;
}

/** The rule of a mechanic, shown after the answer and with Show me. It glows once when it appears,
    so the eye goes to it (not when the system asks for less motion). scroll-mt keeps it clear of
    the sticky prompt bar when it is scrolled into view. */
export function RuleBox({ rule, ref }: RuleBoxProps) {
  return (
    <Alert ref={ref} className="scroll-mt-24 motion-safe:animate-attention">
      <RuleIcon aria-hidden="true" />
      <AlertTitle>Rule</AlertTitle>
      <AlertDescription>
        <LineList lines={rule} />
      </AlertDescription>
    </Alert>
  );
}
