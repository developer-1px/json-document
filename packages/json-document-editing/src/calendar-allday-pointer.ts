import type { CalendarIntent } from "./calendar.js";
import { addCalendarDate, parseCalendarDate } from "./calendar-validation.js";

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
    const start = release.originDay <= release.targetDay ? release.originDay : release.targetDay;
    const last = release.originDay <= release.targetDay ? release.targetDay : release.originDay;
    const end = addCalendarDate(last, 1);
    if (end === null) return null;
    return { type: "event.create", start, end, allDay: true };
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
