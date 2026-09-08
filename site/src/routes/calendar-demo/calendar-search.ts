import { parseCalendarView, type CalendarView } from "@interactive-os/json-document-editing";
import { parseHtmlDateValue } from "@interactive-os/json-document-calendar";

export type CalendarSearch = {
  readonly view: CalendarView;
  readonly date: string;
};

export const calendarSearchDefaults: CalendarSearch = {
  view: "week",
  date: "2026-05-25",
};

export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  return {
    view: parseCalendarView(search.view) ?? calendarSearchDefaults.view,
    date: parseSearchDate(search.date),
  };
}

function parseSearchDate(value: unknown): string {
  if (typeof value !== "string") return calendarSearchDefaults.date;
  return parseHtmlDateValue("date", value) ?? calendarSearchDefaults.date;
}
