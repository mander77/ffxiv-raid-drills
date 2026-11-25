import { Link } from "react-router";
import { PageContainer } from "./PageContainer";

/** The pages that are not tabs, which the footer links to. */
const LINKS = [{ to: "/styles", label: "Styles" }] as const;

/** The bottom of every page: the site's name, what it is for, that it is not official, and links
    to the pages that are not tabs, such as the styles page. A shared link often opens a tab, not
    Home, so the footer says what the site is for too. It stays quiet, so the page above it keeps
    the focus. */
export function Footer() {
  return (
    <footer className="mt-12 border-t">
      <PageContainer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-sm text-muted-foreground">
        <div className="space-y-1">
          <p className="text-foreground">FFXIV Raid Drills</p>
          <p>Practice fights you already studied, without being in the game.</p>
          <p>A fan site. Not affiliated with Square Enix.</p>
        </div>
        <nav aria-label="More pages">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="underline-offset-4 hover:text-foreground hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PageContainer>
    </footer>
  );
}
