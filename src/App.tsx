// The app: the header, then the page for the address. React Router picks the page.
// Each tab has its page here, and so does the styles page, which no link leads to. Any other address
// opens Home.
import { Navigate, Route, Routes } from "react-router";
import { Header } from "./components/Header";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { useScrollToTopOnNewTab } from "./hooks/useScrollToTopOnNewTab";
import { useTheme } from "./hooks/useTheme";
import { CheatSheetPage } from "./pages/CheatSheetPage";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { PressurePage } from "./pages/PressurePage";
import { StylesPage } from "./pages/StylesPage";
import { TimelinePage } from "./pages/TimelinePage";

export function App() {
  useScrollToTopOnNewTab();
  return (
    // Light and dark mode. index.html sets the mode before the page draws, so it never flashes light.
    <ThemeProvider>
      {/* One provider for every tooltip on the page, as shadcn/ui asks. */}
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
          <Route path="/styles" element={<StylesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

/** The toasts, such as "Link copied", in the light or dark mode on screen. shadcn's Toaster asks
    next-themes for the mode, which this site does not use, so the mode is passed in here. */
function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} />;
}
