import type {
  CalendarIntent,
} from "./calendar.js";
import type {
  CalendarEvent,
} from "@interactive-os/json-document-calendar-document";
import { planCalendarEventEdit } from "@interactive-os/json-document-calendar-document";
import { createEditingIdAllocator } from "./identity.js";
import { bindCalendarAllDayIntent, interpretCalendarAllDayPointer, type CalendarAllDayPointerRelease } from "./calendar-allday-pointer.js";
import { bindCalendarMonthIntent, interpretCalendarMonthPointer, type CalendarMonthPointerRelease } from "./calendar-month-pointer.js";
import { bindCalendarTimeGridIntent, interpretCalendarTimeGridPointer, type CalendarTimeGridPointerRelease } from "./calendar-time-grid-pointer.js";

export function previewCalendarAllDay(
  events: ReadonlyArray<CalendarEvent>,
  release: CalendarAllDayPointerRelease,
  scope: "this" | "this-and-following" | "all" = "this",
): ReadonlyArray<CalendarEvent> {
  const event = events.find((item) => item.id === release.originEventId);
  return preview(events, bindCalendarAllDayIntent(interpretCalendarAllDayPointer(release), event, release.originEventStart, scope));
}

export function previewCalendarTimeGrid(
  events: ReadonlyArray<CalendarEvent>,
  release: CalendarTimeGridPointerRelease,
  scope: "this" | "this-and-following" | "all" = "this",
): ReadonlyArray<CalendarEvent> {
  const event = events.find((item) => item.id === release.originEventId);
  return preview(events, bindCalendarTimeGridIntent(interpretCalendarTimeGridPointer(release), event, release.originEventStart, scope));
}

export function previewCalendarMonth(
  events: ReadonlyArray<CalendarEvent>,
  release: CalendarMonthPointerRelease,
  scope: "this" | "this-and-following" | "all" = "this",
): ReadonlyArray<CalendarEvent> {
  const event = events.find((item) => item.id === release.originEventId);
  return preview(events, bindCalendarMonthIntent(interpretCalendarMonthPointer(release), event, release.originEventStart ?? null, scope));
}

function preview(events: ReadonlyArray<CalendarEvent>, intent: CalendarIntent | null): ReadonlyArray<CalendarEvent> {
  if (intent === null || !(intent.type === "event.create" || intent.type === "event.update" || intent.type === "event.move"
    || intent.type === "event.move-day" || intent.type === "event.resize" || intent.type === "occurrence.edit")) return events;
  let sequence = 0;
  const plan = planCalendarEventEdit(events, intent, {
    allocateId: createEditingIdAllocator(events.map((event) => event.id), () => sequence++ === 0 ? "preview" : `preview-${sequence}`, "calendar preview"),
  });
  return plan.ok ? plan.events : events;
}
