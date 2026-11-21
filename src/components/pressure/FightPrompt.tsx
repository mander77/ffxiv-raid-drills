import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { type Prompt, promptOf } from "../../lib/fight";

/** The border and background of the prompt, per look. Complete class names, so Tailwind finds them. */
const PROMPT_LOOK: Record<Prompt["look"], string> = {
  ask: "bg-card",
  urgent: "border-danger-foreground bg-danger text-danger-foreground",
  idle: "bg-card text-muted-foreground",
  ok: "border-success-foreground bg-success text-success-foreground",
  bad: "border-danger-foreground bg-danger text-danger-foreground",
  later: "border-later-foreground bg-later text-later-foreground",
};

/** The run's prompt: the question, its result, or the next mechanic. The seconds left change on
    every frame. (The player shows the question and its right move in the mechanic's step box.) */
export function FightPrompt() {
  // It is two lines tall even for one line of text, so a longer prompt does not push the arena
  // down past the bottom of the screen.
  const count = useRef<HTMLSpanElement>(null);
  const [prompt, setPrompt] = useState<{ look: Prompt["look"]; text: string; counts: boolean }>({ look: "idle", text: "", counts: false });
  useFightFrame((s) => {
    const p = promptOf(s);
    if (count.current && count.current.textContent !== p.count) count.current.textContent = p.count;
    const counts = p.count !== "";
    setPrompt((was) =>
      was.look === p.look && was.text === p.text && was.counts === counts ? was : { look: p.look, text: p.text, counts },
    );
  });
  return (
    <div className={cn("flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2", PROMPT_LOOK[prompt.look])}>
      <Badge variant="secondary" className={cn("min-w-10 font-mono tabular-nums", !prompt.counts && "hidden")}>
        <span ref={count} />
      </Badge>
      <p className="flex-1 text-sm font-medium" aria-live="polite">
        {prompt.text}
      </p>
    </div>
  );
}
