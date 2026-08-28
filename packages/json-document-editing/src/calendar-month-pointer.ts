import type { CalendarEvent, CalendarIntent } from "./calendar.js";
import { calendarEventRecurrence } from "./calendar-occurrence.js";
import { addCalendarDate, calendarAllDaySpan, calendarDatePart, calendarDaysBetween, isCalendarAllDay, parseCalendarDate } from "./calendar-validation.js";

export type CalendarMonthPointerRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
  readonly originEventStart?: string | null;
  readonly targetDay: string;
  readonly eventsOnTargetDay: ReadonlyArray<{ readonly id: string }>;
};

export type CalendarMonthPointerIntent = Extract<
  CalendarIntent,
  { type: "event.create" } | { type: "selection.set" } | { type: "event.move-day" }
>;

export function interpretCalendarMonthPointer(
  release: CalendarMonthPointerRelease,
): CalendarMonthPointerIntent | null {
  if (release.originDay === release.targetDay) {
    if (release.originEventId !== null) {
      return { type: "selection.set", eventIds: [release.originEventId] };
    }
    return { type: "selection.set", eventIds: [] };
  }
  if (release.originEventId === null) {
    const span = calendarAllDaySpan(release.originDay, release.targetDay);
    if (span === null) return null;
    return { type: "event.create", start: span.start, end: span.end, allDay: true };
  }
  const originStart = calendarDatePart(release.originEventStart ?? release.originDay);
  const origin = parseCalendarDate(release.originDay);
  const target = parseCalendarDate(release.targetDay);
  if (origin === null || target === null) return null;
  const day = addCalendarDate(originStart, calendarDaysBetween(origin, target));
  if (day === null) return null;
  return { type: "event.move-day", eventId: release.originEventId, day };
}

export function bindCalendarMonthIntent(
  intent: CalendarMonthPointerIntent | null,
  event: CalendarEvent | undefined,
  occurrenceStart: string | null,
  scope: "this" | "this-and-following" | "all" = "this",
): CalendarIntent | null {
  if (intent === null) return null;
  if (intent.type !== "event.move-day") return intent;
  if (event === undefined || calendarEventRecurrence(event) === null) return intent;
  const start = occurrenceStart ?? event.start;
  const occDay = calendarDatePart(start);
  const origin = parseCalendarDate(occDay);
  const next = parseCalendarDate(intent.day);
  if (origin === null || next === null) return intent;
  if (scope === "all") {
    const day = addCalendarDate(calendarDatePart(event.start), calendarDaysBetween(origin, next));
    if (day === null) return intent;
    return { type: "event.move-day", eventId: intent.eventId, day };
  }
  return {
    type: "occurrence.edit",
    eventId: intent.eventId,
    occurrenceStart: start,
    scope,
    start: isCalendarAllDay(event) ? intent.day : `${intent.day}T${start.slice(11)}`,
  };
}
