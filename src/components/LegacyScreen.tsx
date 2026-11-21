import { useLayoutEffect } from "react";
import { useLocation } from "react-router";
import { parseRoute } from "../router";
import { hideLegacy, showLegacy } from "../views/legacy";

/** Shows an old screen (Home, Learn, Practice, Timeline, Pressure) for the address. The old screen
    draws itself into <main id="view">, outside React, so this component draws nothing. */
export function LegacyScreen() {
  const { pathname, search } = useLocation();
  // TS note: useLayoutEffect runs before the browser paints, so the old screen shows and hides in
  // the same frame as the React page. A plain useEffect runs after the paint, and for one frame
  // both would show.
  useLayoutEffect(() => {
    showLegacy(parseRoute(pathname + search));
  }, [pathname, search]);
  // When a React page takes over, hide the old screen.
  useLayoutEffect(() => {
    return () => hideLegacy();
  }, []);
  return null;
}
