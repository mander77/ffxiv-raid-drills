import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import type { MapDrill } from "../../types";

export interface MechanicListProps {
  items: readonly MapDrill[];
  /** The mechanic on screen. */
  current: string;
  className?: string;
}

/** The list beside the arena on a wide screen: every mechanic in fight order, under its phase.
    It scrolls by itself, and keeps the mechanic on screen in view. */
export function MechanicList({ items, current, className }: MechanicListProps) {
  const on = useRef<HTMLAnchorElement>(null);
  // Keep the mechanic on screen in view when the list scrolls.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect runs for each new mechanic on purpose.
  useEffect(() => {
    on.current?.scrollIntoView({ block: "nearest" });
  }, [current]);

  // TS note: reduce builds the list of phases, each with its mechanics, in fight order.
  const phases = items.reduce<{ name: string; items: MapDrill[] }[]>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.name === m.phase) last.items.push(m);
    else acc.push({ name: m.phase, items: [m] });
    return acc;
  }, []);

  return (
    // isolate: the sticky phase headings stack inside the list, never over the page header.
    <nav
      aria-label="Mechanics"
      className={cn("isolate max-h-[calc(100vh-12rem)] overflow-y-auto rounded-xl border bg-card p-2", className)}
    >
      {phases.map((ph) => {
        const [num, name = ""] = ph.name.split(": ");
        return (
          <section key={ph.name} className="mb-2">
            <h3 className="sticky top-0 z-10 rounded-md bg-primary px-2 py-1.5 text-primary-foreground">
              <span className="block text-[10px] font-semibold tracking-widest uppercase opacity-80">{num}</span>
              <span className="text-sm font-semibold">{name}</span>
            </h3>
            <ol className="mt-1 space-y-0.5">
              {ph.items.map((m) => (
                <li key={m.id}>
                  <Link
                    ref={m.id === current ? on : undefined}
                    to={`/map/${m.id}`}
                    aria-current={m.id === current ? "step" : undefined}
                    className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent aria-[current=step]:bg-accent aria-[current=step]:font-semibold"
                  >
                    <span className="block font-mono text-[11px] text-muted-foreground">{m.time}</span>
                    {m.title}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </nav>
  );
}
