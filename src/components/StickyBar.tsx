import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StickyBarProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Holds a prompt bar. Below lg it sticks to the top of the screen while the page scrolls (the
    header scrolls away there), on a band of the page's colour, so the question and its buttons stay
    in view and nothing shows through. A sticky box stays only inside its parent: put it straight in
    the box that holds everything it asks about. */
export function StickyBar({ children, className, style }: StickyBarProps) {
  return (
    <div className={cn("max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:bg-background max-lg:py-2", className)} style={style}>
      {children}
    </div>
  );
}
