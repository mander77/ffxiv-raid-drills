import { useEffect, useId, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { healerOf, partyOf, ROLES, slotName } from "../party";
import { useSlotStore } from "../stores/slot";
import type { Role } from "../types";

/** How long the "not yet available" tip stays after a tap. */
const SOON_MS = 2000;

/** Role and Group look like one control: a green outline, and the same type and height. The only
    filled green in the header is your own pick. */
const GROUP = "gap-0 overflow-hidden rounded-lg border-[1.5px] border-heal shadow-none";
const ITEM = cn(
  "h-auto min-h-8 rounded-none bg-card px-3 py-[5px] text-[14px] leading-normal font-bold text-heal max-[401px]:px-[9px]",
  "hover:bg-card hover:text-heal data-[state=on]:bg-heal data-[state=on]:text-white data-[state=on]:hover:bg-heal data-[state=on]:hover:text-white",
);

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

  // The role whose tip shows, if any. A tap keeps it for SOON_MS.
  const [tip, setTip] = useState<Role | null>(null);
  const [tapped, setTapped] = useState(0);
  useEffect(() => {
    if (!tapped) return;
    const timer = setTimeout(() => setTip(null), SOON_MS);
    return () => clearTimeout(timer);
  }, [tapped]);
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
        {/* Only a role that is ready can be picked, and only Healer is, so a pick changes nothing. */}
        <ToggleGroup type="single" value={me.role} aria-labelledby={roleLabel} className={GROUP}>
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
                    className={cn(ITEM, "cursor-not-allowed text-ink-3 hover:text-ink-3")}
                    onClick={(e) => {
                      // Keep the pick as it is, and keep the tip open for a while (a tap has no hover).
                      e.preventDefault();
                      setTip(role);
                      setTapped((n) => n + 1);
                    }}
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
          value={String(me.lp)}
          aria-labelledby={groupLabel}
          className={GROUP}
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
