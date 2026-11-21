import { CATS, type Cat } from "../data/abilities";
import { Marks } from "./Marks";

/** The colour key: every ability category with its mark. */
export function CatKey() {
  return (
    <div className="mb-1.5 flex flex-wrap gap-x-2.5 gap-y-[3px] pb-2 text-[12px] text-ink-2">
      {(Object.keys(CATS) as Cat[]).map((c) => (
        <span key={c} className="inline-flex items-center gap-1">
          <Marks cats={[c]} />
          {CATS[c]}
        </span>
      ))}
    </div>
  );
}
