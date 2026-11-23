import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CorrectIcon, IncorrectIcon } from "./icons";

export interface ResultBarProps {
  /** True for a correct result (green, a check mark), false for an incorrect one (red, a cross). */
  ok: boolean;
  /** What it says, and the buttons that go on from it. */
  children: ReactNode;
}

/** The bar over a Practice mechanic that says how you did: after a step that was not the spot, and
    at the end. */
export function ResultBar({ ok, children }: ResultBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2",
        ok ? "border-success-foreground bg-success" : "border-danger-foreground bg-danger",
      )}
    >
      {ok ? (
        <CorrectIcon aria-hidden="true" className="text-success-foreground" />
      ) : (
        <IncorrectIcon aria-hidden="true" className="text-danger-foreground" />
      )}
      {children}
    </div>
  );
}
