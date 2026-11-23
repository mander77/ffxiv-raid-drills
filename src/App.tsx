// The app: the header, the page for the address, and the footer. React Router picks the page.
// Each tab has its page here, and so does the styles page, which the footer links to. Any other
// address opens Home.
import { Navigate, Route, Routes } from "react-router";
import { Footer } from "./components/Footer";
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
        {/* The footer stays at the bottom of the screen on a short page. */}
        <div className="flex min-h-dvh flex-col">
          <Header />
          <div className="flex-1">
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
          </div>
          <Footer />
        </div>
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
