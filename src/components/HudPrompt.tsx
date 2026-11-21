import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export interface HudPromptProps {
  /** The step count, such as "2/4". */
  count: string;
  /** The question or the answer to read. */
  text: string;
  /** An optional button on the right. */
  children?: ReactNode;
}

/** The prompt row above the arena: the step count, the text to read, and an optional button. */
export function HudPrompt({ count, text, children }: HudPromptProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <Badge variant="secondary" className="font-mono tabular-nums">
        {count}
      </Badge>
      <p className="flex-1 text-sm font-medium" aria-live="polite">
        {text}
      </p>
      {children}
    </div>
  );
}
