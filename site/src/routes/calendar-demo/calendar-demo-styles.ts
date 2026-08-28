import { tv } from "tailwind-variants";

const chipSelected = "data-[preview=true]:opacity-60 data-[selected=true]:font-semibold data-[selected=true]:text-foreground-strong data-[selected=true]:outline-none";
const chipRail = "relative before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground-default data-[calendar-color=accent]:before:bg-background-accent";
const chipFill = "bg-background-subtle text-foreground-strong data-[calendar-color=accent]:bg-background-accent-subtle data-[calendar-color=accent]:text-foreground-accent hover:bg-background-subtle data-[calendar-color=accent]:hover:bg-background-accent-subtle";

export const calendarDemoRecipe = tv({
  slots: {
    allDayEvent: `h-full w-full rounded-control border-0 px-2 py-0.5 text-left text-xs leading-4 ${chipFill} ${chipRail} ${chipSelected}`,
    hourRule: "absolute inset-x-0 border-t border-line-subtle/15",
    timedEvent: `flex h-full w-full flex-col items-stretch gap-0 overflow-hidden rounded-control border-0 px-2 py-0.5 pl-2.5 text-left text-xs leading-4 ${chipFill} ${chipRail} ${chipSelected}`,
    monthWeek: "relative grid min-w-[36rem] grid-cols-7 border-t border-line-subtle/30",
    monthDay: "relative z-0 flex min-h-32 w-full flex-col items-stretch px-1.5 pb-1 text-left text-xs",
    monthAllDay: `relative mx-0.5 h-5 w-full min-w-0 truncate rounded-control border-0 px-2 text-left text-[0.7rem] leading-5 ${chipFill} ${chipRail} ${chipSelected}`,
    monthTimed: `relative mx-0.5 flex h-5 w-full min-w-0 items-center justify-between gap-1 truncate rounded-control border-0 bg-transparent px-1 pl-2 text-left text-[0.7rem] leading-5 hover:bg-background-subtle ${chipRail} ${chipSelected}`,
    monthEvent: `relative mx-0.5 h-5 w-full min-w-0 truncate rounded-control border-0 px-2 text-left text-[0.7rem] leading-5 ${chipFill} ${chipRail} ${chipSelected}`,
    monthMore: "h-5 w-full truncate px-1 text-left text-[0.7rem] leading-5 text-foreground-muted",
    monthOverflow: "absolute left-0 top-0 z-30 flex w-max min-w-full max-w-56 flex-col gap-0.5 p-1.5",
    monthHead: "px-2 py-1.5 text-center text-xs text-foreground-muted",
    weekSticky: "z-30 shrink-0 border-b border-line-subtle/20 bg-background-canvas",
    weekHours: "min-h-0 flex-1 overflow-auto",
    weekHead: "flex flex-col items-center gap-0.5 px-1 py-2 text-center",
    weekCell: "relative",
    resizeEdge: "absolute z-20 appearance-none border-0 bg-transparent p-0 shadow-none",
    period: "px-1 text-sm font-medium text-foreground-strong",
    toolbarCluster: "flex items-center gap-1",

    yearMonth: "flex min-h-0 w-full flex-col gap-1 px-1 py-1 text-left",
    yearDay: "flex aspect-square w-full items-center justify-center text-[0.65rem]",
    yearDayBusy: "relative after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-foreground-muted",
    nowLine: "pointer-events-none absolute inset-x-0 z-20 border-t border-line-accent",
    today: "font-semibold text-foreground-accent",
    todayMark: "font-semibold text-foreground-strong",
    dayNumber: "inline-flex size-7 items-center justify-center text-sm font-medium",
    sidebar: "flex w-44 shrink-0 flex-col gap-3 overflow-auto pr-1",
    inspector: "flex w-72 min-w-0 shrink-0 flex-col gap-2 overflow-auto border-l border-line-subtle/30 pl-4",
    field: "grid gap-1",
    calendarToggle: "group w-full justify-start gap-2 border-0 bg-transparent px-1 shadow-none hover:border-0 hover:bg-transparent aria-pressed:border-0 aria-pressed:bg-transparent aria-pressed:text-foreground-strong aria-[pressed=false]:text-foreground-muted",
    calendarSwatch: "size-2.5 shrink-0 rounded-full bg-foreground-muted opacity-40 data-[calendar-color=accent]:bg-background-accent group-aria-pressed:opacity-100",
    eventTime: "truncate text-[0.65rem] font-normal text-foreground-muted",
    hourLabel: "absolute right-1 whitespace-nowrap text-right text-[0.65rem] tabular-nums leading-none text-foreground-muted",
  },
});
