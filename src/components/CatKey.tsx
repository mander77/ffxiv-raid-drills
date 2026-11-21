import { CATS, type Cat } from "../data/abilities";
import { Marks } from "./Marks";

/** The colour key: every ability category with its mark. */
export function CatKey() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(CATS) as Cat[]).map((c) => (
        <span key={c} className="inline-flex items-center gap-1">
          <Marks cats={[c]} />
          {CATS[c]}
        </span>
      ))}
    </div>
  );
}
