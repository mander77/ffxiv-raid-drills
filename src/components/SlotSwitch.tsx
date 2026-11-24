import { type ComponentProps, type MouseEvent, type ReactNode, useEffect, useId, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimeout } from "@/hooks/useTimeout";
import { cn } from "@/lib/utils";
import { isSlot, partyOf, ROLES, slotName } from "../party";
import { useSlotStore } from "../stores/slot";
import type { Role } from "../types";

/** How long the "not yet available" tip stays after a tap. */
const SOON_MS = 2000;

export interface SlotSwitchProps {
  className?: string;
}

/** The slot switch: the role, then the light party, which wtfdig calls the group (1 or 2). Only the
    healer drills exist so far. The other roles show greyed out, and a tip says so when you point at
    one, move to it with Tab, or tap it. On a narrow screen the roles show as letters, so Role and
    Group fit on one row. */
export function SlotSwitch({ className }: SlotSwitchProps) {
  // TS note: useSlotStore(s => s.slot) reads one value from the store. The component draws again
  // only when that value changes.
  const slot = useSlotStore((s) => s.slot);
  const setSlot = useSlotStore((s) => s.setSlot);
  const me = partyOf(slot);
  // TS note: useId makes an id that is unique on the page, for aria-labelledby.
  const roleLabel = useId();
  const groupLabel = useId();

  // The role whose tip shows, if any.
  const [tip, setTip] = useState<Role | null>(null);
  const later = useTimeout();

  // A tap has no hover, so a click keeps the tip for a while.
  function handleSoonClick(e: MouseEvent, role: Role): void {
    // Keep the pick as it is: Healer is the only role that is ready.
    e.preventDefault();
    setTip(role);
    later(() => setTip(null), SOON_MS);
  }

  // The tip sits on the screen, not in the page, so it goes when the page scrolls.
  useEffect(() => {
    const hide = (): void => setTip(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  return (
    <div className={cn("flex flex-wrap items-end justify-end gap-x-2 gap-y-2", className)}>
      {/* Each switch sits in a box with its name set into the top border (owner's choice), so it
          takes no width and the row stays about as tall as the tabs. */}
      <BandGroup labelId={roleLabel} label="Role">
        {/* A small gap between the buttons, so each one keeps its own rounded corners. */}
        <ToggleGroup type="single" size="sm" spacing={0.5} value={me.role} aria-labelledby={roleLabel}>
          {ROLES.map(({ role, short, ready }) => {
            const text = (
              <>
                <span className="max-md:hidden">{role}</span>
                <span className="md:hidden">{short}</span>
              </>
            );
            if (ready)
              return (
                <BandToggleItem key={role} value={role} aria-label={role}>
                  {text}
                </BandToggleItem>
              );
            return (
              <Tooltip key={role} open={tip === role} onOpenChange={(open) => setTip(open ? role : null)}>
                <TooltipTrigger asChild>
                  <BandToggleItem
                    value={role}
                    aria-label={role}
                    aria-disabled="true"
                    className="cursor-not-allowed opacity-60"
                    onClick={(e) => handleSoonClick(e, role)}
                  >
                    {text}
                  </BandToggleItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">{role} drills: not yet available</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </BandGroup>
      <BandGroup labelId={groupLabel} label="Light Party">
        <ToggleGroup
          type="single"
          size="sm"
          spacing={0.5}
          value={String(me.lp)}
          aria-labelledby={groupLabel}
          // A click on the group you have already picked gives "", which keeps it.
          onValueChange={(v) => {
            if (!v) return;
            const next = slotName({ lp: v === "2" ? 2 : 1, role: me.role });
            if (isSlot(next)) setSlot(next);
          }}
        >
          {([1, 2] as const).map((lp) => (
            <BandToggleItem key={lp} value={String(lp)} title={slotName({ lp, role: me.role })} className="min-w-7">
              {lp}
            </BandToggleItem>
          ))}
        </ToggleGroup>
      </BandGroup>
    </div>
  );
}

interface BandGroupProps {
  /** The id of the label, for the switch's aria-labelledby. */
  labelId: string;
  label: string;
  children: ReactNode;
}

/** A box round one switch on the header's band, with the switch's name set into its top border
    (a fieldset and its legend, the standard labelled group). The name sits half on the line, so it
    can be a readable size and adds only half its height to the box. */
function BandGroup({ labelId, label, children }: BandGroupProps) {
  return (
    <fieldset className="rounded-md border border-header-foreground/40 px-1 pb-0.5">
      <legend id={labelId} className="mb-0.5 px-1 text-xs leading-none font-medium">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

/** A toggle item on the header's slate band: light lines and text, a faint hover, and celery for the
    one you picked, as for the tab you are on. */
function BandToggleItem({ className, ...props }: ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      className={cn(
        "h-6 min-w-6 px-1.5 text-xs text-header-foreground hover:bg-white/10 hover:text-header-foreground data-[state=on]:bg-highlight data-[state=on]:text-highlight-foreground",
        className,
      )}
      {...props}
    />
  );
}
