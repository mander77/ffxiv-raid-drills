import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface IconButtonProps {
  /** The button's name, read out and shown as its tooltip. */
  label: string;
  onClick: () => void;
  /** The look of the button, one of shadcn's Button variants. Ghost by default. */
  // TS note: ComponentProps<typeof Button> is the props Button takes; ["variant"] picks one of them.
  variant?: ComponentProps<typeof Button>["variant"];
  /** A lucide icon. */
  children: ReactNode;
}

/** A small button with only an icon, with its name as a tooltip. */
export function IconButton({ label, onClick, variant = "ghost", children }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
