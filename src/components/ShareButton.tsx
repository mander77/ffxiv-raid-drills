import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  // draws the component again. The type (number) comes from the first value.
  // Here it counts the copies, so each copy, also a second one, starts the two seconds again.
  const [copies, setCopies] = useState(0);
  const [copied, setCopied] = useState(false);
  // TS note: useEffect runs after a draw, and again when a value in its list changes. The function
  // it returns runs before the next run and when the button leaves the page, like Dispose in C#.
  // Here it stops the timer.
  useEffect(() => {
    if (!copies) return;
    setCopied(true);
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copies]);

  const share = async (): Promise<void> => {
    if ((await shareLink()) === "copied") setCopies((n) => n + 1);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      title="Share a link to this screen as it is now"
      onClick={share}
      className={cn(
        "h-auto gap-1.5 rounded-lg has-[>svg]:px-2.5 border-[1.5px] border-transparent px-2.5 py-1.5 text-[14px] font-bold text-ink-2 hover:bg-heal-soft hover:text-heal focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
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
