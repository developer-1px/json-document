import { tv } from "tailwind-variants";

export const annotationDemoRecipe = tv({
  slots: {
    productCanvas: "!p-0",
    canvasFrame: "overflow-hidden rounded-surface bg-background-subtle",
    stage: "relative",
    canvas: "block h-auto w-full touch-none cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-line-accent/35",
    draftComposer: "absolute bottom-6 left-1/2 z-10 flex min-h-14 w-[380px] max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-surface border border-line-subtle bg-background-canvas px-4 py-3 shadow-overlay",
    draftIdentity: "size-6 shrink-0 rounded-full bg-background-accent",
    commentInput: "min-h-6 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto [field-sizing:content] border-0 bg-transparent p-0 text-sm leading-6 text-foreground-strong outline-none placeholder:text-foreground-muted",
    composerAction: "grid size-7 shrink-0 place-items-center border-0 bg-transparent p-0 text-foreground-muted hover:text-foreground-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-accent/25",
    composerDivider: "h-6 w-px bg-line-subtle",
    submitAction: "grid size-7 shrink-0 place-items-center border-0 bg-transparent p-0 text-foreground-accent hover:text-foreground-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-accent/25 disabled:text-foreground-disabled",
    threadCard: "absolute z-10 grid w-[320px] translate-x-4 translate-y-4 gap-3 rounded-surface border border-line-subtle bg-background-canvas p-4 shadow-overlay",
    threadHeader: "flex items-center gap-2",
    threadBadge: "grid size-6 place-items-center rounded-control bg-background-accent text-xs font-semibold text-foreground-inverse",
    threadMenu: "ml-auto grid size-7 place-items-center border-0 bg-transparent p-0 text-foreground-muted hover:text-foreground-strong",
    threadBody: "m-0 text-sm leading-6 text-foreground-strong",
    threadRule: "h-px bg-line-subtle/70",
    replyInput: "rounded-control border border-line-subtle bg-background-canvas px-3 py-2 text-sm text-foreground-strong outline-none placeholder:text-foreground-muted focus:border-line-accent focus:ring-2 focus:ring-line-accent/20",
  },
});
