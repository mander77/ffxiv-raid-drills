import { CATEGORIES, type Category } from "../data/fights/m11s/abilities";
import { CategoryIcons } from "./CategoryIcons";

/** The key to the category icons: every ability category with its icon. */
export function CategoryKey() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(CATEGORIES) as Category[]).map((c) => (
        <span key={c} className="inline-flex items-center gap-1">
          <CategoryIcons cats={[c]} />
          {CATEGORIES[c]}
        </span>
      ))}
    </div>
  );
}
