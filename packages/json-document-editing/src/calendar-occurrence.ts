import type { CalendarEvent, CalendarRecurrence } from "./calendar.js";
import {
  addCalendarDate,
  calendarDatePart,
  calendarEventBounds,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  parseCalendarDate,
  parseCalendarInstant,
} from "./calendar-validation.js";

export type CalendarOccurrence = {
  readonly event: CalendarEvent;
  readonly start: string;
  readonly end: string;
};

export function calendarEventRecurrence(event: CalendarEvent): CalendarRecurrence | null {
  const value = event.recurrence;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const freq = value.freq;
  const interval = value.interval;
  if (
    (freq !== "daily" && freq !== "weekly" && freq !== "monthly" && freq !== "yearly")
    || typeof interval !== "number"
    || interval < 1
  ) return null;
  const until = typeof value.until === "string" ? value.until : "";
  return { freq, interval, until };
}

export function calendarEventExcludeDates(event: CalendarEvent): ReadonlyArray<string> {
  const value = event.excludeDates;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function projectCalendarOccurrences(
  events: ReadonlyArray<CalendarEvent>,
  rangeStart: string,
  rangeEnd: string,
): ReadonlyArray<CalendarOccurrence> {
  const from = parseCalendarDate(rangeStart);
  const to = parseCalendarDate(rangeEnd);
  if (from === null || to === null || from >= to) return [];
  const occurrences: CalendarOccurrence[] = [];
  for (const event of events) {
    const recurrence = calendarEventRecurrence(event);
    if (recurrence === null) {
      const bounds = calendarEventBounds(event);
      if (bounds === null || bounds.to <= from || bounds.from >= to) continue;
      occurrences.push({ event, start: event.start, end: event.end });
      continue;
    }
    const excluded = new Set(calendarEventExcludeDates(event));
    const until = recurrence.until === "" ? null : parseCalendarDate(recurrence.until);
    for (let index = 0; index < 400; index += 1) {
      const shifted = shiftOccurrence(event, recurrence.freq, recurrence.interval * index);
      if (shifted === null) break;
      const bounds = calendarEventBounds({ ...event, start: shifted.start, end: shifted.end });
      if (bounds === null) break;
      if (until !== null && bounds.from > until + 86_400_000 - 1) break;
      if (bounds.from >= to) break;
      if (bounds.to > from && !excluded.has(calendarDatePart(shifted.start))) {
        occurrences.push({ event, start: shifted.start, end: shifted.end });
      }
    }
  }
  return occurrences;
}

function shiftOccurrence(
  event: CalendarEvent,
  freq: CalendarRecurrence["freq"],
  steps: number,
): { readonly start: string; readonly end: string } | null {
  if (steps === 0) return { start: event.start, end: event.end };
  if (isCalendarAllDay(event)) {
    const start = shiftDate(event.start, freq, steps);
    const end = shiftDate(event.end, freq, steps);
    if (start === null || end === null) return null;
    return { start, end };
  }
  const start = shiftInstant(event.start, freq, steps);
  const end = shiftInstant(event.end, freq, steps);
  if (start === null || end === null) return null;
  return { start, end };
}

function shiftDate(value: string, freq: CalendarRecurrence["freq"], steps: number): string | null {
  if (freq === "daily") return addCalendarDate(value, steps);
  if (freq === "weekly") return addCalendarDate(value, steps * 7);
  const utc = parseCalendarDate(value);
  if (utc === null) return null;
  return formatCalendarDate(shiftMonthOrYear(utc, freq, steps));
}

function shiftInstant(value: string, freq: CalendarRecurrence["freq"], steps: number): string | null {
  const utc = parseCalendarInstant(value);
  if (utc === null) return null;
  if (freq === "daily") return formatCalendarInstant(utc + steps * 86_400_000);
  if (freq === "weekly") return formatCalendarInstant(utc + steps * 7 * 86_400_000);
  return formatCalendarInstant(shiftMonthOrYear(utc, freq, steps));
}

function shiftMonthOrYear(utc: number, freq: "monthly" | "yearly", steps: number): number {
  const date = new Date(utc);
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  date.setUTCDate(1);
  if (freq === "monthly") date.setUTCMonth(date.getUTCMonth() + steps);
  else date.setUTCFullYear(date.getUTCFullYear() + steps);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(day, lastDay), hours, minutes);
}
