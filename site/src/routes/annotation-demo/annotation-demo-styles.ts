import { floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { tv } from "tailwind-variants";

export const annotationDemoRecipe = tv({
  slots: {
    productCanvas: "!p-0",
    canvasFrame: "relative overflow-hidden rounded-surface bg-background-subtle",
    stage: "relative",
    canvas: "block h-auto w-full touch-none cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-line-accent/25",
    commentInput: "min-h-6 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto [field-sizing:content]",
    commentCard: `absolute z-10 flex w-[280px] items-center gap-related p-related ${floatingSurface.panel}`,
    commentPreview: `pointer-events-none absolute z-20 w-[280px] px-related py-related ${floatingSurface.panel}`,
    toolDock: `absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-related p-1 ${floatingSurface.control}`,
    structuredOutput: "m-0 max-h-64 overflow-auto whitespace-pre-wrap p-related font-mono text-xs",
  },
});
