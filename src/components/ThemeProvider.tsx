import { createContext, type ReactNode, useEffect, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

/** The modes you can pick. System follows the computer's light or dark setting. */
export type Theme = "light" | "dark" | "system";

export interface ThemeState {
  /** The mode you picked. */
  theme: Theme;
  /** The mode on screen: your pick, or the computer's setting for System. */
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

/** The light or dark mode, for useTheme (src/hooks/useTheme.ts). */
export const ThemeContext = createContext<ThemeState | null>(null);

/** Where the browser keeps your pick. index.html reads it too, before the page draws. */
const STORAGE_KEY = "raid-drills-theme";

function savedTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export interface ThemeProviderProps {
  children: ReactNode;
}

/** Light and dark mode, as in shadcn/ui's dark mode guide for Vite: it keeps your pick in the
    browser and sets the "light" or "dark" class on <html>, which the theme colours in app.css
    follow. With System, it follows the computer's setting, also when that changes. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(savedTheme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // The class sits on <html>, outside React, so an effect keeps it in step.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, [resolved]);

  function setTheme(next: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the pick lasts until the page reloads.
    }
    setThemeState(next);
  }

  return <ThemeContext value={{ theme, resolved, setTheme }}>{children}</ThemeContext>;
}
