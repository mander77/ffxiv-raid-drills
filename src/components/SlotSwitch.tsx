import { type ComponentProps, type MouseEvent, useEffect, useId, useState } from "react";
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
      {/* Each switch has its name in small text above it (owner's choice), so it takes no width
          and the switch fits beside the tab button on a phone. */}
      <div className="flex flex-col gap-0.5">
        <span id={roleLabel} className="text-xs leading-none">
          Role
        </span>
        <ToggleGroup type="single" variant="outline" size="sm" value={me.role} aria-labelledby={roleLabel}>
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
      </div>
      <div className="flex flex-col gap-0.5">
        <span id={groupLabel} className="text-xs leading-none">
          Group
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
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
            <BandToggleItem key={lp} value={String(lp)} title={slotName({ lp, role: me.role })} className="min-w-9">
              {lp}
            </BandToggleItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

/** A toggle item on the header's slate band: light lines and text, a faint hover, and celery for the
    one you picked, as for the tab you are on. */
function BandToggleItem({ className, ...props }: ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      className={cn(
        "border-header-foreground/40 text-header-foreground hover:bg-white/10 hover:text-header-foreground data-[state=on]:bg-highlight data-[state=on]:text-highlight-foreground",
        className,
      )}
      {...props}
    />
  );
}
