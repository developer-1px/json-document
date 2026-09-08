import type { CalendarEvent, CalendarIntent } from "./calendar.js";

export type CalendarEventPatch = {
  readonly title?: string;
  readonly start?: string;
  readonly end?: string;
  readonly allDay?: boolean;
  readonly calendarId?: string;
  readonly recurrence?: CalendarEvent["recurrence"];
};

export type CalendarOccurrenceRange = {
  readonly start: string | null;
  readonly end: string | null;
};

export function calendarOccurrenceAfterIntent(
  intent: CalendarIntent | null,
  origin: CalendarOccurrenceRange,
  committed: CalendarOccurrenceRange | null,
): CalendarOccurrenceRange {
  if (intent?.type === "event.create") return { start: intent.start, end: intent.end };
  if (intent?.type === "event.resize") {
    return {
      start: intent.edge === "start" ? intent.instant : (committed?.start ?? origin.start),
      end: intent.edge === "end" ? intent.instant : (committed?.end ?? origin.end),
    };
  }
  if (
    (intent?.type === "event.move" || intent?.type === "event.move-day" || intent?.type === "occurrence.edit")
    && committed !== null
  ) {
    return committed;
  }
  return origin;
}

export function calendarOccurrenceFromSelection(
  selected: Pick<CalendarEvent, "start" | "end"> | null,
): CalendarOccurrenceRange {
  if (selected === null) return { start: null, end: null };
  return { start: selected.start, end: selected.end };
}

export function calendarOccurrenceForInspector(
  selected: Pick<CalendarEvent, "start" | "end" | "recurrence">,
  occurrence: CalendarOccurrenceRange,
): { readonly start: string; readonly end: string } {
  if (selected.recurrence !== null && occurrence.start !== null && occurrence.end !== null) {
    return { start: occurrence.start, end: occurrence.end };
  }
  return { start: selected.start, end: selected.end };
}

export function calendarVisibleHourBand(
  startMinutes: number,
  endMinutes: number,
  hourStart: number,
  hourEnd: number,
): { readonly startMinutes: number; readonly endMinutes: number } | null {
  const visibleStart = hourStart * 60;
  const visibleEnd = hourEnd * 60;
  const start = Math.max(startMinutes, visibleStart);
  const end = Math.min(endMinutes, visibleEnd);
  if (end > start) return { startMinutes: start, endMinutes: end };
  if (startMinutes === visibleEnd && endMinutes > visibleEnd) {
    return { startMinutes: visibleEnd - 15, endMinutes: visibleEnd };
  }
  return null;
}

export function calendarUpdateIntent(
  event: CalendarEvent,
  occurrenceStart: string | null,
  scope: Extract<CalendarIntent, { type: "occurrence.edit" }>["scope"],
  patch: CalendarEventPatch,
): CalendarIntent {
  const seriesFields = patch.allDay !== undefined || patch.calendarId !== undefined || patch.recurrence !== undefined;
  if (!seriesFields && event.recurrence !== null && occurrenceStart !== null) {
    return {
      type: "occurrence.edit",
      eventId: event.id,
      occurrenceStart,
      scope,
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.start === undefined ? {} : { start: patch.start }),
      ...(patch.end === undefined ? {} : { end: patch.end }),
    };
  }
  return { type: "event.update", eventId: event.id, ...patch };
}
