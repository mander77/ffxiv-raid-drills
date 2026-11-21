import { CastBar } from "./CastBar";
import { FightPrompt } from "./FightPrompt";

/** The cast bar and the prompt together, over the arena or beside it, as the run shows them. The
    player places them apart: the cast bar always over the mechanic. */
export function FightHud() {
  return (
    <div className="space-y-2">
      <CastBar />
      <FightPrompt />
    </div>
  );
}
