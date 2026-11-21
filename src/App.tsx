// The app: the header, then the page for the address. React Router picks the page.
// The Cheat sheet is a React page. Every other address still shows an old screen (LegacyScreen).
import { Route, Routes } from "react-router";
import { Header } from "./components/Header";
import { LegacyScreen } from "./components/LegacyScreen";
import { TooltipProvider } from "./components/ui/tooltip";
import { useInAppLinks } from "./hooks/useInAppLinks";
import { useScrollToTopOnNewTab } from "./hooks/useScrollToTopOnNewTab";
import { CheatSheetPage } from "./pages/CheatSheetPage";

export function App() {
  useInAppLinks();
  useScrollToTopOnNewTab();
  return (
    // One provider for every tooltip on the page, as shadcn/ui asks.
    <TooltipProvider>
      <Header />
      <Routes>
        <Route path="/sheet" element={<CheatSheetPage />} />
        <Route path="*" element={<LegacyScreen />} />
      </Routes>
    </TooltipProvider>
  );
}
