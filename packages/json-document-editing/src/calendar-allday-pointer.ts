import type { CalendarEvent, CalendarIntent } from "./calendar.js";
import { calendarEventRecurrence } from "./calendar-occurrence.js";
import { bindCalendarMonthIntent } from "./calendar-month-pointer.js";
import { addCalendarDate, calendarAllDaySpan, parseCalendarDate } from "./calendar-validation.js";

export type CalendarAllDayHandle = "body" | "start" | "end";

export type CalendarAllDayPointerRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
  readonly originEventStart: string | null;
  readonly originHandle: CalendarAllDayHandle | null;
  readonly targetDay: string;
};

export type CalendarAllDayPointerIntent = Extract<
  CalendarIntent,
  { type: "event.create" } | { type: "selection.set" } | { type: "event.move-day" } | { type: "event.resize" }
>;

export function interpretCalendarAllDayPointer(
  release: CalendarAllDayPointerRelease,
): CalendarAllDayPointerIntent | null {
  if (release.originEventId === null) {
    if (release.originDay === release.targetDay) return { type: "selection.set", eventIds: [] };
    const span = calendarAllDaySpan(release.originDay, release.targetDay);
    if (span === null) return null;
    return { type: "event.create", start: span.start, end: span.end, allDay: true };
  }

  const handle = release.originHandle ?? "body";
  if (handle === "start") {
    return {
      type: "event.resize",
      eventId: release.originEventId,
      edge: "start",
      instant: release.targetDay,
    };
  }

  if (handle === "end") {
    const exclusiveEnd = addCalendarDate(release.targetDay, 1);
    if (exclusiveEnd === null) return null;
    return {
      type: "event.resize",
      eventId: release.originEventId,
      edge: "end",
      instant: exclusiveEnd,
    };
  }

  if (release.originDay === release.targetDay) {
    return { type: "selection.set", eventIds: [release.originEventId] };
  }

  const origin = parseCalendarDate(release.originDay);
  const target = parseCalendarDate(release.targetDay);
  const eventStart = parseCalendarDate(release.originEventStart ?? "");
  if (origin === null || target === null || eventStart === null) return null;
  const day = addCalendarDate(release.originEventStart ?? "", (target - origin) / 86_400_000);
  if (day === null) return null;
  return { type: "event.move-day", eventId: release.originEventId, day };
}

export function bindCalendarAllDayIntent(
  intent: CalendarAllDayPointerIntent | null,
  event: CalendarEvent | undefined,
  occurrenceStart: string | null,
  scope: "this" | "this-and-following" | "all" = "this",
): CalendarIntent | null {
  if (intent === null) return null;
  if (intent.type === "event.move-day") {
    return bindCalendarMonthIntent(intent, event, occurrenceStart, scope);
  }
  if (intent.type !== "event.resize") return intent;
  if (event === undefined || calendarEventRecurrence(event) === null) return intent;
  const start = occurrenceStart ?? event.start;
  if (scope === "all") return intent;
  return {
    type: "occurrence.edit",
    eventId: intent.eventId,
    occurrenceStart: start,
    scope,
    ...(intent.edge === "start" ? { start: intent.instant } : { end: intent.instant }),
  };
}
