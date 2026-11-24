import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { useFightLink } from "../hooks/useFight";
import { TABS } from "../tabs";

export interface TabNavProps {
  className?: string;
}

/** The tabs along the bottom of the header band. Each is a link to its tab. NavLink marks the one
    you are on with aria-current="page", and it shows as a celery tab joined to the celery line
    under the header. Below lg, TabMenu takes its place. */
export function TabNav({ className }: TabNavProps) {
  const link = useFightLink();
  return (
    <nav aria-label="Tabs" className={cn("flex gap-1", className)}>
      {TABS.map((t) => (
        <NavLink
          key={t.path}
          to={link(t.path)}
          // Home's address starts every other page's, so it is current only on its own.
          end={t.path === "/"}
          className="shrink-0 rounded-t-md px-3 py-1.5 font-display text-base tracking-wide whitespace-nowrap hover:bg-white/10 aria-[current=page]:bg-highlight aria-[current=page]:text-highlight-foreground"
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
