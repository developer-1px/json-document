import { tv } from "tailwind-variants";

export const annotationDemoRecipe = tv({
  slots: {
    productCanvas: "!p-0",
    canvasFrame: "relative overflow-hidden rounded-surface bg-background-subtle",
    stage: "relative",
    canvas: "block h-auto w-full touch-none cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-line-accent/35",
    commentInput: "min-h-6 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto [field-sizing:content] !border-0 !bg-transparent !p-0 text-sm leading-6 text-foreground-strong !outline-none !ring-0 placeholder:text-foreground-muted",
    commentCard: "absolute z-10 flex w-[280px] items-center gap-1.5 rounded-surface border border-line-subtle bg-background-canvas px-2 py-1.5 shadow-overlay focus-within:border-line-accent",
    commentPreview: "pointer-events-none absolute z-20 w-[280px] rounded-surface rounded-bl-none border border-line-subtle bg-background-canvas px-3 py-2.5 text-sm leading-5 text-foreground-strong shadow-overlay",
    sendButton: "grid size-7 place-items-center rounded-full border-0 bg-background-accent p-0 text-foreground-inverse outline-none hover:bg-background-accent/90 focus-visible:ring-2 focus-visible:ring-line-accent/30 disabled:bg-background-subtle disabled:text-foreground-disabled",
    toolDock: "absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-surface border border-line-subtle bg-background-canvas/95 p-1.5 shadow-overlay backdrop-blur",
    dockButton: "grid size-9 place-items-center rounded-control border-0 bg-transparent text-foreground-muted outline-none hover:bg-background-subtle hover:text-foreground-strong aria-pressed:bg-background-accent aria-pressed:text-foreground-inverse focus-visible:ring-2 focus-visible:ring-line-accent/25 disabled:text-foreground-disabled",
    dockDivider: "mx-1 h-6 w-px bg-line-subtle",
  },
});
