import { tv } from "tailwind-variants";

export const animationDemo = tv({
  slots: {
    catalog: "grid gap-8",
    group: "grid gap-3",
    groupTitle: "text-xs font-medium uppercase tracking-overline text-foreground-muted",
    grid: "grid gap-3 md:grid-cols-2",
    specimen: "grid gap-2",
    stage: "flex min-h-28 items-center p-5",
    wide: "md:col-span-2",
    copy: "flex items-center gap-3 text-foreground-strong",
    identity: "w-full rounded-surface bg-background-canvas px-4 py-3 text-foreground-strong",
    bar: "w-full",
    massStage: "flex min-h-60 items-center justify-center overflow-hidden p-4",
    massFill: "w-full overflow-hidden rounded-surface",
  },
});
