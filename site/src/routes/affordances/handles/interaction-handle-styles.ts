import { tv } from "tailwind-variants";

export const interactionHandleRecipe = tv({
  slots: {
    card: "absolute h-20 w-40 border border-line-default bg-background-canvas p-3",
    dragHandle: "absolute left-2 top-2 border-0 bg-transparent p-1 text-foreground-muted",
    label: "text-sm",
    resizePanel: "absolute left-52 top-24 h-20 border border-line-default bg-background-canvas p-3",
    resizeHandle: "absolute inset-y-0 right-0 w-2 border-0 bg-line-accent/30 p-0",
    controlPlane: "absolute right-10 top-3 h-28 w-28 border border-dashed border-line-default",
    controlHandle: "absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background-canvas bg-line-accent p-0",
  },
});
