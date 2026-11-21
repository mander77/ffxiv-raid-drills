import { useContext } from "react";
import { ThemeContext, type ThemeState } from "../components/ThemeProvider";

/** The light or dark mode, and a way to change it. Use it inside ThemeProvider (App.tsx). */
export function useTheme(): ThemeState {
  const state = useContext(ThemeContext);
  if (!state) throw new Error("useTheme must be used inside ThemeProvider");
  return state;
}
