import type { ComponentChildren } from "preact";

export interface HudPromptProps {
  /** The step count, such as "2/4". */
  count: string;
  /** The question or the answer to read. */
  text: string;
  /** An optional button on the right. */
  children?: ComponentChildren;
}

/** The prompt row of the HUD above the Practice arena. */
export function HudPrompt({count, text, children}: HudPromptProps) {
  return <div class="hud"><div class="hq"><b class="hcount">{count}</b><span>{text}</span>{children}</div></div>;
}
