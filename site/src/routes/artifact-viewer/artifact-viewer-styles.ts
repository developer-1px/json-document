export const artifactViewerStyles = {
  canvas: "min-h-[28rem] overflow-auto",
  document: "mx-auto max-w-2xl px-4 py-8 text-sm leading-6 text-foreground-default [&_h2]:mb-3 [&_h2]:mt-3 [&_h2]:text-page-title [&_h2]:font-semibold [&_h2]:tracking-page-title [&_h2]:text-foreground-strong [&_h3]:mt-8 [&_li]:mt-1",
  presentation: "grid min-h-[25rem] gap-3 sm:grid-cols-[4rem_1fr]",
  filmstrip: "flex gap-2 sm:flex-col",
  slide: "flex min-h-[24rem] flex-col justify-center rounded-surface bg-background-subtle px-8 py-10 sm:px-14 [&>h2]:mb-0 [&>h2]:mt-3 [&>h2]:max-w-2xl [&>h2]:text-page-title [&>h2]:font-semibold [&>h2]:tracking-page-title [&>h2]:text-foreground-strong [&>div]:mt-10 [&>div]:grid [&>div]:grid-cols-3 [&>div]:gap-2 [&>div>span]:rounded-control [&>div>span]:bg-background-canvas [&>div>span]:p-3 [&>div>span]:text-xs [&>div>span]:text-foreground-muted",
  sheet: "mx-auto min-w-[36rem] max-w-4xl rounded-surface bg-background-canvas shadow-surface",
  grid: "grid grid-cols-4",
  cell: "min-h-12 px-3 py-3 text-xs",
  composer: "grid grid-cols-[minmax(0,1fr)_auto] gap-2",
  context: "col-span-full flex gap-2 [&>span]:rounded-inline [&>span]:bg-background-accent-subtle [&>span]:px-2 [&>span]:py-1 [&>span]:text-xs [&>span]:font-medium [&>span]:text-foreground-accent",
  futureMap: "mt-8 border-t border-line-subtle/40 pt-6 [&>p]:m-0 [&>ol]:mt-4 [&>ol]:grid [&>ol]:list-none [&>ol]:gap-3 [&>ol]:p-0 sm:[&>ol]:grid-cols-3 [&_li]:grid [&_li]:gap-1 [&_li]:rounded-surface [&_li]:bg-background-subtle [&_li]:p-4 [&_li]:text-xs [&_li]:text-foreground-muted [&_strong]:text-foreground-strong",
} as const;
