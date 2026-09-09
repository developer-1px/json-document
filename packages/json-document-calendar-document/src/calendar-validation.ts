import { Temporal } from "@js-temporal/polyfill";
import { isJSONValue } from "@interactive-os/json-document";
import type { CalendarCalendar, CalendarDocument, CalendarEvent, CalendarRecurrence } from "./calendar-model.js";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
export function calendarDocumentCalendars(document: CalendarDocument): ReadonlyArray<CalendarCalendar> {
  return Array.isArray(document.calendars) ? document.calendars : [];
}

export function calendarDocumentCalendar(document: CalendarDocument, calendarId: string): CalendarCalendar | null {
  return calendarDocumentCalendars(document).find((calendar) => calendar.id === calendarId) ?? null;
}

export function calendarDocumentEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent> {
  return Array.isArray(document.events) ? document.events : [];
}

export function assertCalendarDocument(value: unknown): void {
  const result = validateCalendarDocument(value);
  if (!result.ok) throw new TypeError(result.reason);
}

/** Validate canonical JSON and Calendar invariants without creating an Editing session. */
export function validateCalendarDocument(value: unknown): CalendarValidationResult {
  if (!isJSONValue(value) || typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidCalendar("Calendar documents must be JSON objects.");
  }
  const document = value as unknown as CalendarDocument;
  if (!Array.isArray(document.events)) return invalidCalendar("Calendar events must be an array.");
  if (document.calendars !== undefined && !Array.isArray(document.calendars)) {
    return invalidCalendar("Calendar calendars must be an array when present.");
  }
  const calendarIds = new Set<string>();
  for (const calendar of calendarDocumentCalendars(document)) {
    if (typeof calendar !== "object" || calendar === null || Array.isArray(calendar)
      || typeof calendar.id !== "string" || calendar.id.length === 0) {
      return invalidCalendar("Calendar ids must be nonempty strings.");
    }
    if (calendarIds.has(calendar.id)) return invalidCalendar(`Calendar id must be unique: ${JSON.stringify(calendar.id)}.`);
    if (typeof calendar.title !== "string" || typeof calendar.hidden !== "boolean") {
      return invalidCalendar("Calendar title must be a string and hidden must be a boolean.");
    }
    if (typeof calendar.color !== "string" || calendar.color.length === 0) {
      return invalidCalendar(`Calendar color must not be empty: ${JSON.stringify(calendar.id)}.`);
    }
    calendarIds.add(calendar.id);
  }
  const ids = new Set<string>();
  for (const event of calendarDocumentEvents(document)) {
    const result = validateCalendarEvent(event, calendarIds);
    if (!result.ok) return result;
    if (ids.has(event.id)) return invalidCalendar(`Calendar event id must be unique: ${JSON.stringify(event.id)}.`);
    ids.add(event.id);
  }
  return { ok: true };
}

function invalidCalendar(reason: string): CalendarValidationResult {
  return { ok: false, code: "calendar.invalid-document", reason };
}

export type CalendarValidationResult = { readonly ok: true } | {
  readonly ok: false; readonly code: string; readonly reason: string;
};

/** One domain invariant shared by construction, edit planning and clipboard ingress. */
export function validateCalendarEvent(value: unknown, calendarIds?: ReadonlySet<string>): CalendarValidationResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, code: "event.invalid", reason: "Calendar events must be objects." };
  }
  const event = value as Record<string, unknown>;
  if (typeof event.id !== "string" || event.id.length === 0 || typeof event.title !== "string") {
    return { ok: false, code: "event.invalid", reason: "Calendar events require a nonempty id and a string title." };
  }
  if (typeof event.start !== "string" || typeof event.end !== "string"
    || (event.allDay !== undefined && typeof event.allDay !== "boolean")) {
    return { ok: false, code: "event.invalid-instant", reason: "Calendar events require canonical temporal values." };
  }
  const parse = event.allDay === true ? parseCalendarDate : parseCalendarInstant;
  if (parse(event.start) === null || parse(event.end) === null) {
    return { ok: false, code: "event.invalid-instant", reason: event.allDay === true
      ? `All-day calendar events must use date strings: ${JSON.stringify(event.id)}.`
      : `Calendar event times must be datetime-local strings: ${JSON.stringify(event.id)}.` };
  }
  if (event.start >= event.end) {
    return { ok: false, code: "event.invalid-interval", reason: `Calendar event must end after it starts: ${JSON.stringify(event.id)}.` };
  }
  if (event.calendarId !== undefined && typeof event.calendarId !== "string") {
    return { ok: false, code: "calendar.not-found", reason: "Calendar references must be strings." };
  }
  if (typeof event.calendarId === "string" && event.calendarId.length > 0
    && calendarIds !== undefined && calendarIds.size > 0 && !calendarIds.has(event.calendarId)) {
    return { ok: false, code: "calendar.not-found", reason: `Calendar event must belong to a calendar: ${JSON.stringify(event.id)}.` };
  }
  if (event.recurrence != null && !isCalendarRecurrence(event.recurrence)) {
    return { ok: false, code: "event.invalid-recurrence", reason: "Calendar recurrence requires a supported frequency, positive safe integer interval and canonical until date." };
  }
  if (event.excludeDates !== undefined && (!Array.isArray(event.excludeDates)
    || !event.excludeDates.every((date) => typeof date === "string" && parseCalendarDate(date) !== null))) {
    return { ok: false, code: "event.invalid-exclusions", reason: "Calendar exclusions must be canonical dates." };
  }
  return { ok: true };
}

export function isCalendarRecurrence(value: unknown): value is CalendarRecurrence {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const rule = value as Record<string, unknown>;
  return (rule.freq === "daily" || rule.freq === "weekly" || rule.freq === "monthly" || rule.freq === "yearly")
    && typeof rule.interval === "number" && Number.isSafeInteger(rule.interval) && rule.interval >= 1
    && typeof rule.until === "string" && (rule.until === "" || parseCalendarDate(rule.until) !== null);
}

export function isCalendarAllDay(event: Pick<CalendarEvent, "allDay">): boolean {
  return event.allDay === true;
}

export function parseCalendarInstant(value: string): Temporal.PlainDateTime | null {
  if (!DATETIME.test(value)) return null;
  try {
    return Temporal.PlainDateTime.from(value);
  } catch {
    return null;
  }
}

export function formatCalendarInstant(value: Temporal.PlainDateTime): string {
  return value.toString({ smallestUnit: "minute" });
}

export function parseCalendarDate(value: string): Temporal.PlainDate | null {
  if (!DATE.test(value)) return null;
  try {
    return Temporal.PlainDate.from(value);
  } catch {
    return null;
  }
}

export function formatCalendarDate(value: Temporal.PlainDate): string {
  return value.toString();
}

export function addCalendarDate(day: string, days: number): string | null {
  const date = parseCalendarDate(day);
  if (date === null) return null;
  return formatCalendarDate(date.add({ days }));
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
  const dateTime = parseCalendarInstant(instant);
  if (dateTime === null) return null;
  return formatCalendarInstant(dateTime.add({ minutes }));
}

export function calendarInstantAt(day: string, minutesFromMidnight: number): string | null {
  const dateTime = parseCalendarInstant(`${day}T00:00`);
  if (dateTime === null) return null;
  const minutes = Math.max(0, Math.min(24 * 60, minutesFromMidnight));
  return formatCalendarInstant(dateTime.add({ minutes }));
}

export function calendarDatePart(value: string): string {
  return value.slice(0, 10);
}

export function calendarIntervalLastDate(start: string, end: string, allDay: boolean): string {
  const first = calendarDatePart(start);
  let last = calendarDatePart(end);
  const endInstant = parseCalendarInstant(end);
  const endsAtDateBoundary = !end.includes("T")
    || (endInstant !== null && endInstant.hour === 0 && endInstant.minute === 0);
  if (allDay || endsAtDateBoundary) last = addCalendarDate(last, -1) ?? first;
  return last < first ? first : last;
}

export function calendarEventBounds(
  event: Pick<CalendarEvent, "start" | "end" | "allDay">,
): { readonly from: Temporal.PlainDateTime; readonly to: Temporal.PlainDateTime } | null {
  if (isCalendarAllDay(event)) {
    const from = parseCalendarDate(event.start);
    const to = parseCalendarDate(event.end);
    if (from === null || to === null) return null;
    return { from: from.toPlainDateTime(), to: to.toPlainDateTime() };
  }
  const from = parseCalendarInstant(event.start);
  const to = parseCalendarInstant(event.end);
  if (from === null || to === null) return null;
  return { from, to };
}

export function calendarDaysBetween(from: Temporal.PlainDate, to: Temporal.PlainDate): number {
  return from.until(to, { largestUnit: "days" }).days;
}

export function calendarMinutesBetween(from: Temporal.PlainDateTime, to: Temporal.PlainDateTime): number {
  return from.until(to, { largestUnit: "minutes" }).total("minutes");
}

/** Move a Calendar interval without changing its local duration. */
export function calendarEventIntervalAt(
  event: Pick<CalendarEvent, "start" | "end" | "allDay">,
  start: string,
): { readonly start: string; readonly end: string } | null {
  const bounds = calendarEventBounds(event);
  const next = isCalendarAllDay(event) ? parseCalendarDate(start)?.toPlainDateTime() : parseCalendarInstant(start);
  if (bounds === null || next == null) return null;
  const end = next.add({ minutes: calendarMinutesBetween(bounds.from, bounds.to) });
  return { start, end: isCalendarAllDay(event) ? formatCalendarDate(end.toPlainDate()) : formatCalendarInstant(end) };
}
