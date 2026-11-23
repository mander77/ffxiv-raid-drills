import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CorrectIcon, IncorrectIcon } from "./icons";

/** What the bar shows: the question to answer, or how the answer went. */
export type PromptTone = "ask" | "correct" | "incorrect";

export interface PromptBarProps {
  /** "ask" while the question is open; "correct" (green, a check mark) or "incorrect" (red, a
      cross) after the answer. */
  tone?: PromptTone;
  /** The step count, such as "2/4", while the question is open. */
  count?: string;
  /** The text: the question, or how the answer went. */
  children: ReactNode;
  /** The buttons on the right: Lock in, Show me, Next, Reset. */
  actions?: ReactNode;
  className?: string;
}

/** The prompt bar, the same on every tab that asks something (Learn, Timeline, Pressure's quick
    round, Practice): the question, its count and the buttons that go on, in one place. After the
    answer it turns green or red and says how it went, where the eye already is, and glows once.
    On a narrow screen put it in a StickyBar, so it stays in view while the page scrolls. */
export function PromptBar({ tone = "ask", count, children, actions, className }: PromptBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2",
        tone === "ask" && "bg-card",
        tone === "correct" && "border-success-foreground bg-success",
        tone === "incorrect" && "border-danger-foreground bg-danger",
        tone !== "ask" && "motion-safe:animate-attention",
        className,
      )}
    >
      {tone === "correct" ? (
        <CorrectIcon aria-hidden="true" className="shrink-0 text-success-foreground" />
      ) : tone === "incorrect" ? (
        <IncorrectIcon aria-hidden="true" className="shrink-0 text-danger-foreground" />
      ) : (
        count && (
          <Badge variant="secondary" className="font-mono tabular-nums">
            {count}
          </Badge>
        )
      )}
      <div className="min-w-0 flex-1 text-sm" aria-live="polite">
        {children}
      </div>
      {actions}
    </div>
  );
}
