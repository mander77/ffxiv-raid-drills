import { CATEGORIES, type Category } from "../data/abilities";
import { CategoryDots } from "./CategoryDots";

/** The colour key: every ability category with its mark. */
export function CategoryKey() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(CATEGORIES) as Category[]).map((c) => (
        <span key={c} className="inline-flex items-center gap-1">
          <CategoryDots cats={[c]} />
          {CATEGORIES[c]}
        </span>
      ))}
    </div>
  );
}
