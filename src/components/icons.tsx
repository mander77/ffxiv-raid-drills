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
// 1. A ring is a spot on the floor (the spot a bait leaves, a puddle). A tower is a column standing
//    in its ring.
// 2. A filled dot is a player.
// 3. Chevrons are a hit from the boss, toward the players (a line stack, a wild charge).
// 4. Arrows are a move the players make themselves (spread, dodge, a stack coming together, puddles
//    dropped in a row, a tether pulled apart).
// 5. A knockback is a burst (where it comes from) and a wide, hollow arrow (the push), never a thin
//    arrow: you do not move yourself. A knockback tower is a tower with a burst line out of each top corner.
// 6. A bar is a blocker that takes a hit for the others: a tank, a rock, a wall (a wild charge).
// 7. A shield is a tank buster.
// 8. A clock is timing: something you see now and act on later (saved for later).
// 9. Every stack has the same arrows, from the corners into the middle. The middle says how many:
//    2 (pairs), 4 (light parties), R (the roles decide), or nothing for the whole party. A shared
//    tank buster's shield takes a number the same way, and so does a tower's column: how many
//    players soak it (Drill.soak). The number is in the body font, bold, in
//    its own colour (--count in app.css), so it stands out (MechanicIcon draws it).
// 10. When an icon has a direction, the boss is at the top and the hit runs down, away from it.
//
// How an icon is drawn
// 11. Lucide's style: a 24 by 24 grid, a 2 pixel stroke, round ends and corners. Use a lucide icon
//    when one says it; otherwise draw one here with lucide's createLucideIcon.
// 12. Few lines, about five, eight at most: a mechanic's icon must read at 20 pixels in its square
//    on the list. Check it there, in the browser, in light and dark mode, before you keep it.
// 13. Every icon here is on the icons page (/icons, IconsPage) with what it means; a test fails
//    when one is missing. The page shows them side by side, large and at their real size.
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

/** A bait: you are the target, a player (a filled dot) in a crosshair, and you bring the hit to
    where it should go. Lucide's LocateFixed, with the player filled in. */
export const BaitIcon = createLucideIcon("bait", [
  ["circle", { cx: "12", cy: "12", r: "7", key: "crosshair" }],
  ["circle", { cx: "12", cy: "12", r: "2.5", fill: "currentColor", key: "player" }],
  ["path", { d: "M12 2v3", key: "north" }],
  ["path", { d: "M12 19v3", key: "south" }],
  ["path", { d: "M2 12h3", key: "west" }],
  ["path", { d: "M19 12h3", key: "east" }],
]);

/** A puddle drop sequence: three spots on the floor (rings), and the curved arrow of the player
    walking on as they drop them. */
export const PuddleDropIcon = createLucideIcon("puddle-drop", [
  ["circle", { cx: "5", cy: "19", r: "2.5", key: "first" }],
  ["circle", { cx: "12", cy: "15", r: "2.5", key: "second" }],
  ["circle", { cx: "19", cy: "11", r: "2.5", key: "third" }],
  ["path", { d: "M3 11C5 5 11 2.5 18 4", key: "walk" }],
  ["path", { d: "m15 1 3 3-3 3", key: "walk-head" }],
]);

/** A knockback: a burst at the top left, where it comes from, and the wide arrow that throws the
    player (a filled dot) down and away. */
export const KnockbackIcon = createLucideIcon("knockback", [
  ["path", { d: "M7.14 0.95 7.58 4.05", key: "burst-east" }],
  ["path", { d: "m3.16 3.16 2.21 2.21", key: "burst-middle" }],
  ["path", { d: "M0.95 7.14 4.05 7.58", key: "burst-south" }],
  ["path", { d: "m9.35 6.7 3.53 3.53 2.66-2.65v7.96H7.58l2.65-2.66L6.7 9.35z", key: "push" }],
  ["circle", { cx: "19", cy: "19", r: "3", fill: "currentColor", key: "player" }],
]);

/** A tower: a wide column standing in its ring on the floor, with room inside for the number of
    players who soak it (MechanicIcon puts it there). */
const TOWER: IconNode = [
  ["ellipse", { cx: "12", cy: "20", rx: "11", ry: "3", key: "ring" }],
  ["path", { d: "M3.5 20 5 4h14l1.5 16", key: "column" }],
];

export const TowerIcon = createLucideIcon("tower", TOWER);

/** A knockback tower: the tower with a burst line out of each top corner, since you soak it and it
    knocks you back. */
export const KnockbackTowerIcon = createLucideIcon("knockback-tower", [
  ...TOWER,
  ["path", { d: "M3.5 3 1.5 1", key: "burst-west" }],
  ["path", { d: "m20.5 3 2-2", key: "burst-east" }],
]);

/** A stretch tether: two players (filled dots) joined by a tether, and the arrow of their moving
    apart to stretch it. */
export const StretchTetherIcon = createLucideIcon("stretch-tether", [
  ["circle", { cx: "5", cy: "17", r: "3", fill: "currentColor", key: "west-player" }],
  ["circle", { cx: "19", cy: "17", r: "3", fill: "currentColor", key: "east-player" }],
  ["path", { d: "M8 17h8", key: "tether" }],
  ["path", { d: "M3 7h18", key: "apart" }],
  ["path", { d: "m6 4-3 3 3 3", key: "apart-west" }],
  ["path", { d: "m18 4 3 3-3 3", key: "apart-east" }],
]);

/** The shield of a tank buster: lucide's Shield. */
const SHIELD: IconNode = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "shield",
    },
  ],
];

/** A tank buster: a player (a filled dot) behind a shield. */
export const TankBusterIcon = createLucideIcon("tank-buster", [
  ...SHIELD,
  ["circle", { cx: "12", cy: "12", r: "3", fill: "currentColor", key: "player" }],
]);

/** A shared tank buster: the shield, with the middle left open for the number of tanks who share
    it (MechanicIcon puts it there), as a stack does. */
export const SharedTankBusterIcon = createLucideIcon("shared-tank-buster", SHIELD);

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
