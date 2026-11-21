import { WRAP } from "@/lib/layout";
import { ShareButton } from "./ShareButton";
import { SlotSwitch } from "./SlotSwitch";
import { TabNav } from "./TabNav";

/** The header at the top of every screen: the name and the strats on the left; Share and the slot
    switch on the right; the tabs under them.
    When the window narrows, Group wraps under Role, still on the right. On a phone (640 px and
    below) the line under the name takes the full width, and the slot switch gets its own row. */
export function Header() {
  return (
    // .rx turns on the small reset for React parts (app.css).
    <header className="rx sticky top-[env(safe-area-inset-top,0px)] z-[6] border-b border-line bg-card max-[641px]:static">
      <div className={WRAP}>
        {/* TS note: className takes the classes, as in React. Tailwind classes such as "pt-3" each
            set one style. "max-[641px]:static" applies only below 641 px, so at 640 px and narrower. */}
        <div className="grid grid-cols-[minmax(min-content,1fr)_fit-content(60%)] items-start gap-x-5 gap-y-1.5 pt-3 pb-1 max-[641px]:items-center max-[641px]:gap-x-3 max-[641px]:gap-y-2">
          <h1 className="col-start-1 row-start-1 m-0 font-display text-[32px] leading-none font-bold tracking-[.03em] whitespace-nowrap uppercase max-[641px]:text-[28px]">
            FFXIV <span className="text-heal">Raid</span> Drills
          </h1>
          {/* The line breaks between its items, never inside one. */}
          <p className="col-start-1 row-start-2 mt-[5px] mb-0 min-w-0 font-mono text-[11.5px] tracking-[.02em] text-ink-2 max-[641px]:col-span-full max-[641px]:m-0 [&>span]:whitespace-nowrap">
            <span>
              <strong className="font-medium text-heal">M11S</strong> &middot;
            </span>{" "}
            <span>The Tyrant (Savage) &middot;</span> <span>Hector/Toxic &middot;</span> <span>Kindred No Buddies split &middot;</span>{" "}
            <span>Fixed (3CJ) Ecliptic</span>
          </p>
          <ShareButton className="col-start-2 row-start-1 justify-self-end" />
          <SlotSwitch className="col-start-2 row-start-2 max-[641px]:col-span-full max-[641px]:row-start-3" />
        </div>
        <TabNav />
      </div>
    </header>
  );
}
