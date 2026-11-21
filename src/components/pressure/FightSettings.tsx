import { GripVertical } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { WeaponType } from "../../data/drills";
import { CHOICE_ROWS, type Choices, choicesText, cleanChoices, RANDOM } from "../../data/fight";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export interface FightSettingsProps {
  code: string;
  choices: Choices;
  /** Called with the new picks. The player builds the same fight again with them. */
  onChange: (choices: Choices) => void;
}

/** The Settings button of the player, and its sheet: the fight pattern. Each random part of the fight can be
    Random or a pick, to practice it on purpose. Parts left on Random still come from the fight
    code. The sheet comes in from the right on a wide screen, so the arena stays in view, and from
    the bottom on a phone. */
export function FightSettings({ code, choices, onChange }: FightSettingsProps) {
  const wide = useMediaQuery("(min-width: 768px)");
  /** Save one pick. cleanChoices checks it, so only a known value is kept. */
  const set = (key: string, value: string): void => onChange(cleanChoices({ ...choices, [key]: value }));
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent side={wide ? "right" : "bottom"} className={cn(!wide && "max-h-[85dvh]")}>
        <SheetHeader>
          <SheetTitle>Fight pattern</SheetTitle>
          <SheetDescription>
            Fight {code}. Pick a part to practice it on purpose. For a weapon order, press Set order, then drag the cards into the order the
            boss takes them.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
          <PickRows choices={choices} onPick={set} />
        </div>
        <SheetFooter className="flex-row flex-wrap">
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
          {choicesText(choices) && (
            <Button variant="link" onClick={() => onChange(RANDOM)}>
              Set all to Random
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface PickRowsProps {
  choices: Choices;
  onPick: (key: string, value: string) => void;
}

/** One row per pick, in fight order. */
function PickRows({ choices, onPick: set }: PickRowsProps) {
  return CHOICE_ROWS.map((row) =>
    row.key === "set1" || row.key === "set2" ? (
      <WeaponOrderRow key={row.key} label={row.label} value={choices[row.key]} onChange={(v) => set(row.key, v)} />
    ) : (
      <PickRow
        key={row.key}
        label={row.label}
        value={choices[row.key]}
        options={[["random", "Random"], ...row.options]}
        onChange={(v) => set(row.key, v)}
      />
    ),
  );
}

interface PickRowProps {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}

/** One pick: Random or one of its values. */
function PickRow({ label, value, options, onChange }: PickRowProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <p id={id} className="text-sm font-medium">
        {label}
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        className="flex-wrap"
        value={value}
        aria-labelledby={id}
        onValueChange={(v) => v && onChange(v)}
      >
        {options.map(([v, text]) => (
          <ToggleGroupItem key={v} value={v}>
            {text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

const WEAPON_NAMES: Record<WeaponType, string> = { sword: "Sword", axe: "Axe", scythe: "Scythe" };
const DEFAULT_ORDER: WeaponType[] = ["sword", "axe", "scythe"];

interface WeaponOrderRowProps {
  label: string;
  /** "random", or the weapons in order: "sword-axe-scythe". */
  value: string;
  onChange: (value: string) => void;
}

/** A weapon order: Random or Set order, then three cards in the order the boss takes them. On
    Random the cards show "?" and stay put. With Set order, drag a card to a new place, or focus it
    and use the arrow keys. */
function WeaponOrderRow({ label, value, onChange }: WeaponOrderRowProps) {
  const id = useId();
  const random = value === "random";
  const saved = random ? DEFAULT_ORDER : (value.split("-") as WeaponType[]);
  /** The order while you drag a card; it is saved when you let go. */
  const [dragged, setDragged] = useState<WeaponType[] | null>(null);
  const order = dragged ?? saved;
  const cards = useRef<HTMLOListElement>(null);

  /** Move the card at i to j and save the order. */
  function move(i: number, j: number): void {
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next.join("-"));
  }
  function handleKeyDown(e: KeyboardEvent<HTMLLIElement>, i: number): void {
    const j = e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowRight" ? i + 1 : -1;
    if (j < 0) return;
    // The arrows move the card, not the fight clock.
    e.preventDefault();
    e.stopPropagation();
    move(i, j);
  }
  // A drag changes places with a neighbour once the pointer passes the middle of that neighbour.
  function handlePointerDown(e: PointerEvent<HTMLLIElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragged(order);
  }
  function handlePointerMove(e: PointerEvent<HTMLLIElement>, w: WeaponType): void {
    if (!dragged || !cards.current) return;
    const items = [...cards.current.children] as HTMLElement[];
    const i = dragged.indexOf(w);
    const mid = (n: number): number => {
      const r = items[n].getBoundingClientRect();
      return r.left + r.width / 2;
    };
    const j = i + 1 < items.length && e.clientX > mid(i + 1) ? i + 1 : i > 0 && e.clientX < mid(i - 1) ? i - 1 : i;
    if (j === i) return;
    const next = [...dragged];
    [next[i], next[j]] = [next[j], next[i]];
    setDragged(next);
  }
  function handlePointerUp(): void {
    // A tap with no move changes nothing.
    if (dragged && dragged.join("-") !== saved.join("-")) onChange(dragged.join("-"));
    setDragged(null);
  }

  return (
    <div className="space-y-1.5">
      <p id={id} className="text-sm font-medium">
        {label}
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={random ? "random" : "set"}
        aria-labelledby={id}
        onValueChange={(v) => v && onChange(v === "random" ? "random" : order.join("-"))}
      >
        <ToggleGroupItem value="random">Random</ToggleGroupItem>
        <ToggleGroupItem value="set">Set order</ToggleGroupItem>
      </ToggleGroup>
      <ol ref={cards} aria-label={`${label}${random ? ": random" : ": drag the cards, or use the arrow keys"}`} className="flex gap-2">
        {order.map((w, i) => (
          <li
            key={w}
            // A card takes the focus, so the arrow keys can move it.
            tabIndex={random ? undefined : 0}
            aria-label={`${WEAPON_NAMES[w]}${random ? ", order random" : `, number ${i + 1}`}`}
            className={cn(
              "flex flex-1 touch-none items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-sm select-none",
              random ? "text-muted-foreground" : "cursor-grab focus-visible:ring-2 focus-visible:ring-ring",
              dragged && "cursor-grabbing",
            )}
            onKeyDown={random ? undefined : (e) => handleKeyDown(e, i)}
            onPointerDown={random ? undefined : handlePointerDown}
            onPointerMove={random ? undefined : (e) => handlePointerMove(e, w)}
            onPointerUp={random ? undefined : handlePointerUp}
            onPointerCancel={random ? undefined : handlePointerUp}
          >
            {!random && <GripVertical aria-hidden="true" className="size-4 text-muted-foreground" />}
            <b className="tabular-nums">{random ? "?" : i + 1}</b>
            {WEAPON_NAMES[w]}
          </li>
        ))}
      </ol>
    </div>
  );
}
