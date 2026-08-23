export const annotationDemoStyles = {
  canvasFrame: "relative min-w-0 overflow-hidden rounded-surface border border-line-subtle bg-background-subtle",
  canvas: "block h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-line-accent/35",
  commentCard: "absolute z-10 grid w-64 gap-2 rounded-surface border border-line-subtle bg-background-canvas p-3 shadow-overlay",
  commentHeader: "flex items-center justify-between gap-2",
  threadList: "grid content-start gap-2 p-3",
  threadButton: "grid w-full cursor-pointer gap-1 rounded-surface border border-line-subtle bg-background-canvas p-3 text-left outline-none hover:border-line-default focus-visible:ring-2 focus-visible:ring-line-accent/25 data-[selected=true]:border-line-accent data-[selected=true]:bg-background-subtle",
  structuredOutput: "m-0 max-h-64 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs",
} as const;
