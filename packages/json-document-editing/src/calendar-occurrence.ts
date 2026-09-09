import { Temporal } from "@js-temporal/polyfill";
import type { CalendarEvent, CalendarOccurrencePoint, CalendarOccurrenceSelection, CalendarRecurrence } from "./calendar.js";
import {
  addCalendarDate,
  calendarDatePart,
  calendarEventBounds,
  calendarEventIntervalAt,
  calendarDaysBetween,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  isCalendarRecurrence,
  parseCalendarDate,
} from "./calendar-validation.js";

export type CalendarOccurrence = {
  readonly event: CalendarEvent;
  readonly start: string;
  readonly end: string;
};

export function calendarEventRecurrence(event: CalendarEvent): CalendarRecurrence | null {
  return isCalendarRecurrence(event.recurrence) ? event.recurrence : null;
}

export function calendarRecurrenceWithFrequency(
  current: CalendarRecurrence | null,
  value: unknown,
): CalendarRecurrence | null {
  if (value !== "daily" && value !== "weekly" && value !== "monthly" && value !== "yearly") return current;
  return { freq: value, interval: current?.interval ?? 1, until: current?.until ?? "" };
}

export function calendarRecurrenceWithInterval(
  current: CalendarRecurrence | null,
  value: unknown,
): CalendarRecurrence | null {
  if (current === null) return null;
  const numeric = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  const interval = Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : 1;
  return { ...current, interval };
}

export function calendarRecurrenceWithUntil(
  current: CalendarRecurrence | null,
  until: string,
): CalendarRecurrence | null {
  if (current === null) return null;
  return { ...current, until };
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
    const end = parseCalendarDate(calendarDatePart(event.end));
    if (end === null) continue;
    // Seek by the interval end, not start, so long occurrences overlapping the
    // window are retained. One preceding period covers constrained month/year ends.
    const distance = recurrence.freq === "monthly" ? (from.year - end.year) * 12 + from.month - end.month
      : recurrence.freq === "yearly" ? from.year - end.year
      : calendarDaysBetween(end, from) / (recurrence.freq === "weekly" ? 7 : 1);
    const first = Math.max(0, Math.floor(distance / recurrence.interval) - 1);
    for (let index = first; ; index += 1) {
      let shifted: ReturnType<typeof shiftOccurrence>;
      try { shifted = shiftOccurrence(event, recurrence.freq, recurrence.interval * index); }
      catch (error) {
        if (!(error instanceof RangeError)) throw error;
        break; // Beyond the finite Temporal date domain, not a truncated result.
      }
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

/** Resolve against the current recurrence/exclusion rules, including off-screen occurrences. */
export function resolveCalendarOccurrence(
  events: ReadonlyArray<CalendarEvent>,
  point: CalendarOccurrencePoint,
): CalendarOccurrenceSelection | null {
  const event = events.find((candidate) => candidate.id === point.eventId);
  if (event === undefined || typeof point.occurrenceStart !== "string") return null;
  const day = calendarDatePart(point.occurrenceStart);
  const next = addCalendarDate(day, 1);
  if (next === null) return null;
  const occurrence = projectCalendarOccurrences([event], day, next).find((candidate) => candidate.start === point.occurrenceStart);
  return occurrence === undefined ? null : { eventId: event.id, start: occurrence.start, end: occurrence.end };
}

function shiftOccurrence(
  event: CalendarEvent,
  freq: CalendarRecurrence["freq"],
  steps: number,
): { readonly start: string; readonly end: string } | null {
  if (steps === 0) return { start: event.start, end: event.end };
  const bounds = calendarEventBounds(event);
  if (bounds === null) return null;
  const duration = freq === "daily" ? { days: steps } : freq === "weekly" ? { weeks: steps }
    : freq === "monthly" ? { months: steps } : { years: steps };
  const shifted = bounds.from.add(duration, { overflow: "constrain" });
  const start = isCalendarAllDay(event) ? formatCalendarDate(shifted.toPlainDate()) : formatCalendarInstant(shifted);
  return calendarEventIntervalAt(event, start);
}
