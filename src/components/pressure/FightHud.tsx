import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFightFrame } from "../../hooks/useFightFrame";
import { castOf, type Prompt, promptOf } from "../../lib/fight";

/* In the game, the boss's cast bar and the floor are in the middle of the screen. The HUD puts the
   same things right above the arena floor: a cast bar for the next timeline line, and your prompt
   with the seconds left to your hit (the step number while paused). */

/** The border and background of the prompt, per look. Complete class names, so Tailwind finds them. */
const PROMPT_LOOK: Record<Prompt["look"], string> = {
  ask: "bg-card",
  urgent: "border-destructive bg-red-50 text-destructive",
  idle: "bg-card text-muted-foreground",
  ok: "border-green-600 bg-green-50 text-green-800",
  bad: "border-destructive bg-red-50 text-destructive",
  later: "border-violet-500 bg-violet-50 text-violet-800",
};

/** The cast bar and the prompt over the arena. */
export function FightHud() {
  return (
    <div className="space-y-2">
      <CastBar />
      <FightPrompt />
    </div>
  );
}

/** The boss's cast bar: the next line of the timeline. Each frame moves its fill and time. */
function CastBar() {
  const fill = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLSpanElement>(null);
  const [cast, setCast] = useState({ casting: false, name: "" });
  useFightFrame((s) => {
    const c = castOf(s);
    if (fill.current) fill.current.style.width = `${(c.fill * 100).toFixed(1)}%`;
    if (left.current && left.current.textContent !== c.left) left.current.textContent = c.left;
    // A state setter draws again only when the value changes, so these change only now and then.
    setCast((was) => (was.casting === c.casting && was.name === c.name ? was : { casting: c.casting, name: c.name }));
  });
  return (
    <div className="relative h-7 overflow-hidden rounded-md border bg-muted text-sm">
      <div ref={fill} className="absolute inset-y-0 left-0 w-0 bg-amber-300" aria-hidden="true" />
      <div className={cn("relative flex h-full items-center justify-between gap-2 px-2", !cast.casting && "text-muted-foreground")}>
        <span className="truncate font-medium">{cast.name}</span>
        <span ref={left} className="tabular-nums" />
      </div>
    </div>
  );
}

/** Your prompt: the question (the right move on the player), its result in the run, or the next
    mechanic. The seconds left change on every frame. */
function FightPrompt() {
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
