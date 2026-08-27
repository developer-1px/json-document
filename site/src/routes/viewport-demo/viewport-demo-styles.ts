import { tv } from "tailwind-variants";

export const viewportDemoRecipe = tv({
  slots: {
    viewport: "h-72 overflow-y-auto rounded-surface border border-line-subtle bg-background-canvas p-3",
    row: "rounded-control bg-background-subtle px-3 py-4",
  },
});
