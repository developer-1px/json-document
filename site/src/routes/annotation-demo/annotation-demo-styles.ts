export const annotationDemoStyles = {
  canvasFrame: "min-w-0 overflow-auto rounded-surface border border-line-subtle bg-background-subtle",
  stage: "relative min-w-full",
  canvas: "block h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-line-accent/35",
  commentCard: "absolute z-10 grid w-64 gap-2 rounded-surface border border-line-accent/60 bg-background-canvas p-3 shadow-overlay",
  connectorLeft: "absolute left-full top-1/2 h-px w-3 bg-line-accent",
  connectorRight: "absolute right-full top-1/2 h-px w-3 bg-line-accent",
  commentHeader: "flex items-center justify-between gap-2",
  threadList: "grid content-start gap-2 p-3",
  threadButton: "grid w-full cursor-pointer gap-1 rounded-surface border border-line-subtle bg-background-canvas p-3 text-left outline-none hover:border-line-default focus-visible:ring-2 focus-visible:ring-line-accent/25 data-[selected=true]:border-line-accent data-[selected=true]:bg-background-subtle",
  structuredOutput: "m-0 max-h-64 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs",
  uploadControl: "inline-flex cursor-pointer items-center rounded-none border border-line-subtle bg-background-canvas px-3 py-2 text-xs font-medium text-foreground-strong shadow-control-prominent hover:border-line-default hover:bg-background-subtle focus-within:border-line-accent focus-within:ring-2 focus-within:ring-line-accent/25",
} as const;
