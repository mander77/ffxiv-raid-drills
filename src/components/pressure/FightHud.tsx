import { CastBar } from "./CastBar";
import { FightPrompt } from "./FightPrompt";

/** The run's cast bar over its prompt, in the place where the player shows the cast bar over the
    mechanic: beside the arena, or over it. */
export function FightHud() {
  return (
    <div className="space-y-2">
      <CastBar />
      <FightPrompt />
    </div>
  );
}
