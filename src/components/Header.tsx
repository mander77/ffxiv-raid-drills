import { WRAP } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { ShareButton } from "./ShareButton";
import { SlotSwitch } from "./SlotSwitch";
import { TabNav } from "./TabNav";

/** The header at the top of every page: the name and the strats on the left; Share in the top right
    corner with the slot switch under it; the tabs below. On a phone the slot switch gets its own row. */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className={cn(WRAP, "grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 pt-3")}>
        <h1 className="text-xl font-semibold tracking-tight">FFXIV Raid Drills</h1>
        <ShareButton className="justify-self-end" />
        {/* The line breaks between its items, never inside one. */}
        <p className="text-sm text-muted-foreground max-sm:col-span-2 [&>span]:whitespace-nowrap">
          <span>M11S ·</span> <span>The Tyrant (Savage) ·</span> <span>Hector/Toxic ·</span> <span>Kindred No Buddies split ·</span>{" "}
          <span>Fixed (3CJ) Ecliptic</span>
        </p>
        <SlotSwitch className="justify-self-end max-sm:col-span-2 max-sm:justify-self-stretch" />
        <TabNav className="col-span-2" />
      </div>
    </header>
  );
}
