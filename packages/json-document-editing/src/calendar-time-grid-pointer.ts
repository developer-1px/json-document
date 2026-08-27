import type { CalendarIntent } from "./calendar.js";
import { calendarShiftInstant, parseCalendarInstant } from "./calendar-validation.js";

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
    const ordered = release.originInstant <= release.targetInstant
      ? { start: release.originInstant, end: release.targetInstant }
      : { start: release.targetInstant, end: release.originInstant };
    const end = ordered.start === ordered.end ? calendarShiftInstant(ordered.start, 60) : ordered.end;
    if (end === null) return null;
    return { type: "event.create", start: ordered.start, end };
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
