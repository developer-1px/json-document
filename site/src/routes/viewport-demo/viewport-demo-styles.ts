import { tv } from "tailwind-variants";

export const viewportDemoRecipe = tv({
  slots: {
    viewport: "h-[34rem] overflow-y-auto rounded-surface border border-line-subtle bg-background-canvas p-3",
    userEntry: "ml-auto max-w-[88%] rounded-surface bg-background-accent-subtle px-4 py-3 text-foreground-strong",
    assistantEntry: "max-w-full rounded-surface bg-background-subtle px-4 py-3 text-foreground-strong",
    markdown: "grid gap-3 text-sm leading-6 [&_blockquote]:border-l-2 [&_blockquote]:border-line-accent [&_blockquote]:pl-3 [&_code]:font-mono [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:bg-background-canvas [&_pre]:p-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line-subtle [&_td]:p-2 [&_th]:border [&_th]:border-line-subtle [&_th]:p-2 [&_ul]:list-disc",
    evidence: "grid gap-2 text-xs [&_div]:grid [&_div]:grid-cols-[7rem_1fr] [&_div]:gap-2 [&_dt]:text-foreground-muted [&_dd]:break-all [&_dd]:font-mono [&_dd]:text-foreground-strong",
    newOutput: "rounded-control bg-background-accent-subtle px-3 py-2 text-xs font-medium text-foreground-accent",
  },
});
