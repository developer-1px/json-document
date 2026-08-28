import { Temporal } from "@js-temporal/polyfill";
import type { CalendarCalendar, CalendarDocument, CalendarEvent } from "./calendar.js";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const EPOCH_DATE = Temporal.PlainDate.from("1970-01-01");
const EPOCH_DATE_TIME = Temporal.PlainDateTime.from("1970-01-01T00:00");

export function calendarDocumentCalendars(document: CalendarDocument): ReadonlyArray<CalendarCalendar> {
  return Array.isArray(document.calendars) ? document.calendars : [];
}

export function calendarDocumentEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent> {
  return Array.isArray(document.events) ? document.events : [];
}

export function assertCalendarDocument(document: CalendarDocument): void {
  const calendarIds = new Set<string>();
  for (const calendar of calendarDocumentCalendars(document)) {
    if (calendar.id.length === 0) throw new Error("Calendar ids must not be empty.");
    if (calendarIds.has(calendar.id)) throw new Error(`Calendar id must be unique: ${JSON.stringify(calendar.id)}.`);
    if (typeof calendar.color !== "string" || calendar.color.length === 0) {
      throw new Error(`Calendar color must not be empty: ${JSON.stringify(calendar.id)}.`);
    }
    calendarIds.add(calendar.id);
  }
  const ids = new Set<string>();
  for (const event of calendarDocumentEvents(document)) {
    if (event.id.length === 0) throw new Error("Calendar event ids must not be empty.");
    if (ids.has(event.id)) throw new Error(`Calendar event id must be unique: ${JSON.stringify(event.id)}.`);
    const calendarId = typeof event.calendarId === "string" ? event.calendarId : "";
    if (calendarId.length > 0 && calendarIds.size > 0 && !calendarIds.has(calendarId)) {
      throw new Error(`Calendar event must belong to a calendar: ${JSON.stringify(event.id)}.`);
    }
    if (isCalendarAllDay(event)) {
      if (parseCalendarDate(event.start) === null || parseCalendarDate(event.end) === null) {
        throw new Error(`All-day calendar events must use date strings: ${JSON.stringify(event.id)}.`);
      }
    } else if (parseCalendarInstant(event.start) === null || parseCalendarInstant(event.end) === null) {
      throw new Error(`Calendar event times must be datetime-local strings: ${JSON.stringify(event.id)}.`);
    }
    if (event.start >= event.end) throw new Error(`Calendar event must end after it starts: ${JSON.stringify(event.id)}.`);
    ids.add(event.id);
  }
}

export function isCalendarAllDay(event: Pick<CalendarEvent, "allDay">): boolean {
  return event.allDay === true;
}

export function parseCalendarInstant(value: string): number | null {
  if (!DATETIME.test(value)) return null;
  try {
    return EPOCH_DATE_TIME.until(Temporal.PlainDateTime.from(value), { largestUnit: "minutes" }).total("minutes") * MINUTE_MS;
  } catch {
    return null;
  }
}

export function formatCalendarInstant(utc: number): string {
  return EPOCH_DATE_TIME.add({ minutes: utc / MINUTE_MS }).toString({ smallestUnit: "minute" });
}

export function parseCalendarDate(value: string): number | null {
  if (!DATE.test(value)) return null;
  try {
    return EPOCH_DATE.until(Temporal.PlainDate.from(value), { largestUnit: "days" }).days * DAY_MS;
  } catch {
    return null;
  }
}

export function formatCalendarDate(utc: number): string {
  return EPOCH_DATE.add({ days: utc / DAY_MS }).toString();
}

export function addCalendarDate(day: string, days: number): string | null {
  const utc = parseCalendarDate(day);
  if (utc === null) return null;
  return formatCalendarDate(utc + days * DAY_MS);
}

export function calendarAllDaySpan(originDay: string, targetDay: string): { readonly start: string; readonly end: string } | null {
  if (parseCalendarDate(originDay) === null || parseCalendarDate(targetDay) === null) return null;
  const start = originDay <= targetDay ? originDay : targetDay;
  const last = originDay <= targetDay ? targetDay : originDay;
  const end = addCalendarDate(last, 1);
  if (end === null) return null;
  return { start, end };
}

export function calendarShiftInstant(instant: string, minutes: number): string | null {
  const utc = parseCalendarInstant(instant);
  if (utc === null) return null;
  return formatCalendarInstant(utc + minutes * MINUTE_MS);
}

export function calendarInstantAt(day: string, minutesFromMidnight: number): string | null {
  const utc = parseCalendarInstant(`${day}T00:00`);
  if (utc === null) return null;
  const minutes = Math.max(0, Math.min(24 * 60, minutesFromMidnight));
  return formatCalendarInstant(utc + minutes * MINUTE_MS);
}

export function calendarDatePart(value: string): string {
  return value.slice(0, 10);
}

export function calendarEventBounds(
  event: Pick<CalendarEvent, "start" | "end" | "allDay">,
): { readonly from: number; readonly to: number } | null {
  if (isCalendarAllDay(event)) {
    const from = parseCalendarDate(event.start);
    const to = parseCalendarDate(event.end);
    if (from === null || to === null) return null;
    return { from, to };
  }
  const from = parseCalendarInstant(event.start);
  const to = parseCalendarInstant(event.end);
  if (from === null || to === null) return null;
  return { from, to };
}
