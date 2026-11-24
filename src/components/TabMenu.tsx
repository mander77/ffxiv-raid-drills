import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useFightLink } from "../hooks/useFight";
import { TABS, tabOf } from "../tabs";
import { TabMenuIcon } from "./icons";

export interface TabMenuProps {
  className?: string;
}

/** The tabs on a phone: one button with the tab you are on, in celery like the tab it stands for.
    It opens a sheet from the left with every tab; a tap on one goes there and closes the sheet. */
export function TabMenu({ className }: TabMenuProps) {
  const { pathname } = useLocation();
  const link = useFightLink();
  const [open, setOpen] = useState(false);
  // A page that is not a tab (the styles page) has no tab to name.
  const tab = tabOf(pathname)?.label;
  const here = tab ?? "Tabs";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={tab ? `Tabs. You are on ${tab}` : "Tabs"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-t-md bg-highlight px-2 py-1.5 font-display text-base tracking-wide text-highlight-foreground focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none",
          className,
        )}
      >
        <TabMenuIcon aria-hidden="true" className="size-5" />
        {here}
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Tabs</SheetTitle>
          <SheetDescription className="sr-only">Go to another tab.</SheetDescription>
        </SheetHeader>
        <nav aria-label="Tabs" className="flex flex-col gap-1 px-4">
          {TABS.map((t) => (
            <NavLink
              key={t.path}
              to={link(t.path)}
              // Home's address starts every other page's, so it is current only on its own.
              end={t.path === "/"}
              // Going to a tab closes the sheet; it stays out of the way of the page.
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 font-display text-lg tracking-wide hover:bg-accent aria-[current=page]:bg-highlight aria-[current=page]:text-highlight-foreground"
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
