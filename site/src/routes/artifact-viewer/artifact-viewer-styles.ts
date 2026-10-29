import { tv } from "tailwind-variants";

export const artifactViewerRecipe = tv({
  slots: {
    canvas: "min-h-[28rem] overflow-auto",
    document: "grid content-start gap-group justify-self-center max-w-2xl px-group py-region text-sm leading-6 text-foreground-default [&_h2]:text-page-title [&_h2]:font-semibold [&_h2]:tracking-page-title [&_h2]:text-foreground-strong [&_ul]:m-0 [&_ul]:grid [&_ul]:gap-related",
    presentation: "grid min-h-[25rem] gap-related sm:grid-cols-[4rem_1fr]",
    filmstrip: "flex gap-related sm:flex-col",
    slide: "flex gap-region min-h-[24rem] flex-col justify-center rounded-surface bg-background-subtle px-region py-region sm:px-region [&_h2]:m-0 [&_h2]:max-w-2xl [&_h2]:text-page-title [&_h2]:font-semibold [&_h2]:tracking-page-title [&_h2]:text-foreground-strong [&>div]:grid [&>div]:grid-cols-3 [&>div]:gap-related [&>div>span]:rounded-control [&>div>span]:bg-background-canvas [&>div>span]:p-related [&>div>span]:text-xs [&>div>span]:text-foreground-muted",
    sheet: "mx-auto min-w-[36rem] max-w-4xl rounded-surface bg-background-canvas shadow-surface",
    grid: "grid grid-cols-4",
    cell: "min-h-12 px-related py-related text-xs",
    composer: "grid grid-cols-[minmax(0,1fr)_auto] gap-related",
    context: "col-span-full flex gap-related [&>span]:rounded-tight [&>span]:bg-background-accent-subtle [&>span]:px-related [&>span]:py-1 [&>span]:text-xs [&>span]:font-medium [&>span]:text-foreground-accent",
    futureMap: "grid content-start gap-group border-t border-line-subtle/40 pt-group [&>p]:m-0 [&>ol]:m-0 [&>ol]:grid [&>ol]:list-none [&>ol]:gap-related [&>ol]:p-0 sm:[&>ol]:grid-cols-3 [&_li]:grid [&_li]:gap-related [&_li]:rounded-surface [&_li]:bg-background-subtle [&_li]:p-group [&_li]:text-xs [&_li]:text-foreground-muted [&_strong]:text-foreground-strong",
  },
});
