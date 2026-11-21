import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { TABS } from "../tabs";

export interface TabNavProps {
  className?: string;
}

/** The tabs under the header. Each is a link to its tab. NavLink marks the one you are on with
    aria-current="page". On a narrow screen the strip scrolls sideways. */
export function TabNav({ className }: TabNavProps) {
  return (
    <nav aria-label="Tabs" className={cn("-mb-px flex gap-4 overflow-x-auto", className)}>
      {TABS.map((t) => (
        <NavLink
          key={t.path}
          to={t.path}
          className="shrink-0 border-b-2 border-transparent py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
