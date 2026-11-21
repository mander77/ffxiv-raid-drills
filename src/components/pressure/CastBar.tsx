import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { castOf } from "../../lib/fight";

/* In the game, the boss's cast bar is in the middle of the screen. Here it sits over the mechanic
   in the player, and over the prompt in the run. */

/** The boss's cast bar: the next line of the timeline. Each frame moves its fill and time. */
export function CastBar() {
  const fill = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLSpanElement>(null);
  const [cast, setCast] = useState({ casting: false, name: "" });
  useFightFrame((s) => {
    const c = castOf(s);
    if (fill.current) fill.current.style.width = `${(c.fill * 100).toFixed(1)}%`;
    if (left.current && left.current.textContent !== c.left) left.current.textContent = c.left;
    // A state setter draws again only when the value changes, so these change only now and then.
    setCast((was) => (was.casting === c.casting && was.name === c.name ? was : { casting: c.casting, name: c.name }));
  });
  return (
    <div className="relative h-7 overflow-hidden rounded-md border bg-muted text-sm">
      <div ref={fill} className="absolute inset-y-0 left-0 w-0 bg-cast" aria-hidden="true" />
      <div className={cn("relative flex h-full items-center justify-between gap-2 px-2", !cast.casting && "text-muted-foreground")}>
        <span className="truncate font-medium">{cast.name}</span>
        <span ref={left} className="tabular-nums" />
      </div>
    </div>
  );
}
