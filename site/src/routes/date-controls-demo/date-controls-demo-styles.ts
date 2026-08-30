import { tv } from "tailwind-variants";

export const dateControlsDemoRecipe = tv({
  slots: {
    monthRoot: "min-w-[36rem] overflow-hidden rounded-surface border border-line-subtle",
    monthHeaderRow: "grid grid-cols-7 border-b border-line-subtle",
    monthHeader: "p-2 text-center text-xs text-foreground-muted",
    monthWeek: "relative grid grid-cols-7 border-b border-line-subtle last:border-b-0",
    monthDay: "relative min-h-24 border-r border-line-subtle p-1 last:border-r-0",
    monthOutside: "text-foreground-muted",
    monthDayNumber: "text-xs",
    monthToday: "font-semibold text-foreground-accent",
    monthEventContainer: "relative z-10 min-w-0",
    monthAllDayEvent: "w-full truncate rounded-control bg-background-accent px-1 text-left text-xs text-foreground-inverse",
    monthTimedEvent: "flex w-full gap-1 truncate px-1 text-left text-xs",
    monthEventTitle: "truncate",
    monthEventTime: "text-foreground-muted",
    monthMore: "text-xs text-foreground-muted",
    monthOverflow: "absolute inset-1 z-20 rounded-surface border border-line-subtle bg-background-canvas p-2 shadow-overlay",
    monthOverflowEvent: "mt-1",
  },
});
