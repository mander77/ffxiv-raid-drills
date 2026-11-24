import { Link } from "react-router";
import { FIGHT_INFO } from "../data/fights/m11s/fightInfo";
import { ModeToggle } from "./ModeToggle";
import { PageContainer } from "./PageContainer";
import { ShareButton } from "./ShareButton";
import { SlotSwitch } from "./SlotSwitch";
import { TabMenu } from "./TabMenu";
import { TabNav } from "./TabNav";

/** The fight and the strats the positions follow, as tags beside the site name. */
const STRATS = [`${FIGHT_INFO.short} ${FIGHT_INFO.full}`, ...FIGHT_INFO.strats];

/** The header at the top of every page, a slate band. On a wide screen it has two rows, so the
    page below gets more room: the name and the strats, then Light/dark and Share on the right; the
    tabs along the bottom (the one you are on in celery), with the slot switch on the right. On a
    narrower screen the tabs are one button that opens them (TabMenu), beside the slot switch when
    they fit, under it when not.
    It stays at the top of the screen only on a wide screen. On a phone it is three or four rows tall,
    so it scrolls away with the page and never covers the arena. */
export function Header() {
  return (
    <header className="border-b-3 lg:sticky lg:top-0 lg:z-10 border-highlight bg-header text-header-foreground">
      <PageContainer className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 pt-3">
        {/* The first row spans the whole width, so the strats fit beside the name. */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* The site name is a link to Home, as on most sites. */}
          <h1 className="font-display text-2xl tracking-wide">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md hover:opacity-90 focus-visible:ring-3 focus-visible:ring-highlight focus-visible:outline-none"
            >
              <TitleIcon />
              FFXIV Raid Drills
            </Link>
          </h1>
          {/* Light/dark and Share: on the name's line on a phone, at the far right on a wide screen. */}
          <div className="ml-auto flex items-center self-start lg:order-last">
            <ModeToggle className="hover:bg-white/10 hover:text-header-foreground" />
            <ShareButton className="hover:bg-white/10 hover:text-header-foreground" />
          </div>
          <ul aria-label="Fight and strats" className="flex flex-wrap gap-1.5 max-lg:basis-full">
            {STRATS.map((s) => (
              // A darker fill on the band, so the text reads at 7:1.
              <li key={s} className="rounded-full bg-black/25 px-2.5 py-0.5 text-sm font-medium whitespace-nowrap">
                {s}
              </li>
            ))}
          </ul>
        </div>
        {/* The last row: the tabs on the left, joined to the line under the header, and the slot
            switch on the right. Below lg the tabs do not fit beside the switch, so one button with
            the tab you are on opens them (TabMenu). The row wraps upward (wrap-reverse) when it
            is too narrow: the switch moves above, and the tab stays on the line. */}
        <div className="col-span-2 flex flex-wrap-reverse items-start justify-between gap-x-2 gap-y-2">
          <TabNav className="max-lg:hidden" />
          <TabMenu className="lg:hidden" />
          <SlotSwitch className="grow pb-0.5" />
        </div>
      </PageContainer>
    </header>
  );
}

/** The site's icon beside its name: the boss's target ring as on the arena, with the arrow where he
    faces, a tick on each flank and the opening at his rear. The browser tab uses a bolder version of
    it (public/favicon.svg), which reads better at 16 pixels. */
function TitleIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="oklch(0.963 0.017 84.587)" />
      <path
        d="M9.28 24.22 A9.5 9.5 0 1 1 22.72 24.22"
        fill="none"
        stroke="oklch(0.544 0.179 28.857)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M4.4 17.5 H8.4 M23.6 17.5 H27.6" stroke="oklch(0.544 0.179 28.857)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 3 L21 9.6 H11 Z" fill="oklch(0.544 0.179 28.857)" />
      <circle cx="16" cy="17.5" r="3.8" fill="oklch(0.322 0.097 30.168)" />
    </svg>
  );
}
