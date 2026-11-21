import { Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareLink } from "../share";

export interface ShareButtonProps {
  className?: string;
}

/** Share in the header shares the address of the page you are on (see share.ts). When the link
    goes to the clipboard, a toast says so (shadcn/ui Sonner; the Toaster is in App.tsx). */
export function ShareButton({ className }: ShareButtonProps) {
  async function handleClick(): Promise<void> {
    if ((await shareLink()) === "copied") toast.success("Link copied");
  }

  return (
    <Button variant="ghost" size="sm" title="Share a link to this page as it is now" onClick={handleClick} className={className}>
      <Share aria-hidden="true" />
      Share
    </Button>
  );
}
