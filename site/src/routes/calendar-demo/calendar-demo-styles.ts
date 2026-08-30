import { tv } from "tailwind-variants";

const chipSelected = "data-[preview=true]:opacity-60 data-[selected=true]:font-semibold data-[selected=true]:text-foreground-strong data-[selected=true]:ring-1 data-[selected=true]:ring-line-strong/30 data-[primary=true]:ring-2 data-[primary=true]:ring-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong";
const chipRail = "relative before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground-default data-[calendar-color=accent]:before:bg-background-accent";
const chipFill = "bg-background-subtle text-foreground-strong data-[calendar-color=accent]:bg-background-accent-subtle data-[calendar-color=accent]:text-foreground-accent hover:bg-background-subtle data-[calendar-color=accent]:hover:bg-background-accent-subtle";

export const calendarDemoRecipe = tv({
  slots: {
    allDayEvent: `h-full w-full rounded-control border-0 px-2 py-0.5 text-left text-xs leading-4 ${chipFill} ${chipRail} ${chipSelected}`,
    hourRule: "absolute inset-x-0 border-t border-line-subtle/15",
    timedEvent: `group flex h-full w-full flex-col items-stretch gap-0 overflow-hidden rounded-control border-0 px-2 py-0.5 pl-2.5 text-left text-xs leading-4 ${chipFill} ${chipRail} ${chipSelected}`,
    monthWeek: "relative grid min-w-[36rem] grid-cols-7 border-t border-line-subtle/30",
    monthDay: "relative z-0 flex min-h-32 w-full flex-col items-stretch px-1.5 pb-1 text-left text-xs data-[selected=true]:bg-background-accent-subtle data-[selected=true]:ring-2 data-[selected=true]:ring-inset data-[selected=true]:ring-line-strong",
    monthAllDay: `relative mx-0.5 h-5 w-full min-w-0 truncate rounded-control border-0 px-2 text-left text-xs leading-5 ${chipFill} ${chipRail} ${chipSelected}`,
    monthTimed: `relative mx-0.5 flex h-5 w-full min-w-0 items-center justify-between gap-1 truncate rounded-control border-0 bg-transparent px-1 pl-2 text-left text-xs leading-5 hover:bg-background-subtle ${chipRail} ${chipSelected}`,
    monthEvent: `relative mx-0.5 h-5 w-full min-w-0 truncate rounded-control border-0 px-2 text-left text-xs leading-5 ${chipFill} ${chipRail} ${chipSelected}`,
    monthMore: "relative z-10 h-5 w-full truncate border-0 bg-transparent px-1 text-left text-xs leading-5 text-foreground-muted shadow-none hover:border-0 hover:bg-transparent",
    quietAction: "border-0 bg-transparent p-0 shadow-none hover:border-0 hover:bg-transparent",
    monthOverflow: "absolute left-0 top-0 z-30 flex w-max min-w-full max-w-56 flex-col gap-0.5 p-1.5",
    monthHead: "px-2 py-1.5 text-center text-xs text-foreground-muted",
    weekSticky: "z-30 shrink-0 border-b border-line-subtle/20 bg-background-canvas",
    weekHours: "min-h-0 flex-1 overflow-auto",
    weekHead: "flex flex-col items-center gap-0.5 px-1 py-2 text-center",
    weekCell: "relative data-[selected=true]:bg-background-accent-subtle data-[selected=true]:ring-2 data-[selected=true]:ring-inset data-[selected=true]:ring-line-strong",
    selectedSlot: "pointer-events-none absolute inset-x-0 z-10 rounded-control bg-background-accent-subtle ring-2 ring-inset ring-line-strong",
    resizeEdge: "absolute z-20 appearance-none border-0 bg-transparent p-0 shadow-none",
    period: "px-1 text-sm font-medium text-foreground-strong",
    contextualActions: "relative z-40 flex min-h-8 min-w-8 items-center justify-end gap-1 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-line-accent/25",
    contextualSidebar: "relative z-30 w-20 shrink-0 rounded-control px-1 py-2 outline-none transition-[width] focus-within:w-44 hover:w-44 focus-visible:ring-2 focus-visible:ring-line-accent/25",
    sidebarHint: "block text-center text-overline text-foreground-muted [writing-mode:vertical-rl]",

    yearMonth: "flex min-h-0 w-full flex-col gap-1 px-1 py-1 text-left",
    yearDay: "flex aspect-square w-full items-center justify-center border-0 bg-transparent p-0 text-overline shadow-none hover:border-0 hover:bg-transparent",
    yearDayBusy: "relative after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-foreground-muted",
    nowLine: "pointer-events-none absolute inset-x-0 z-20 border-t border-line-accent",
    today: "font-semibold text-foreground-accent",
    todayMark: "font-semibold text-foreground-strong",
    dayNumber: "inline-flex size-7 items-center justify-center text-sm font-medium",
    sidebar: "flex w-44 shrink-0 flex-col gap-3 overflow-auto pr-1",
    inspector: "z-40 flex w-72 min-w-0 flex-col gap-2 overflow-auto p-3",
    field: "grid gap-1",
    inspectorTitle: "px-0 text-base font-semibold",
    calendarToggle: "group w-full justify-start gap-2 border-0 bg-transparent px-1 shadow-none hover:border-0 hover:bg-transparent aria-pressed:border-0 aria-pressed:bg-transparent aria-pressed:text-foreground-strong aria-[pressed=false]:text-foreground-muted",
    calendarSwatch: "size-2.5 shrink-0 rounded-full bg-foreground-muted opacity-40 data-[calendar-color=accent]:bg-background-accent group-aria-pressed:opacity-100",
    eventTime: "truncate text-overline font-normal text-foreground-muted",
    creationTimeHint: "pointer-events-none absolute inset-x-0 z-20 flex items-center gap-1 border-t border-line-accent text-overline text-foreground-accent",
    hourLabel: "absolute right-1 whitespace-nowrap text-right text-overline tabular-nums leading-none text-foreground-muted",
  },
});
