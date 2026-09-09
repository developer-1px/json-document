import { calendarEventRecurrence, resolveCalendarOccurrence } from "./calendar-occurrence.js";
import { planCalendarEventEdit } from "./calendar-event-plan.js";
import { createEditingIdAllocator } from "./identity.js";
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

/** Plans one atomic temporal translation; captured intervals are preconditions, not current truth. */
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
  const matches = (item: CalendarOccurrenceSelection, point: CalendarOccurrencePoint) =>
    item.eventId === point.eventId && item.start === point.occurrenceStart;
  const anchorOccurrence = occurrences.find((item) => matches(item, anchor));
  const primaryIndex = occurrences.findIndex((item) => matches(item, options.primary ?? anchor));
  if (anchorOccurrence === undefined || primaryIndex < 0) return { ok: false, code: "selection.drag-source-not-found" };
  const scope = options.scope ?? "this";
  if (scope !== "this" && scope !== "this-and-following" && scope !== "all") return { ok: false, code: "occurrence.invalid-scope" };
  const seen = new Set<string>();
  for (const occurrence of occurrences) {
    const key = JSON.stringify([occurrence.eventId, occurrence.start]);
    if (seen.has(key)) return { ok: false, code: "selection.duplicate-occurrence" };
    seen.add(key);
    const current = resolveCalendarOccurrence(events, { eventId: occurrence.eventId, occurrenceStart: occurrence.start });
    if (current === null || current.end !== occurrence.end) return { ok: false, code: "selection.stale-occurrence" };
  }
  const delta = resolveDelta(anchorOccurrence.start, target);
  if (delta === null) return { ok: false, code: "selection.invalid-drop-target" };
  if (target.type === "instant" && occurrences.some((item) => (
    isCalendarAllDay(events.find((event) => event.id === item.eventId)!)
  ))) return { ok: false, code: "selection.incompatible-drop-target" };

  let next = events;
  let sequence = 0;
  const allocateId = createEditingIdAllocator(events.map((event) => event.id), options.createId ?? (() => `preview-${++sequence}`), "calendar event");
  const moved: CalendarOccurrenceSelection[] = [];
  const seriesIds = new Map<string, string>();
  // Following starts at the earliest selected occurrence, independent of selection/primary order.
  const ordered = occurrences.map((occurrence, index) => ({ occurrence, index }))
    .sort((left, right) => left.occurrence.start.localeCompare(right.occurrence.start));
  for (const { occurrence, index } of ordered) {
    const event = events.find((item) => item.id === occurrence.eventId)!;
    const shifted = shiftInterval(occurrence.start, occurrence.end, delta);
    if (shifted === null) return { ok: false, code: "event.invalid-instant" };
    const recurring = calendarEventRecurrence(event) !== null;
    let eventId = recurring && scope !== "this" ? seriesIds.get(event.id) : undefined;
    if (eventId === undefined) {
      const plan = planCalendarEventEdit(next, recurring ? {
        type: "occurrence.edit", eventId: event.id, occurrenceStart: occurrence.start, scope, ...shifted,
      } : { type: "event.update", eventId: event.id, ...shifted }, { allocateId });
      if (!plan.ok) return plan;
      next = plan.events;
      eventId = plan.selected.eventId;
      if (recurring && scope !== "this") seriesIds.set(event.id, eventId);
    }
    moved[index] = { eventId, ...shifted };
  }
  // A monthly/yearly re-anchor may not represent every translated point: fail atomically.
  if (moved.some((item) => resolveCalendarOccurrence(next, {
    eventId: item.eventId, occurrenceStart: item.start,
  })?.end !== item.end)) return { ok: false, code: "selection.unrepresentable-series-move" };
  const points = moved.map((item): CalendarOccurrencePoint => ({ eventId: item.eventId, occurrenceStart: item.start }));
  return {
    ok: true, events: next, movedOccurrences: moved,
    selectionAfter: {
      kind: "range", ranges: points.map((point) => ({ anchor: point, focus: point, points: [point] })), primaryIndex,
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
