import { tv } from "tailwind-variants";

export const viewportPositionDemoRecipe = tv({
  slots: {
    viewport: "h-[34rem] overflow-y-auto rounded-surface border border-line-subtle bg-background-canvas p-related",
    userEntry: "ml-auto max-w-[88%] rounded-surface bg-background-accent-subtle px-group py-related text-foreground-strong",
    assistantEntry: "max-w-full rounded-surface bg-background-subtle px-group py-related text-foreground-strong",
    markdown: "grid gap-related text-sm leading-6 [&_blockquote]:border-l-2 [&_blockquote]:border-line-accent [&_blockquote]:pl-group [&_code]:font-mono [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-group [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:bg-background-canvas [&_pre]:p-related [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line-subtle [&_td]:p-related [&_th]:border [&_th]:border-line-subtle [&_th]:p-related [&_ul]:list-disc",
    evidence: "grid gap-related text-xs [&_div]:grid [&_div]:grid-cols-[7rem_1fr] [&_div]:gap-related [&_dt]:text-foreground-muted [&_dd]:break-all [&_dd]:font-mono [&_dd]:text-foreground-strong",
    reserve: "min-h-0 flex-none border-t border-dashed border-line-accent bg-background-accent-subtle/30 transition-[height]",
    readyState: "rounded-surface border border-dashed border-line-subtle p-region text-center text-sm text-foreground-muted",
  },
});
