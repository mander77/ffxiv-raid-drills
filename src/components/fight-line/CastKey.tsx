import { cn } from "@/lib/utils";

export interface CastKeyProps {
  className?: string;
}

/** The key to the squares on the timeline of the casts coming up: an outlined square is the boss's
    cast, which starts a mechanic; a filled one is a hit, when damage goes off. */
export function CastKey({ className }: CastKeyProps) {
  return (
    <p className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-sm border-2 border-dashed border-muted-foreground" aria-hidden="true" />
        Cast
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-sm bg-muted-foreground" aria-hidden="true" />
        Hit
      </span>
    </p>
  );
}
