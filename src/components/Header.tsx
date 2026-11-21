import { ModeToggle } from "./ModeToggle";
import { PageContainer } from "./PageContainer";
import { ShareButton } from "./ShareButton";
import { SlotSwitch } from "./SlotSwitch";
import { TabNav } from "./TabNav";

/** The fight and the strats the positions follow, as tags under the site name. */
const STRATS = ["M11S The Tyrant (Savage)", "Hector/Toxic", "Kindred No Buddies split", "Fixed (3CJ) Ecliptic"];

/** The header at the top of every page, a slate band: the name and the strats on the left; the
    light/dark switch and Share in the top right corner, with the slot switch under them; the tabs
    along the bottom, the one you are on in celery. On a phone the slot switch gets its own row. */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b-3 border-highlight bg-header text-header-foreground">
      <PageContainer className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 pt-3">
        <h1 className="flex items-center gap-2 font-display text-2xl tracking-wide">
          <TitleIcon />
          FFXIV Raid Drills
        </h1>
        <div className="flex items-center justify-self-end">
          <ModeToggle className="hover:bg-white/10 hover:text-header-foreground" />
          <ShareButton className="hover:bg-white/10 hover:text-header-foreground" />
        </div>
        <ul aria-label="Fight and strats" className="flex flex-wrap gap-1.5 max-sm:col-span-2">
          {STRATS.map((s) => (
            // A darker fill on the band, so the text reads at 7:1.
            <li key={s} className="rounded-full bg-black/25 px-2.5 py-0.5 text-sm font-medium whitespace-nowrap">
              {s}
            </li>
          ))}
        </ul>
        <SlotSwitch className="justify-self-end max-sm:col-span-2 max-sm:justify-self-stretch" />
        <TabNav className="col-span-2" />
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
      <rect width="32" height="32" rx="7" fill="#f8f2e6" />
      <path d="M9.28 24.22 A9.5 9.5 0 1 1 22.72 24.22" fill="none" stroke="#c2362b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.4 17.5 H8.4 M23.6 17.5 H27.6" stroke="#c2362b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 3 L21 9.6 H11 Z" fill="#c2362b" />
      <circle cx="16" cy="17.5" r="3.8" fill="#5b1a12" />
    </svg>
  );
}
