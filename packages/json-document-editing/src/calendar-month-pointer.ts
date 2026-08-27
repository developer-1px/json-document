import type { CalendarIntent } from "./calendar.js";
import { addCalendarDate } from "./calendar-validation.js";

export type CalendarMonthPointerRelease = {
  readonly originDay: string;
  readonly originEventId: string | null;
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
    const occupant = release.eventsOnTargetDay[0];
    if (occupant !== undefined) {
      return { type: "selection.set", eventIds: [occupant.id] };
    }
    const end = addCalendarDate(release.targetDay, 1);
    if (end === null) return null;
    return { type: "event.create", start: release.targetDay, end, allDay: true };
  }
  if (release.originEventId === null) return null;
  return { type: "event.move-day", eventId: release.originEventId, day: release.targetDay };
}
