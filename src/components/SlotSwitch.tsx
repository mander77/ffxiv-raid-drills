import { type MouseEvent, useEffect, useId, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimeout } from "@/hooks/useTimeout";
import { cn } from "@/lib/utils";
import { healerOf, partyOf, ROLES, slotName } from "../party";
import { useSlotStore } from "../stores/slot";
import type { Role } from "../types";

/** How long the "not yet available" tip stays after a tap. */
const SOON_MS = 2000;

/** On the smallest phones the switch packs a little tighter, so it still fits on one row. */
const ITEM = "max-[401px]:px-[9px]";

export interface SlotSwitchProps {
  className?: string;
}

/** The slot switch: the role, then the light party, which wtfdig calls the group (1 or 2). Only the
    healer drills exist so far. The other roles show greyed out, and a tip says so when you point at
    one, move to it with Tab, or tap it. Below 900 px the roles show as letters, so Role and Group
    fit on one row. */
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
    <div
      className={cn(
        "flex max-w-full flex-wrap items-center justify-end gap-x-[18px] gap-y-2 max-[641px]:flex-nowrap max-[641px]:justify-between max-[401px]:gap-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 max-[401px]:gap-1.5">
        <span id={roleLabel} className="text-[14px] text-ink-2">
          Role
        </span>
        <ToggleGroup type="single" variant="segment" size="segment" value={me.role} aria-labelledby={roleLabel}>
          {ROLES.map(({ role, short, ready }) => {
            const text = (
              <>
                <span className="max-[900px]:hidden">{role}</span>
                <span className="hidden max-[900px]:inline">{short}</span>
              </>
            );
            if (ready)
              return (
                <ToggleGroupItem key={role} value={role} aria-label={role} className={ITEM}>
                  {text}
                </ToggleGroupItem>
              );
            return (
              <Tooltip key={role} open={tip === role} onOpenChange={(open) => setTip(open ? role : null)}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={role}
                    aria-label={role}
                    aria-disabled="true"
                    className={ITEM}
                    onClick={(e) => handleSoonClick(e, role)}
                  >
                    {text}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="bg-ink px-[9px] py-[5px] text-[13px] leading-[1.3] text-white">
                  {role} drills: not yet available
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </div>
      <div className="flex items-center gap-2 max-[401px]:gap-1.5">
        <span id={groupLabel} className="text-[14px] text-ink-2">
          Group
        </span>
        <ToggleGroup
          type="single"
          variant="segment"
          size="segment"
          value={String(me.lp)}
          aria-labelledby={groupLabel}
          // A click on the group you have already picked gives "", which keeps it.
          onValueChange={(v) => v && setSlot(healerOf(v === "2" ? 2 : 1))}
        >
          {([1, 2] as const).map((lp) => (
            <ToggleGroupItem
              key={lp}
              value={String(lp)}
              title={slotName({ lp, role: me.role })}
              className={cn(ITEM, "min-w-10 max-[401px]:min-w-[34px]")}
            >
              {lp}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
