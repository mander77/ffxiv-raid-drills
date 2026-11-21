// The tabs of the site, in the order a player learns the fight. The header and the old screens both
// read them. This file has no code that needs a page, so tests can import it.

export type QuizCat = "mech" | "next";
export type Tab = "home" | "map" | QuizCat | "pressure" | "sheet";

/** In the order a player learns the fight: what each mechanic does, where you stand, what comes
    next, then all of it fast. The cheat sheet comes last because it sums up the rest. Each intro
    is one short line: the screen itself shows what to do. */
export const TABS: readonly { id: Tab; label: string; lede: string }[] = [
  { id: "home", label: "Home", lede: "Practice M11S, The Tyrant (Savage), as a healer, away from the raid." },
  { id: "mech", label: "Learn", lede: "What each mechanic does, and what you do in it. Pick an answer to see it on the picture." },
  { id: "map", label: "Practice", lede: "Click where you stand. One mechanic at a time, no timer." },
  { id: "next", label: "Timeline", lede: "Which mechanic comes next in the fight." },
  { id: "pressure", label: "Pressure", lede: "The same questions, fast: timed questions, or the whole fight on the clock." },
  { id: "sheet", label: "Cheat sheet", lede: "The rules and your timeline on one page." },
];
