// Every icon the site's own components use, named by what it means. A component imports its icons
// from here, never from lucide-react, so each icon is chosen once and changes in one place. The
// shadcn/ui components in ui/ are the exception: they import from lucide-react themselves, as the
// shadcn CLI writes them.
//
// The icons come from lucide (lucide-react). An icon lucide does not have is drawn here in its
// style with its createLucideIcon, so it takes the same size, stroke and colour as the others.
// Each one is a named export, never a lookup by a string, so the bundle keeps only the icons in
// use (lucide is tree-shaken), and an icon is passed as a component (icon={ResetIcon}), as
// shadcn/ui asks.
//
// The rules the icons follow (the owner's), so a new icon reads the same way as the others:
//
// What a shape means
// 1. A ring is a spot on the floor (a tower, the spot a bait leaves).
// 2. A filled dot is a player.
// 3. Chevrons are a hit or a push from the boss, toward the players (a line stack, a knockback).
// 4. Arrows are a move the players make themselves (spread, dodge, a stack coming together).
// 5. A bar is a blocker that takes a hit for the others: a tank, a rock, a wall (a wild charge).
// 6. A clock is timing: something you see now and act on later (saved for later).
// 7. Every stack has the same arrows, from the corners into the middle. The middle says how many:
//    2 (pairs), 4 (light parties), R (the roles decide), or nothing for the whole party. The number
//    is in the body font, bold, in its own colour (--count in app.css), so it stands out
//    (MechanicIcon draws it).
// 8. When an icon has a direction, the boss is at the top and the hit runs down, away from it.
//
// How an icon is drawn
// 9. Lucide's style: a 24 by 24 grid, a 2 pixel stroke, round ends and corners. Use a lucide icon
//    when one says it; otherwise draw one here with lucide's createLucideIcon.
// 10. Few lines, about five at most: a mechanic's icon must read at 20 pixels in its square on the
//    list. Check it there, in the browser, in light and dark mode, before you keep it.
import { createLucideIcon, type IconNode } from "lucide-react";

export type { LucideIcon } from "lucide-react";

/* ---------- answers ---------- */

export {
  // A correct answer or step: a check mark.
  Check as CorrectIcon,
  // The last answer was correct: a check mark in a circle.
  CircleCheck as CorrectAnswerIcon,
  // The last answer was incorrect: a cross in a circle.
  CircleX as IncorrectAnswerIcon,
  // The rule of a mechanic: a light bulb.
  Lightbulb as RuleIcon,
  // An incorrect answer or step: a cross.
  X as IncorrectIcon,
} from "lucide-react";

/* ---------- moving on ---------- */

export {
  // Go on to the next mechanic.
  ArrowRight as NextMechanicIcon,
  // The card before, on Learn and Timeline.
  ChevronLeft as PreviousCardIcon,
  // The card after, on Learn and Timeline.
  ChevronRight as NextCardIcon,
  // Start the same thing again: Reset in Practice, Start over in Pressure's player.
  RotateCcw as ResetIcon,
} from "lucide-react";

/* ---------- Pressure's player ---------- */

export {
  // Open a menu of choices, such as the speed.
  ChevronDown as OpenMenuIcon,
  // A handle to drag a row into another place.
  GripVertical as DragHandleIcon,
  // Pause the fight clock.
  Pause as PauseIcon,
  // Play the fight clock.
  Play as PlayIcon,
  // The settings, such as the pattern picks.
  Settings2 as SettingsIcon,
  // A new fight with new random parts.
  Shuffle as NewFightIcon,
} from "lucide-react";

/* ---------- the header ---------- */

export {
  // The choice that is picked in a menu.
  Check as PickedIcon,
  // Dark mode.
  Moon as DarkModeIcon,
  // Share the address of the page.
  Share as ShareIcon,
  // Light mode.
  Sun as LightModeIcon,
} from "lucide-react";

/* ---------- the kinds of mechanic (see MechanicIcon) ---------- */

export {
  // A bait: bring the hit to your spot (a ring), then step out of it (an arrow).
  CircleArrowOutUpRight as BaitIcon,
  // Spread out: arrows out to the corners.
  Expand as SpreadIcon,
  // Saved for later: a clock that turns back.
  History as SavedForLaterIcon,
} from "lucide-react";

/** A stack: four arrows from the corners, the players coming together, with the middle left open
    for the number of players in the stack (MechanicIcon puts it there). */
export const StackIcon = createLucideIcon("stack", [
  ["path", { d: "m1 1 5 5", key: "northwest" }],
  ["path", { d: "M6 2v4H2", key: "northwest-head" }],
  ["path", { d: "m23 1-5 5", key: "northeast" }],
  ["path", { d: "M18 2v4h4", key: "northeast-head" }],
  ["path", { d: "m1 23 5-5", key: "southwest" }],
  ["path", { d: "M6 22v-4H2", key: "southwest-head" }],
  ["path", { d: "m23 23-5-5", key: "southeast" }],
  ["path", { d: "M18 22v-4h4", key: "southeast-head" }],
]);

/** A line stack: three chevrons, the hit running down the line. Lucide's ChevronsDown has two. */
export const LineStackIcon = createLucideIcon("line-stack", [
  ["path", { d: "m7 3 5 5 5-5", key: "top" }],
  ["path", { d: "m7 9 5 5 5-5", key: "middle" }],
  ["path", { d: "m7 15 5 5 5-5", key: "bottom" }],
]);

/** A wild charge: the line stack's chevrons with a bar in front, the tank or rock that takes the
    first, biggest hit. */
export const WildChargeIcon = createLucideIcon("wild-charge", [
  ["path", { d: "M5 3h14", key: "front" }],
  ["path", { d: "m7 8 5 5 5-5", key: "top" }],
  ["path", { d: "m7 14 5 5 5-5", key: "bottom" }],
]);

/** The chevrons of both knockbacks: pushing out to the northwest and southeast corners. */
const PUSHED_OUT: IconNode = [
  ["path", { d: "M2 8V2h6", key: "northwest" }],
  ["path", { d: "M22 16v6h-6", key: "southeast" }],
];

/** A knockback: a player (a filled dot), pushed out by the boss's chevrons. */
export const KnockbackIcon = createLucideIcon("knockback", [
  ["circle", { cx: "12", cy: "12", r: "3", fill: "currentColor", key: "player" }],
  ...PUSHED_OUT,
]);

/** A knockback tower: the tower's ring with the knockback's chevrons, since you soak it and it
    knocks you back. */
export const KnockbackTowerIcon = createLucideIcon("knockback-tower", [
  ["circle", { cx: "12", cy: "12", r: "6", key: "tower" }],
  ...PUSHED_OUT,
]);

/** A tower: a player (a filled dot) standing in the spot (a ring). */
export const TowerIcon = createLucideIcon("tower", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "spot" }],
  ["circle", { cx: "12", cy: "12", r: "3", fill: "currentColor", key: "player" }],
]);

/** A dodge: a player (a filled dot) stepping aside, an arrow of their own. */
export const DodgeIcon = createLucideIcon("dodge", [
  ["circle", { cx: "5", cy: "12", r: "3", fill: "currentColor", key: "player" }],
  ["path", { d: "M10 12h11", key: "step" }],
  ["path", { d: "m17 8 4 4-4 4", key: "step-head" }],
]);

/** A dodge sequence: a player (a filled dot) and the path they take, turning, to an arrow: several
    moves in order. */
export const DodgeSequenceIcon = createLucideIcon("dodge-sequence", [
  ["circle", { cx: "4", cy: "5", r: "2.5", fill: "currentColor", key: "player" }],
  ["path", { d: "M7 5h10a3 3 0 0 1 0 6H7a3 3 0 0 0 0 6h14", key: "path" }],
  ["path", { d: "m18 14 3 3-3 3", key: "path-head" }],
]);
