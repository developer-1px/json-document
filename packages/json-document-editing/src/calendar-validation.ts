import type { CalendarCalendar, CalendarDocument, CalendarEvent } from "./calendar.js";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

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
  const match = DATETIME.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(utc);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    || date.getUTCHours() !== hour
    || date.getUTCMinutes() !== minute
  ) return null;
  return utc;
}

export function formatCalendarInstant(utc: number): string {
  const date = new Date(utc);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function parseCalendarDate(value: string): number | null {
  const match = DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return utc;
}

export function formatCalendarDate(utc: number): string {
  const date = new Date(utc);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addCalendarDate(day: string, days: number): string | null {
  const utc = parseCalendarDate(day);
  if (utc === null) return null;
  return formatCalendarDate(utc + days * DAY_MS);
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

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}
