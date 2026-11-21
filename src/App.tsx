// The app: the header, then the screen for the address. React Router picks the screen.
// The Cheat sheet is a React screen. Every other path still shows an old screen (LegacyScreen).
import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { Header } from "./components/Header";
import { LegacyScreen } from "./components/LegacyScreen";
import { TooltipProvider } from "./components/ui/tooltip";
import { tabOf } from "./router";
import { CheatSheet } from "./screens/CheatSheet";

export function App() {
  useInAppLinks();
  useTopOnNewTab();
  return (
    // One provider for every tooltip, as shadcn/ui asks. 0 ms: a tooltip shows at once.
    <TooltipProvider delayDuration={0}>
      <Header />
      <Routes>
        <Route path="/sheet" element={<CheatSheet />} />
        <Route path="*" element={<LegacyScreen />} />
      </Routes>
    </TooltipProvider>
  );
}

/** The old screens draw plain <a href="/..."> links. Open them with React Router, without loading
    the page again. A click with a modifier key, such as Ctrl-click for a new tab, works as usual. */
function useInAppLinks(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      // A React Router <Link> has already handled its own click (defaultPrevented).
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');
      if (!a || a.target) return;
      e.preventDefault();
      navigate(a.getAttribute("href") ?? "/");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
}

/** A new tab starts at the top, also when you open it from a link low on another screen. */
function useTopOnNewTab(): void {
  const tab = tabOf(useLocation().pathname);
  // TS note: the effect runs again only when a value in the list ([tab]) changes. A move to another
  // card of the same tab keeps the scroll.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect runs on each new tab on purpose.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
}
