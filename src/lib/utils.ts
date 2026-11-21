import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Join class names, and let a later Tailwind class win over an earlier one for the same property
    (cn("px-2", "px-4") gives "px-4"). Every shadcn/ui component uses it. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
