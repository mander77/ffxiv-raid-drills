import { cn } from "@/lib/utils";
import type { Lines } from "../types";

export interface LineListProps {
  lines: Lines;
  /** True when the lines happen in order: a numbered list. Otherwise a bulleted list. */
  ordered?: boolean;
  className?: string;
}

/** Short lines of mechanic text as a list, one step or fact per line, so a player can read it at
    a glance. */
export function LineList({ lines, ordered = false, className }: LineListProps) {
  // TS note: a component name in a variable must start with a capital letter, so JSX treats
  // <List> as the "ol" or "ul" tag and not as a component called "list".
  const List = ordered ? "ol" : "ul";
  return (
    <List className={cn("space-y-0.5 pl-5", ordered ? "list-decimal" : "list-disc", className)}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </List>
  );
}
