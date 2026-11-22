// The icons page (/icons): every icon the site uses, with what it means. No tab or link leads here;
// it is a reference for the owner, to check the icons side by side in light and dark mode.
import type { ComponentProps, ReactNode } from "react";
import "../components/arena/arena.css";
import { Weapon } from "../components/arena/Weapon";
import { CastSquare } from "../components/CastSquare";
import {
  CorrectAnswerIcon,
  CorrectIcon,
  DarkModeIcon,
  DragHandleIcon,
  IncorrectAnswerIcon,
  IncorrectIcon,
  LightModeIcon,
  type LucideIcon,
  NewFightIcon,
  NextCardIcon,
  NextMechanicIcon,
  OpenMenuIcon,
  PauseIcon,
  PickedIcon,
  PlayIcon,
  PreviousCardIcon,
  ResetIcon,
  RuleIcon,
  SettingsIcon,
  ShareIcon,
} from "../components/icons";
import { KINDS, MechanicIcon } from "../components/MechanicIcon";
import { PageContainer } from "../components/PageContainer";
import { DRILLS } from "../data/drills";
import type { DrillKind } from "../types";

/** An icon of the site's buttons and signs, with its name and what it means. */
interface InterfaceIcon {
  icon: LucideIcon;
  name: string;
  meaning: string;
}

/** The icons of the buttons and signs, grouped as icons.tsx groups them. */
const INTERFACE_GROUPS: readonly { title: string; icons: readonly InterfaceIcon[] }[] = [
  {
    title: "Answers",
    icons: [
      { icon: CorrectIcon, name: "Correct", meaning: "A correct answer or step." },
      { icon: IncorrectIcon, name: "Incorrect", meaning: "An incorrect answer or step." },
      { icon: CorrectAnswerIcon, name: "Correct answer", meaning: "The last answer was correct." },
      { icon: IncorrectAnswerIcon, name: "Incorrect answer", meaning: "The last answer was incorrect." },
      { icon: RuleIcon, name: "Rule", meaning: "The rule of a mechanic." },
    ],
  },
  {
    title: "Moving on",
    icons: [
      { icon: NextMechanicIcon, name: "Next mechanic", meaning: "Go on to the next mechanic." },
      { icon: PreviousCardIcon, name: "Previous card", meaning: "The card before, on Learn and Timeline." },
      { icon: NextCardIcon, name: "Next card", meaning: "The card after, on Learn and Timeline." },
      { icon: ResetIcon, name: "Reset", meaning: "Start the same thing again: Reset, or Start over." },
    ],
  },
  {
    title: "Pressure's player",
    icons: [
      { icon: PlayIcon, name: "Play", meaning: "Play the fight clock." },
      { icon: PauseIcon, name: "Pause", meaning: "Pause the fight clock." },
      { icon: NewFightIcon, name: "New fight", meaning: "A new fight with new random parts." },
      { icon: SettingsIcon, name: "Settings", meaning: "The settings, such as the pattern picks." },
      { icon: OpenMenuIcon, name: "Open menu", meaning: "Open a menu of choices, such as the speed." },
      { icon: DragHandleIcon, name: "Drag handle", meaning: "Drag a row into another place." },
    ],
  },
  {
    title: "The header",
    icons: [
      { icon: ShareIcon, name: "Share", meaning: "Copy the address of the page." },
      { icon: LightModeIcon, name: "Light mode", meaning: "Switch to light mode." },
      { icon: DarkModeIcon, name: "Dark mode", meaning: "Switch to dark mode." },
      { icon: PickedIcon, name: "Picked", meaning: "The choice that is picked in a menu." },
    ],
  },
];

/** The boss's weapons, as the arena draws them in his hand: only the icon, in the middle of a small
    piece of the arena. A held weapon ignores the turn (ux, uy, dx, dy) a scythe on the floor needs. */
const WEAPONS: readonly { overlay: ComponentProps<typeof Weapon>["overlay"]; name: string; meaning: string }[] = [
  { overlay: { t: "axe", x: 50, y: 50, held: true }, name: "Axe", meaning: "Two half-moon heads on a long handle." },
  {
    overlay: { t: "scythe", x: 50, y: 50, ux: 1, uy: 0, dx: 0, dy: 0, held: true },
    name: "Scythe",
    meaning: "A long curved blade on a bent handle.",
  },
  {
    overlay: { t: "sword", x: 50, y: 50, held: true },
    name: "Sword",
    meaning: "A wide blade, point down, with a crossguard and a round pommel.",
  },
];

/** The number a tower's icon shows on this page, as an example. */
const EXAMPLE_SOAK = 2;

/** The titles of the Practice mechanics of a kind, in fight order. */
function drillsOf(kind: DrillKind): string[] {
  return DRILLS.filter((d) => d.kind === kind).map((d) => d.title);
}

export function IconsPage() {
  return (
    <PageContainer className="space-y-10 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Icons</h1>
        <p className="text-muted-foreground">Every icon on the site, and what it means.</p>
      </header>

      <section className="space-y-4" aria-labelledby="kinds">
        <h2 id="kinds" className="font-display text-2xl font-bold">
          Kinds of mechanic
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KINDS) as DrillKind[]).map((kind) => (
            <KindItem key={kind} kind={kind} />
          ))}
        </ul>
      </section>

      {INTERFACE_GROUPS.map((group) => (
        <section key={group.title} className="space-y-4">
          <h2 className="font-display text-2xl font-bold">{group.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.icons.map(({ icon: Icon, name, meaning }) => (
              <IconItem key={name} picture={<Icon aria-hidden="true" className="size-6" />} name={name} meaning={meaning} />
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">The boss's weapons</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEAPONS.map((w) => (
            <IconItem
              key={w.name}
              picture={
                <svg className="arena size-12" viewBox="44.5 44.5 11 11" aria-hidden="true">
                  <Weapon overlay={w.overlay} />
                </svg>
              }
              name={w.name}
              meaning={w.meaning}
            />
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}

interface IconItemProps {
  picture: ReactNode;
  name: string;
  meaning: string;
  children?: ReactNode;
}

/** One icon: its picture, its name and what it means. */
function IconItem({ picture, name, meaning, children }: IconItemProps) {
  return (
    <li className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="flex shrink-0 items-start gap-2">{picture}</div>
      <div className="min-w-0 space-y-1">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{meaning}</p>
        {children}
      </div>
    </li>
  );
}

interface KindItemProps {
  kind: DrillKind;
}

/** A kind of mechanic: its icon large and in its square on the list, and the mechanics that use it. */
function KindItem({ kind }: KindItemProps) {
  const { name, meaning, soaked } = KINDS[kind];
  const drills = drillsOf(kind);
  // A tower's number comes from each mechanic; 2 shows where it goes.
  const soak = soaked ? EXAMPLE_SOAK : undefined;
  return (
    <IconItem
      picture={
        <>
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MechanicIcon kind={kind} soak={soak} className="size-8" countClassName="text-count" />
          </span>
          <CastSquare mark={{ cats: [], kind, soak }} />
        </>
      }
      name={name}
      meaning={meaning}
    >
      <p className="text-xs text-muted-foreground">{drills.length ? drills.join(" · ") : "No mechanic uses it yet."}</p>
    </IconItem>
  );
}
