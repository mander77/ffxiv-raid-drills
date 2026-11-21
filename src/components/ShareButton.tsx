import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTimeout } from "@/hooks/useTimeout";
import { shareLink } from "../share";

/** How long "Link copied" shows before the button says "Share" again. */
const COPIED_MS = 2000;

export interface ShareButtonProps {
  className?: string;
}

/** Share in the header shares the address of the screen you are on (see share.ts). It is a tool,
    not part of who you are, so it stays quiet: grey text, green on hover. */
export function ShareButton({ className }: ShareButtonProps) {
  // TS note: useState keeps a value between draws and gives a function to change it. A change
  // draws the component again. The type (boolean) comes from the first value.
  const [copied, setCopied] = useState(false);
  const later = useTimeout();

  async function handleClick(): Promise<void> {
    if ((await shareLink()) !== "copied") return;
    setCopied(true);
    later(() => setCopied(false), COPIED_MS);
  }

  return (
    <Button variant="ghost" size="sm" title="Share a link to this screen as it is now" onClick={handleClick} className={className}>
      {/* The usual share icon: a box with an arrow pointing up out of it. */}
      <svg
        className="size-[17px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
      </svg>
      <span>{copied ? "Link copied" : "Share"}</span>
    </Button>
  );
}
