import { calendarEventExcludeDates, calendarEventRecurrence } from "./calendar-occurrence.js";
import type {
  CalendarEvent,
  CalendarOccurrencePoint,
  CalendarOccurrenceSelection,
  CalendarSelection,
} from "./calendar.js";
import {
  calendarDatePart,
  calendarDaysBetween,
  calendarMinutesBetween,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  parseCalendarDate,
  parseCalendarInstant,
} from "./calendar-validation.js";

export type CalendarSelectionMoveTarget =
  | { readonly type: "instant"; readonly instant: string }
  | { readonly type: "day"; readonly day: string };

export type CalendarSelectionMovePlan =
  | {
      readonly ok: true;
      readonly events: ReadonlyArray<CalendarEvent>;
      readonly selectionAfter: CalendarSelection;
      readonly movedOccurrences: ReadonlyArray<CalendarOccurrenceSelection>;
    }
  | { readonly ok: false; readonly code: string };

/** Plans one atomic temporal translation for a materialized occurrence selection. */
export function planCalendarSelectionMove(
  events: ReadonlyArray<CalendarEvent>,
  occurrences: ReadonlyArray<CalendarOccurrenceSelection>,
  anchor: CalendarOccurrencePoint,
  target: CalendarSelectionMoveTarget,
  options: {
    readonly scope?: "this" | "this-and-following" | "all";
    readonly createId?: () => string;
    readonly primary?: CalendarOccurrencePoint;
  } = {},
): CalendarSelectionMovePlan {
  const anchorOccurrence = occurrences.find((item) => (
    item.eventId === anchor.eventId && item.start === anchor.occurrenceStart
  ));
  if (anchorOccurrence === undefined || occurrences.length === 0) {
    return { ok: false, code: "selection.drag-source-not-found" };
  }
  const delta = resolveDelta(anchorOccurrence.start, target);
  if (delta === null) return { ok: false, code: "selection.invalid-drop-target" };
  if (target.type === "instant" && occurrences.some((item) => {
    const event = events.find((candidate) => candidate.id === item.eventId);
    return event === undefined || isCalendarAllDay(event);
  })) return { ok: false, code: "selection.incompatible-drop-target" };

  const next = [...events];
  const moved: CalendarOccurrenceSelection[] = [];
  const exclusions = new Map<string, Set<string>>();
  const scope = options.scope ?? "this";
  const createId = options.createId ?? (() => `preview-${moved.length + 1}`);
  const seenSeries = new Set<string>();

  for (const occurrence of occurrences) {
    const index = events.findIndex((event) => event.id === occurrence.eventId);
    const event = events[index];
    if (event === undefined) return { ok: false, code: "selection.event-not-found" };
    const shifted = shiftInterval(occurrence.start, occurrence.end, delta);
    if (shifted === null) return { ok: false, code: "event.invalid-instant" };
    const recurrence = calendarEventRecurrence(event);
    if (recurrence === null) {
      if (seenSeries.has(event.id)) return { ok: false, code: "selection.duplicate-event" };
      seenSeries.add(event.id);
      next[index] = { ...event, start: shifted.start, end: shifted.end };
      moved.push({ eventId: event.id, ...shifted });
      continue;
    }
    if (scope !== "this") return { ok: false, code: "selection.recurring-group-scope-unsupported" };
    const dates = exclusions.get(event.id) ?? new Set(calendarEventExcludeDates(event));
    dates.add(calendarDatePart(occurrence.start));
    exclusions.set(event.id, dates);
    const detached: CalendarEvent = {
      ...event,
      id: uniqueId(next, createId),
      start: shifted.start,
      end: shifted.end,
      recurrence: null,
      excludeDates: [],
    };
    next.push(detached);
    moved.push({ eventId: detached.id, ...shifted });
  }
  for (const [eventId, dates] of exclusions) {
    const index = next.findIndex((event) => event.id === eventId);
    next[index] = { ...next[index]!, excludeDates: [...dates] };
  }
  const points = moved.map((item): CalendarOccurrencePoint => ({
    eventId: item.eventId,
    occurrenceStart: item.start,
  }));
  const primary = options.primary ?? anchor;
  const primaryIndex = occurrences.findIndex((item) => (
    item.eventId === primary.eventId && item.start === primary.occurrenceStart
  ));
  return {
    ok: true,
    events: next,
    movedOccurrences: moved,
    selectionAfter: {
      kind: "range",
      ranges: points.map((point) => ({ anchor: point, focus: point, points: [point] })),
      primaryIndex: Math.max(0, primaryIndex),
    },
  };
}

type Delta = { readonly unit: "minutes" | "days"; readonly amount: number };

function resolveDelta(anchorStart: string, target: CalendarSelectionMoveTarget): Delta | null {
  if (target.type === "instant") {
    const from = parseCalendarInstant(anchorStart);
    const to = parseCalendarInstant(target.instant);
    return from === null || to === null ? null : { unit: "minutes", amount: calendarMinutesBetween(from, to) };
  }
  const from = parseCalendarDate(calendarDatePart(anchorStart));
  const to = parseCalendarDate(target.day);
  return from === null || to === null ? null : { unit: "days", amount: calendarDaysBetween(from, to) };
}

function shiftInterval(start: string, end: string, delta: Delta): { start: string; end: string } | null {
  if (start.length === 10) {
    if (delta.unit !== "days") return null;
    const from = parseCalendarDate(start);
    const to = parseCalendarDate(end);
    return from === null || to === null ? null : {
      start: formatCalendarDate(from.add({ days: delta.amount })),
      end: formatCalendarDate(to.add({ days: delta.amount })),
    };
  }
  const from = parseCalendarInstant(start);
  const to = parseCalendarInstant(end);
  if (from === null || to === null) return null;
  const minutes = delta.unit === "minutes" ? delta.amount : delta.amount * 24 * 60;
  return {
    start: formatCalendarInstant(from.add({ minutes })),
    end: formatCalendarInstant(to.add({ minutes })),
  };
}

function uniqueId(events: ReadonlyArray<CalendarEvent>, createId: () => string): string {
  let id = createId();
  while (events.some((event) => event.id === id)) id = createId();
  return id;
}
