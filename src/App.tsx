// The app: the header, then the page for the address. React Router picks the page.
// Each rebuild step adds its page here. Any other address opens the Cheat sheet for now.
import { Navigate, Route, Routes } from "react-router";
import { Header } from "./components/Header";
import { TooltipProvider } from "./components/ui/tooltip";
import { useScrollToTopOnNewTab } from "./hooks/useScrollToTopOnNewTab";
import { CheatSheetPage } from "./pages/CheatSheetPage";

export function App() {
  useScrollToTopOnNewTab();
  return (
    // One provider for every tooltip on the page, as shadcn/ui asks.
    <TooltipProvider>
      <Header />
      <Routes>
        <Route path="/sheet" element={<CheatSheetPage />} />
        <Route path="*" element={<Navigate to="/sheet" replace />} />
      </Routes>
    </TooltipProvider>
  );
}
