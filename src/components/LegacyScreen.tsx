import { useEffect } from "react";
import { useLocation } from "react-router";
import { parseRoute } from "../router";
import { hideLegacy, showLegacy } from "../views/legacy";

/** Shows an old screen (Home, Learn, Practice, Timeline, Pressure) for the address. The old screen
    draws itself into <main id="view">, outside React, so this component draws nothing. */
export function LegacyScreen() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    showLegacy(parseRoute(pathname + search));
  }, [pathname, search]);
  // When a React screen takes over, hide the old one.
  useEffect(() => hideLegacy, []);
  return null;
}
