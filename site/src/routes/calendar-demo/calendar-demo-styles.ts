import { tv } from "tailwind-variants";

export const calendarDemoRecipe = tv({
  slots: {
    allDayEvent: "h-full w-full px-1 text-left text-xs",
    hourRule: "absolute inset-x-0 border-t border-line-subtle/40",
    timedEvent: "h-full w-full overflow-hidden px-1 py-0.5 text-left text-xs",
    monthDay: "flex min-h-24 w-full flex-col items-start gap-1 px-2 py-2 text-left text-xs",
  },
});
