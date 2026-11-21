// The app: the header, then the page for the address. React Router picks the page.
// Each rebuild step adds its page here. Any other address opens Home.
import { Navigate, Route, Routes } from "react-router";
import { Header } from "./components/Header";
import { TooltipProvider } from "./components/ui/tooltip";
import { useScrollToTopOnNewTab } from "./hooks/useScrollToTopOnNewTab";
import { CheatSheetPage } from "./pages/CheatSheetPage";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { TimelinePage } from "./pages/TimelinePage";

export function App() {
  useScrollToTopOnNewTab();
  return (
    // One provider for every tooltip on the page, as shadcn/ui asks.
    <TooltipProvider>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* TS note: ":card?" is an optional part of the address, read with useParams(). */}
        <Route path="/mech/:card?" element={<LearnPage />} />
        <Route path="/map/:drill?/:code?" element={<PracticePage />} />
        <Route path="/next/:card?" element={<TimelinePage />} />
        <Route path="/sheet" element={<CheatSheetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TooltipProvider>
  );
}
