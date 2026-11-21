/** Join class names, and let a later Tailwind class win over an earlier one for the same property
    (cn("px-2", "px-4") gives "px-4"). Every shadcn/ui component uses it. It comes from the cn
    package, which shadcn/ui sets up in place of clsx and tailwind-merge. */
export { cn } from "cn";
