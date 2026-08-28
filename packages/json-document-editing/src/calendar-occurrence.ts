import { Temporal } from "@js-temporal/polyfill";
import type { CalendarEvent, CalendarRecurrence } from "./calendar.js";
import {
  addCalendarDate,
  calendarDatePart,
  calendarEventBounds,
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
  if (from === null || to === null || Temporal.PlainDate.compare(from, to) >= 0) return [];
  const rangeFrom = from.toPlainDateTime();
  const rangeTo = to.toPlainDateTime();
  const occurrences: CalendarOccurrence[] = [];
  for (const event of events) {
    const recurrence = calendarEventRecurrence(event);
    if (recurrence === null) {
      const bounds = calendarEventBounds(event);
      if (bounds === null || Temporal.PlainDateTime.compare(bounds.to, rangeFrom) <= 0 || Temporal.PlainDateTime.compare(bounds.from, rangeTo) >= 0) continue;
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
      if (until !== null && Temporal.PlainDate.compare(bounds.from.toPlainDate(), until) > 0) break;
      if (Temporal.PlainDateTime.compare(bounds.from, rangeTo) >= 0) break;
      if (Temporal.PlainDateTime.compare(bounds.to, rangeFrom) > 0 && !excluded.has(calendarDatePart(shifted.start))) {
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
  if (parseCalendarDate(value) === null) return null;
  const duration = freq === "monthly" ? { months: steps } : { years: steps };
  return Temporal.PlainDate.from(value).add(duration, { overflow: "constrain" }).toString();
}

function shiftInstant(value: string, freq: CalendarRecurrence["freq"], steps: number): string | null {
  const dateTime = parseCalendarInstant(value);
  if (dateTime === null) return null;
  if (freq === "daily") return dateTime.add({ days: steps }).toString({ smallestUnit: "minute" });
  if (freq === "weekly") return dateTime.add({ weeks: steps }).toString({ smallestUnit: "minute" });
  const duration = freq === "monthly" ? { months: steps } : { years: steps };
  return Temporal.PlainDateTime.from(value).add(duration, { overflow: "constrain" }).toString({ smallestUnit: "minute" });
}
