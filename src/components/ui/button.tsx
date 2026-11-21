import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

// The site's buttons. shadcn/ui expects you to edit this file: the variants below carry the site's
// colours and sizes, so a page writes <Button variant="outline"> and no classes.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-[1.5px] border-transparent font-bold whitespace-nowrap transition-colors outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The green button: the main action.
        default: "border-heal bg-heal text-white hover:border-heal-ink hover:bg-heal-ink",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // White with a green edge: a second action next to a green one.
        outline: "border-heal bg-card text-heal hover:bg-heal-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Grey text and no edge, green on hover: a tool such as Share.
        ghost: "text-ink-2 hover:bg-heal-soft hover:text-heal",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Exact pixel text sizes keep the inherited line height (1.5), as on the old screens.
        default: "px-[18px] py-2.5 text-[15px]",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "gap-1.5 px-2.5 py-1.5 text-[14px]",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
