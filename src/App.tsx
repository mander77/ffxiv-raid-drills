// The app: the header, then the page for the address. React Router picks the page.
// Each tab has its page here. Any other address opens Home.
import { Navigate, Route, Routes } from "react-router";
import { Header } from "./components/Header";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { useScrollToTopOnNewTab } from "./hooks/useScrollToTopOnNewTab";
import { CheatSheetPage } from "./pages/CheatSheetPage";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { PressurePage } from "./pages/PressurePage";
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
        <Route path="/learn/:card?" element={<LearnPage />} />
        <Route path="/practice/:drill?/:code?" element={<PracticePage />} />
        <Route path="/timeline/:card?" element={<TimelinePage />} />
        <Route path="/pressure/:code?/:picks?" element={<PressurePage />} />
        <Route path="/sheet" element={<CheatSheetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* The toasts, such as "Link copied". The site has a light theme only. */}
      <Toaster theme="light" />
    </TooltipProvider>
  );
}
