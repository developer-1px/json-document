import { tv } from "tailwind-variants";

export const calendarDemoRecipe = tv({
  slots: {
    allDayEvent: "h-full w-full border-0 bg-background-subtle px-1 text-left text-xs data-[preview=true]:opacity-60 data-[selected=true]:bg-background-subtle data-[selected=true]:outline-none",
    hourRule: "absolute inset-x-0 border-t border-line-subtle/40",
    timedEvent: "h-full w-full overflow-hidden border-0 bg-background-subtle px-1 py-0.5 text-left text-xs data-[preview=true]:opacity-60 data-[selected=true]:bg-background-subtle data-[selected=true]:outline-none",
    monthDay: "flex min-h-32 w-full flex-col items-stretch gap-0.5 px-1 py-1 text-left text-xs",
    monthEvent: "h-5 w-full truncate border-0 bg-background-subtle px-1 text-left text-[0.65rem] leading-5 data-[preview=true]:opacity-60 data-[selected=true]:bg-background-subtle data-[selected=true]:outline-none",
    monthMore: "h-5 w-full truncate px-1 text-left text-[0.65rem] leading-5",
    yearMonth: "flex min-h-0 w-full flex-col gap-1 px-1 py-1 text-left",
    yearDay: "flex aspect-square w-full items-center justify-center text-[0.65rem]",
    yearDayBusy: "bg-background-subtle font-semibold",
    nowLine: "pointer-events-none absolute inset-x-0 z-20 border-t border-line-accent",
    today: "font-semibold text-foreground-accent",
    sidebar: "flex w-44 shrink-0 flex-col gap-2",
    inspector: "flex w-72 min-w-0 shrink-0 flex-col gap-3",
    field: "grid gap-1",
    calendarToggle: "w-full justify-start",
  },
});
