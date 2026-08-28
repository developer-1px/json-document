import type { CalendarView } from "@interactive-os/json-document-editing";
import { parseHtmlDateValue } from "@interactive-os/json-document-ui-primitives-react";

export type CalendarSearch = {
  readonly view: CalendarView;
  readonly date: string;
};

const views: ReadonlySet<string> = new Set(["day", "week", "month", "year"]);

export const calendarSearchDefaults: CalendarSearch = {
  view: "week",
  date: "2026-05-25",
};

export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  return {
    view: parseView(search.view),
    date: parseSearchDate(search.date),
  };
}

function parseView(value: unknown): CalendarView {
  return typeof value === "string" && views.has(value)
    ? value as CalendarView
    : calendarSearchDefaults.view;
}

function parseSearchDate(value: unknown): string {
  if (typeof value !== "string") return calendarSearchDefaults.date;
  return parseHtmlDateValue("date", value) ?? calendarSearchDefaults.date;
}
