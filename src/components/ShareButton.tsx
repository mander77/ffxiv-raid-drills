import { Share } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTimeout } from "@/hooks/useTimeout";
import { shareLink } from "../share";

/** How long "Link copied" shows before the button says "Share" again. */
const COPIED_MS = 2000;

export interface ShareButtonProps {
  className?: string;
}

/** Share in the header shares the address of the page you are on (see share.ts). */
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
    <Button variant="ghost" size="sm" title="Share a link to this page as it is now" onClick={handleClick} className={className}>
      <Share aria-hidden="true" />
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
