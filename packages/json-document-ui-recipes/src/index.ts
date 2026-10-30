import { previewPopover } from "./preview-popover.js";
import type { RecipeSpec } from "./types.js";

export type * from "./types.js";
export { previewPopover };

/** Every recipe of the UI Recipes v1 profile (standards/ui-recipes-v1/profile.md). */
export const recipeSpecs: readonly RecipeSpec[] = [previewPopover];

export function recipeSpec(id: string): RecipeSpec | undefined {
  return recipeSpecs.find((spec) => spec.recipe.id === id);
}
