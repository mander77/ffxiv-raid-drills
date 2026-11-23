// The styles page (/styles): how the site shows an answer, and every icon it uses, with what each
// one means. No tab leads here, only the footer; it is a reference for the owner, to check the styles side by
// side in light and dark mode. Each sample is the site's own component, so it shows the real style.
// A click on an icon's card opens it zoomed in.
import type { ComponentProps, ReactNode } from "react";
import "../components/arena/arena.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Weapon } from "../components/arena/Weapon";
import { CastSquare } from "../components/CastSquare";
import {
  DarkModeIcon,
  DragHandleIcon,
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
  SettingsIcon,
  ShareIcon,
  TabMenuIcon,
} from "../components/icons";
import { LastAnswer } from "../components/LastAnswer";
import { KINDS, MechanicIcon } from "../components/MechanicIcon";
import { PageContainer } from "../components/PageContainer";
import { PromptBar } from "../components/PromptBar";
import { AnswerButton } from "../components/quiz/AnswerButton";
import { RuleBox } from "../components/RuleBox";
import { StepChips } from "../components/StepChips";
import { Tally } from "../components/Tally";
import { DRILLS } from "../data/drills";
import { kindsOf } from "../lib/practice";
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
      { icon: TabMenuIcon, name: "Tabs", meaning: "Open the list of tabs, on a phone." },
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

/** A sample answer's buttons do nothing. */
function noop(): void {}

/** How the site shows an answer, each with the component that draws it. */
const ANSWER_STYLES: readonly { name: string; meaning: string; sample: ReactNode }[] = [
  {
    name: "Answers before you answer",
    meaning: "An answer to pick, and on a Learn card, the one you picked before Lock in.",
    sample: (
      <div className="space-y-2">
        <AnswerButton n={1} text="An answer to pick." state="open" onClick={noop} onPoint={noop} />
        <AnswerButton n={2} text="The answer you picked." state="picked" pressed onClick={noop} onPoint={noop} />
      </div>
    ),
  },
  {
    name: "Answers after you answer",
    meaning: "The correct answer in green, with why; your pick in red when it was not; the others faded.",
    sample: (
      <div className="space-y-2">
        <AnswerButton n={1} text="The correct answer." state="correct" why={["Why it is correct."]} onClick={noop} onPoint={noop} />
        <AnswerButton n={2} text="Your incorrect pick." state="incorrect" onClick={noop} onPoint={noop} />
        <AnswerButton n={3} text="Another answer." state="other" onClick={noop} onPoint={noop} />
      </div>
    ),
  },
  {
    name: "Prompt bar",
    meaning:
      "The question and its button, in the same place on Learn, Timeline, Practice and the quick round. After the answer it turns green or red, says how it went and glows once. On a phone it stays at the top of the screen.",
    sample: (
      <div className="space-y-2">
        <PromptBar count="1/2" actions={<Button size="sm">Lock in</Button>}>
          <p className="font-medium">The question.</p>
        </PromptBar>
        <PromptBar tone="correct" actions={<Button size="sm">Next</Button>}>
          <p className="font-semibold">Correct.</p>
        </PromptBar>
        <PromptBar tone="incorrect" actions={<Button size="sm">Next</Button>}>
          <p>
            <span className="font-semibold">Not there.</span> Where you should have stood.
          </p>
        </PromptBar>
      </div>
    ),
  },
  {
    name: "Last answer",
    meaning: "The step before: correct or not, its question and its answer.",
    sample: (
      <div className="space-y-2">
        <LastAnswer ok answer={["The correct move.", "A detail."]} />
        <LastAnswer ok={false} answer={["The correct move.", "A detail."]} />
      </div>
    ),
  },
  {
    name: "Steps",
    meaning: "One chip per step: correct, incorrect, the step you are on, and the steps to come.",
    sample: <StepChips count={4} results={[{ ok: true }, { ok: false }]} />,
  },
  {
    name: "Rule",
    meaning: "The rule of a mechanic, after the answer.",
    sample: <RuleBox rule={["Why the correct spot is the one to stand in."]} />,
  },
  {
    name: "Tally",
    meaning: "The counts at the end of a round: correct, incorrect, and too slow.",
    sample: <Tally correct={9} incorrect={2} missed={1} missedLabel="Too slow" />,
  },
];

/** The titles of the Practice mechanics of a kind, in fight order. */
function drillsOf(kind: DrillKind): string[] {
  return DRILLS.filter((d) => kindsOf(d).includes(kind)).map((d) => d.title);
}

export function StylesPage() {
  return (
    <main>
      <PageContainer className="space-y-10 py-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Styles</h1>
          <p className="text-muted-foreground">How the site shows an answer, and every icon it uses.</p>
        </header>

        <section className="space-y-4" aria-labelledby="answers">
          <h2 id="answers" className="font-display text-2xl font-bold">
            Answers
          </h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {ANSWER_STYLES.map((a) => (
              <li key={a.name} className="space-y-3 rounded-lg border bg-card p-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="text-sm text-muted-foreground">{a.meaning}</p>
                </div>
                {a.sample}
              </li>
            ))}
          </ul>
        </section>

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
                <IconItem
                  key={name}
                  picture={<Icon aria-hidden="true" className="size-6" />}
                  zoomed={<Icon aria-hidden="true" className="size-48" />}
                  name={name}
                  meaning={meaning}
                />
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
                zoomed={
                  <svg className="arena size-56" viewBox="44.5 44.5 11 11" aria-hidden="true">
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
    </main>
  );
}

interface IconItemProps {
  picture: ReactNode;
  /** The picture zoomed in, for the dialog a click on the card opens. */
  zoomed: ReactNode;
  name: string;
  meaning: string;
  children?: ReactNode;
}

/** One icon: its picture, its name and what it means. A click anywhere on the card opens a dialog
    with the picture zoomed in. The name is the button, stretched over the card, so the card keeps
    its heading and a screen reader hears one button named after the icon. */
function IconItem({ picture, zoomed, name, meaning, children }: IconItemProps) {
  return (
    <li className="relative flex gap-4 rounded-lg border bg-card p-4 transition-colors has-[button:hover]:bg-accent">
      <div className="flex shrink-0 items-start gap-2">{picture}</div>
      <div className="min-w-0 space-y-1">
        <Dialog>
          <h3 className="font-semibold">
            <DialogTrigger className="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {name}
            </DialogTrigger>
          </h3>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>{meaning}</DialogDescription>
            </DialogHeader>
            <div className="flex items-end justify-center gap-4 py-4">{zoomed}</div>
          </DialogContent>
        </Dialog>
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
            <MechanicIcon kind={kind} soak={soak} className="size-10" />
          </span>
          <CastSquare mark={{ cats: [], kind, soak }} />
        </>
      }
      zoomed={
        <>
          <span className="flex size-56 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
            <MechanicIcon kind={kind} soak={soak} className="size-48" />
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
