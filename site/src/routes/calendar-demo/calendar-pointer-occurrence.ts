import type { CalendarIntent } from "@interactive-os/json-document-editing";

export function calendarAllDayResizeDays(deltaPx: number, columnWidthPx: number): number {
  if (columnWidthPx <= 0) return 0;
  return Math.round(deltaPx / columnWidthPx);
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

export type CalendarOccurrenceRange = {
  readonly start: string | null;
  readonly end: string | null;
};

export function calendarPointerOccurrence(
  intent: CalendarIntent | null,
  origin: CalendarOccurrenceRange,
  committed: CalendarOccurrenceRange | null,
): CalendarOccurrenceRange {
  if (intent?.type === "event.create") return { start: intent.start, end: intent.end };
  if (
    (intent?.type === "event.move" || intent?.type === "event.resize" || intent?.type === "event.move-day" || intent?.type === "occurrence.edit")
    && committed !== null
  ) {
    return committed;
  }
  return origin;
}

export function calendarSelectionOccurrence(
  selected: { readonly start: string; readonly end: string } | null,
): CalendarOccurrenceRange {
  if (selected === null) return { start: null, end: null };
  return { start: selected.start, end: selected.end };
}
