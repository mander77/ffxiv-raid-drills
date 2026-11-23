import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { TABS } from "../tabs";

export interface TabNavProps {
  className?: string;
}

/** The tabs along the bottom of the header band. Each is a link to its tab. NavLink marks the one
    you are on with aria-current="page", and it shows as a celery tab joined to the celery line
    under the header. On a phone the six tabs sit in two rows of three, so every tab is in view. */
export function TabNav({ className }: TabNavProps) {
  return (
    <nav aria-label="Tabs" className={cn("grid grid-cols-3 gap-1 sm:flex", className)}>
      {TABS.map((t) => (
        <NavLink
          key={t.path}
          to={t.path}
          className="shrink-0 rounded-t-md px-3 py-1.5 text-center font-display text-base tracking-wide whitespace-nowrap hover:bg-white/10 aria-[current=page]:bg-highlight aria-[current=page]:text-highlight-foreground max-sm:rounded-md"
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
