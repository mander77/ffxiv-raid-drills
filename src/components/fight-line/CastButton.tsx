import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CastMark } from "../../lib/fight";

export interface CastButtonProps {
  mark: CastMark;
  /** The player: go to the cast. Without it (the run) the cast is only shown. */
  onGoTo?: (t: number) => void;
  className?: string;
  children: ReactNode;
}

/** One cast on the timeline of the casts coming up: in the player a button that goes to it, so
    each cast works with the keyboard too; in the run a plain box. */
export function CastButton({ mark, onGoTo, className, children }: CastButtonProps) {
  if (!onGoTo) return <div className={className}>{children}</div>;
  return (
    <button
      type="button"
      aria-label={`Go to ${mark.name}`}
      className={cn("cursor-pointer rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring", className)}
      onClick={() => onGoTo(mark.t)}
    >
      {children}
    </button>
  );
}
