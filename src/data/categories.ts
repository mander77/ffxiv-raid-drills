// The colour categories of every fight's ability list, with their names. They follow Exia's DT
// raid timeline sheet. The order here is the order of the colour key.
import type { Category } from "../types";

/** The name of each category. "spot" is the sheet's "Positioning Required". */
export const CATEGORIES: Record<Category, string> = {
  raid: "Raid Damage",
  tank: "Tank Damage",
  spot: "Positioning",
  dodge: "Avoidable AoE",
  target: "Targeted AoE",
  mech: "Mechanic",
  enrage: "Enrage",
};
