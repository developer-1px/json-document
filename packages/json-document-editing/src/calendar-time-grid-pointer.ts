import type { CalendarEvent, CalendarIntent } from "./calendar.js";
import { calendarEventRecurrence } from "./calendar-occurrence.js";
import { calendarDatePart, calendarShiftInstant, parseCalendarInstant } from "./calendar-validation.js";

export type CalendarTimeGridHandle = "body" | "start" | "end";

export type CalendarTimeGridPointerRelease = {
  readonly originInstant: string;
  readonly originEventId: string | null;
  readonly originEventStart: string | null;
  readonly originHandle: CalendarTimeGridHandle | null;
  readonly targetInstant: string;
};

export type CalendarTimeGridPointerIntent = Extract<
  CalendarIntent,
  { type: "event.create" } | { type: "selection.set" } | { type: "event.move" } | { type: "event.resize" }
>;

export function interpretCalendarTimeGridPointer(
  release: CalendarTimeGridPointerRelease,
): CalendarTimeGridPointerIntent | null {
  if (release.originEventId === null) {
    const day = calendarDatePart(release.targetInstant);
    const originTime = timePart(release.originInstant);
    const targetTime = timePart(release.targetInstant);
    if (originTime === null || targetTime === null) return null;
    const startTime = originTime <= targetTime ? originTime : targetTime;
    const endTime = originTime <= targetTime ? targetTime : originTime;
    const start = `${day}T${startTime}`;
    const end = startTime === endTime ? calendarShiftInstant(start, 60) : `${day}T${endTime}`;
    if (end === null) return null;
    return { type: "event.create", start, end };
  }

  const handle = release.originHandle ?? "body";
  if (handle === "start" || handle === "end") {
    return {
      type: "event.resize",
      eventId: release.originEventId,
      edge: handle,
      instant: release.targetInstant,
    };
  }

  if (release.originInstant === release.targetInstant) {
    return { type: "selection.set", eventIds: [release.originEventId] };
  }

  const origin = parseCalendarInstant(release.originInstant);
  const target = parseCalendarInstant(release.targetInstant);
  const eventStart = parseCalendarInstant(release.originEventStart ?? "");
  if (origin === null || target === null || eventStart === null) return null;
  const start = calendarShiftInstant(release.originEventStart ?? "", (target - origin) / 60_000);
  if (start === null) return null;
  return { type: "event.move", eventId: release.originEventId, start };
}

export function bindCalendarTimeGridIntent(
  intent: CalendarTimeGridPointerIntent | null,
  event: CalendarEvent | undefined,
  occurrenceStart: string | null,
  scope: "this" | "this-and-following" | "all" = "this",
): CalendarIntent | null {
  if (intent === null) return null;
  if (intent.type !== "event.move" && intent.type !== "event.resize") return intent;
  if (event === undefined || calendarEventRecurrence(event) === null) return intent;
  const start = occurrenceStart ?? event.start;
  if (scope === "all") return bindRecurringSeriesTimeGridIntent(intent, event, start);
  if (intent.type === "event.move") {
    return {
      type: "occurrence.edit",
      eventId: intent.eventId,
      occurrenceStart: start,
      scope,
      start: intent.start,
    };
  }
  if (intent.edge === "start") {
    const from = parseCalendarInstant(event.start);
    const to = parseCalendarInstant(event.end);
    const occurrenceEnd = from === null || to === null
      ? null
      : calendarShiftInstant(start, (to - from) / 60_000);
    return {
      type: "occurrence.edit",
      eventId: intent.eventId,
      occurrenceStart: start,
      scope,
      start: intent.instant,
      ...(occurrenceEnd === null ? {} : { end: occurrenceEnd }),
    };
  }
  return {
    type: "occurrence.edit",
    eventId: intent.eventId,
    occurrenceStart: start,
    scope,
    end: intent.instant,
  };
}

function bindRecurringSeriesTimeGridIntent(
  intent: Extract<CalendarTimeGridPointerIntent, { type: "event.move" } | { type: "event.resize" }>,
  event: CalendarEvent,
  occurrenceStart: string,
): CalendarIntent {
  if (intent.type === "event.move") {
    const origin = parseCalendarInstant(occurrenceStart);
    const next = parseCalendarInstant(intent.start);
    if (origin === null || next === null) return intent;
    const start = calendarShiftInstant(event.start, (next - origin) / 60_000);
    if (start === null) return intent;
    return { type: "event.move", eventId: intent.eventId, start };
  }
  const from = parseCalendarInstant(event.start);
  const to = parseCalendarInstant(event.end);
  const occStart = parseCalendarInstant(occurrenceStart);
  const instant = parseCalendarInstant(intent.instant);
  if (from === null || to === null || occStart === null || instant === null) return intent;
  if (intent.edge === "start") {
    const start = calendarShiftInstant(event.start, (instant - occStart) / 60_000);
    if (start === null) return intent;
    return { type: "event.resize", eventId: intent.eventId, edge: "start", instant: start };
  }
  const end = calendarShiftInstant(event.end, (instant - (occStart + (to - from))) / 60_000);
  if (end === null) return intent;
  return { type: "event.resize", eventId: intent.eventId, edge: "end", instant: end };
}

function timePart(instant: string): string | null {
  if (parseCalendarInstant(instant) === null) return null;
  return instant.slice(11);
}
