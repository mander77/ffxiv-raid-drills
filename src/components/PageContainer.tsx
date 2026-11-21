import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  className?: string;
  children: ReactNode;
}

/** The page width and side gutters, shared by the header and every page. On an extra-wide screen
    it widens, so the Pressure player's three columns leave the arena its full size. Tailwind's advice for a
    style used in many places is a component, not a string of class names. */
export function PageContainer({ className, children }: PageContainerProps) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 xl:max-w-7xl", className)}>{children}</div>;
}
