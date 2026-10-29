import { tv } from "tailwind-variants";

export const animationDemo = tv({
  slots: {
    catalog: "grid gap-region",
    group: "grid gap-related",
    groupTitle: "text-xs font-medium uppercase tracking-overline text-foreground-muted",
    grid: "grid gap-related md:grid-cols-2",
    specimen: "grid gap-related",
    stage: "flex min-h-28 items-center p-group",
    wide: "md:col-span-2",
    copy: "flex items-center gap-related text-foreground-strong",
    identity: "w-full rounded-surface bg-background-canvas px-group py-related text-foreground-strong",
    bar: "w-full",
    massStage: "flex min-h-60 items-center justify-center overflow-hidden p-group",
    massFill: "w-full overflow-hidden rounded-surface",
  },
});
