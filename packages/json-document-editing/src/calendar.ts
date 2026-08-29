import {
  buildPointer,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createMaterializedRangeSelectionFamily,
  type MaterializedRangeSelection,
  type MaterializedRangeSelectionCommand,
  type OrderedTopology,
} from "@interactive-os/json-document-selection";
import { Temporal } from "@js-temporal/polyfill";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";
import { cutEditingClipboard, type EditingClipboardCut } from "./clipboard.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import {
  addCalendarDate,
  assertCalendarDocument,
  calendarAllDaySpan,
  calendarDatePart,
  calendarDaysBetween,
  calendarDocumentCalendars,
  calendarDocumentEvents,
  calendarEventBounds,
  calendarIntervalLastDate,
  calendarMinutesBetween,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  parseCalendarDate,
  parseCalendarInstant,
} from "./calendar-validation.js";
import { calendarEventExcludeDates, calendarEventRecurrence, projectCalendarOccurrences } from "./calendar-occurrence.js";

export interface CalendarCalendar extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly hidden: boolean;
  readonly color: string;
}

export interface CalendarRecurrence extends Record<string, JSONValue> {
  readonly freq: "daily" | "weekly" | "monthly" | "yearly";
  readonly interval: number;
  readonly until: string;
}

export interface CalendarEvent extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
  readonly calendarId: string;
  readonly recurrence: CalendarRecurrence | null;
  readonly excludeDates: ReadonlyArray<string>;
}

export interface CalendarDocument extends Record<string, JSONValue> {
  readonly calendars: ReadonlyArray<CalendarCalendar>;
  readonly events: ReadonlyArray<CalendarEvent>;
}

export interface CalendarOccurrencePoint extends Record<string, JSONValue> {
  readonly eventId: string;
  readonly occurrenceStart: string;
}

export interface CalendarSelectionRange extends Record<string, JSONValue> {
  readonly anchor: CalendarOccurrencePoint;
  readonly focus: CalendarOccurrencePoint;
  readonly points: ReadonlyArray<CalendarOccurrencePoint>;
}

export interface CalendarSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<CalendarSelectionRange>;
  readonly primaryIndex: number | null;
}

export interface CalendarOccurrenceTopologySnapshot extends Record<string, JSONValue> {
  readonly points: ReadonlyArray<CalendarOccurrencePoint>;
}

export interface CalendarClipboardItem extends Record<string, JSONValue> {
  readonly sourceEventId: string;
  readonly occurrenceStart: string;
  readonly event: CalendarEvent;
}

export interface CalendarClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.calendar+json";
  readonly items: ReadonlyArray<CalendarClipboardItem>;
  readonly text: string;
}

export interface CalendarOccurrenceSelection {
  readonly eventId: string;
  readonly start: string;
  readonly end: string;
}

export const calendarClipboardFormat = {
  mimeType: "application/vnd.interactive-os.calendar+json" as const,
  parse(value: unknown): CalendarClipboard | null {
    if (!isRecord(value) || value.type !== this.mimeType || typeof value.text !== "string") return null;
    if (!Array.isArray(value.items) || value.items.length === 0) return null;
    return value.items.every((item) => (
      isRecord(item)
      && typeof item.sourceEventId === "string"
      && typeof item.occurrenceStart === "string"
      && isCalendarClipboardEvent(item.event)
    )) ? value as CalendarClipboard : null;
  },
};

export type CalendarView = "day" | "week" | "month" | "year";

export type CalendarIntent =
  | {
      readonly type: "selection.set";
      readonly point: CalendarOccurrencePoint;
      readonly topology?: CalendarOccurrenceTopologySnapshot;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.clear" }
  | { readonly type: "selection.remove" }
  | {
      readonly type: "event.create";
      readonly start: string;
      readonly end: string;
      readonly title?: string;
      readonly allDay?: boolean;
      readonly calendarId?: string;
      readonly recurrence?: CalendarRecurrence | null;
    }
  | { readonly type: "event.move"; readonly eventId: string; readonly start: string }
  | { readonly type: "event.resize"; readonly eventId: string; readonly edge: "start" | "end"; readonly instant: string }
  | { readonly type: "event.move-day"; readonly eventId: string; readonly day: string }
  | {
      readonly type: "event.update";
      readonly eventId: string;
      readonly title?: string;
      readonly start?: string;
      readonly end?: string;
      readonly allDay?: boolean;
      readonly calendarId?: string;
      readonly recurrence?: CalendarRecurrence | null;
    }
  | {
      readonly type: "occurrence.edit";
      readonly eventId: string;
      readonly occurrenceStart: string;
      readonly scope: "this" | "this-and-following" | "all";
      readonly title?: string;
      readonly start?: string;
      readonly end?: string;
    }
  | {
      readonly type: "occurrence.remove";
      readonly eventId: string;
      readonly occurrenceStart: string;
      readonly scope: "this" | "this-and-following" | "all";
    }
  | { readonly type: "calendar.set-hidden"; readonly calendarId: string; readonly hidden: boolean };

export interface CalendarEditor {
  readonly snapshot: EditingSnapshot<CalendarSelection>;
  readonly selectedEvents: ReadonlyArray<CalendarEvent>;
  readonly selectedOccurrences: ReadonlyArray<CalendarOccurrenceSelection>;
  readonly primaryOccurrence: CalendarOccurrenceSelection | null;
  dispatch(intent: CalendarIntent): EditingResult<CalendarSelection>;
  copy(occurrences?: ReadonlyArray<CalendarOccurrenceSelection>): CalendarClipboard | null;
  cut(occurrences?: ReadonlyArray<CalendarOccurrenceSelection>): EditingClipboardCut<CalendarClipboard, EditingResult<CalendarSelection>> | null;
  paste(clipboard: CalendarClipboard, target?: string): EditingResult<CalendarSelection>;
  undo(): EditingResult<CalendarSelection>;
  redo(): EditingResult<CalendarSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<CalendarSelection>) => void): () => void;
}

export function createCalendarEditor(
  source: EditingDocumentSource<CalendarDocument>,
  options: {
    readonly createId?: () => string;
    readonly initialEventIds?: ReadonlyArray<string>;
  } = {},
): CalendarEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as CalendarDocument;
  assertCalendarDocument(initial);
  let sequence = 0;
  const createId = options.createId ?? (() => `event-${++sequence}`);
  const selectionFamily = createMaterializedRangeSelectionFamily<CalendarOccurrencePoint>();
  const first = initial.events[0];
  const availableIds = new Set(initial.events.map((event) => event.id));
  const initialEventIds = options.initialEventIds === undefined
    ? (first ? [first.id] : [])
    : options.initialEventIds.filter((id) => availableIds.has(id));
  const session = createEditingSession({
    document,
    selection: selectionForEvents(initial.events, initialEventIds),
  });

  function value(): CalendarDocument {
    return session.snapshot.value as CalendarDocument;
  }

  function selectedEvents(): CalendarEvent[] {
    const events = value().events;
    const byId = new Map(events.map((event) => [event.id, event]));
    const seen = new Set<string>();
    return selectedPoints().flatMap((point) => {
      if (seen.has(point.eventId)) return [];
      const event = byId.get(point.eventId);
      if (event === undefined) return [];
      seen.add(point.eventId);
      return [event];
    });
  }

  function selectionTargetPoints(): CalendarOccurrencePoint[] {
    const context = selectionContext(session.snapshot.selection.ranges.flatMap((range) => range.points));
    return [...selectionFamily.targets(session.snapshot.selection, context)];
  }

  function selectedPoints(): CalendarOccurrencePoint[] {
    const points = selectionTargetPoints();
    const primary = session.snapshot.selection.primaryIndex === null
      ? null
      : session.snapshot.selection.ranges[session.snapshot.selection.primaryIndex]?.focus ?? null;
    if (primary === null) return points;
    const primaryTargetIndex = points.findIndex((point) => sameCalendarOccurrencePoint(point, primary));
    return primaryTargetIndex <= 0
      ? points
      : [points[primaryTargetIndex]!, ...points.filter((_, index) => index !== primaryTargetIndex)];
  }

  function selectedOccurrences(): CalendarOccurrenceSelection[] {
    return selectionTargetPoints().flatMap((point) => {
      const occurrence = resolveCalendarOccurrence(value().events, point);
      return occurrence === null ? [] : [occurrence];
    });
  }

  function primaryOccurrence(): CalendarOccurrenceSelection | null {
    const index = session.snapshot.selection.primaryIndex;
    const point = index === null ? null : session.snapshot.selection.ranges[index]?.focus ?? null;
    return point === null ? null : resolveCalendarOccurrence(value().events, point);
  }

  function selectionContext(visiblePoints: ReadonlyArray<CalendarOccurrencePoint>) {
    return { topology: calendarOccurrenceOrderedTopology(value().events, visiblePoints) };
  }

  function dispatch(intent: CalendarIntent): EditingResult<CalendarSelection> {
    if (intent.type === "selection.set") {
      if (resolveCalendarOccurrence(value().events, intent.point) === null) return failure("selection.event-not-found");
      const command: MaterializedRangeSelectionCommand<CalendarOccurrencePoint> = intent.mode === "extend"
        ? { type: "extend-primary", point: intent.point }
        : intent.mode === "toggle"
          ? { type: "toggle-point", point: intent.point }
          : { type: "collapse", point: intent.point };
      const selection = selectionFamily.transition(
        session.snapshot.selection,
        command,
        selectionContext(intent.topology?.points ?? [intent.point]),
      ).state;
      return success(session.select(asCalendarSelection(selection)));
    }

    if (intent.type === "selection.clear") return success(session.select(emptyCalendarSelection()));

    if (intent.type === "event.create") {
      if (intent.start >= intent.end) return failure("event.invalid-interval");
      const allDay = intent.allDay === true;
      const start = allDay ? parseCalendarDate(intent.start) : parseCalendarInstant(intent.start);
      const end = allDay ? parseCalendarDate(intent.end) : parseCalendarInstant(intent.end);
      if (start === null || end === null) return failure("event.invalid-instant");
      const events = value().events;
      const event: CalendarEvent = {
        id: createUniqueId(events, createId),
        title: intent.title ?? "Event",
        start: intent.start,
        end: intent.end,
        allDay,
        calendarId: intent.calendarId ?? calendarDocumentCalendars(value())[0]?.id ?? "",
        recurrence: intent.recurrence ?? null,
        excludeDates: [],
      };
      return session.apply({
        operations: [{ op: "add", path: `/events/${events.length}`, value: event }],
        selectionAfter: selectionForEvents([...events, event], [event.id]),
        origin: intent.type,
      });
    }

    if (intent.type === "event.move") {
      return moveEvent(intent.eventId, intent.start);
    }

    if (intent.type === "event.resize") {
      return resizeEvent(intent.eventId, intent.edge, intent.instant);
    }

    if (intent.type === "event.move-day") {
      return moveEventDay(intent.eventId, intent.day);
    }

    if (intent.type === "event.update") {
      return updateEvent(intent);
    }

    if (intent.type === "occurrence.edit") {
      return editOccurrence(intent);
    }

    if (intent.type === "occurrence.remove") {
      return removeOccurrence(intent);
    }

    if (intent.type === "calendar.set-hidden") {
      return setCalendarHidden(intent.calendarId, intent.hidden);
    }

    const selected = selectedEvents();
    if (selected.length === 0) return failure("selection.empty");
    return removeSelected(selected.map((event) => event.id));
  }

  function moveEvent(eventId: string, start: string): EditingResult<CalendarSelection> {
    const events = value().events;
    const index = events.findIndex((event) => event.id === eventId);
    const event = events[index];
    if (!event) return failure("selection.event-not-found");
    if (isCalendarAllDay(event)) return failure("event.all-day-move");
    const from = parseCalendarInstant(event.start);
    const to = parseCalendarInstant(event.end);
    const nextStart = parseCalendarInstant(start);
    if (from === null || to === null || nextStart === null) return failure("event.invalid-instant");
    const nextEnd = formatCalendarInstant(nextStart.add({ minutes: calendarMinutesBetween(from, to) }));
    return session.apply({
      operations: [
        { op: "replace", path: buildPointer(["events", index, "start"]), value: start },
        { op: "replace", path: buildPointer(["events", index, "end"]), value: nextEnd },
      ],
      selectionAfter: selectionForOccurrence(eventId, start),
      origin: "event.move",
    });
  }

  function resizeEvent(
    eventId: string,
    edge: "start" | "end",
    instant: string,
  ): EditingResult<CalendarSelection> {
    const events = value().events;
    const index = events.findIndex((event) => event.id === eventId);
    const event = events[index];
    if (!event) return failure("selection.event-not-found");
    const parsed = isCalendarAllDay(event) ? parseCalendarDate(instant) : parseCalendarInstant(instant);
    if (parsed === null) return failure("event.invalid-instant");
    const start = edge === "start" ? instant : event.start;
    const end = edge === "end" ? instant : event.end;
    if (start >= end) return failure("event.invalid-interval");
    return session.apply({
      operations: [{ op: "replace", path: buildPointer(["events", index, edge]), value: instant }],
      selectionAfter: selectionForOccurrence(eventId, start),
      origin: "event.resize",
    });
  }

  function moveEventDay(eventId: string, day: string): EditingResult<CalendarSelection> {
    const events = value().events;
    const index = events.findIndex((event) => event.id === eventId);
    const event = events[index];
    if (!event) return failure("selection.event-not-found");
    if (parseCalendarDate(day) === null) return failure("event.invalid-day");
    if (isCalendarAllDay(event)) {
      const from = parseCalendarDate(event.start);
      const to = parseCalendarDate(event.end);
      const nextDay = parseCalendarDate(day);
      if (from === null || to === null || nextDay === null) return failure("event.invalid-instant");
      const delta = calendarDaysBetween(from, nextDay);
      const movedStart = formatCalendarDate(from.add({ days: delta }));
      const movedEnd = formatCalendarDate(to.add({ days: delta }));
      return session.apply({
        operations: [
          { op: "replace", path: buildPointer(["events", index, "start"]), value: movedStart },
          { op: "replace", path: buildPointer(["events", index, "end"]), value: movedEnd },
        ],
        selectionAfter: selectionForOccurrence(eventId, movedStart),
        origin: "event.move-day",
      });
    }
    const from = parseCalendarInstant(event.start);
    const to = parseCalendarInstant(event.end);
    const currentDay = parseCalendarInstant(`${calendarDatePart(event.start)}T00:00`);
    const nextDay = parseCalendarInstant(`${day}T00:00`);
    if (from === null || to === null || currentDay === null || nextDay === null) return failure("event.invalid-instant");
    const delta = calendarMinutesBetween(currentDay, nextDay);
    const movedStart = formatCalendarInstant(from.add({ minutes: delta }));
    const movedEnd = formatCalendarInstant(to.add({ minutes: delta }));
    return session.apply({
      operations: [
        { op: "replace", path: buildPointer(["events", index, "start"]), value: movedStart },
        { op: "replace", path: buildPointer(["events", index, "end"]), value: movedEnd },
      ],
      selectionAfter: selectionForOccurrence(eventId, movedStart),
      origin: "event.move-day",
    });
  }

  function updateEvent(intent: Extract<CalendarIntent, { type: "event.update" }>): EditingResult<CalendarSelection> {
    const events = value().events;
    const index = events.findIndex((event) => event.id === intent.eventId);
    const event = events[index];
    if (!event) return failure("selection.event-not-found");
    let start = intent.start ?? event.start;
    let end = intent.end ?? event.end;
    const allDay = intent.allDay ?? event.allDay;
    if (intent.allDay === true && !event.allDay) {
      start = calendarDatePart(event.start);
      end = calendarAllDaySpan(start, start)?.end ?? start;
    } else if (intent.allDay === false && event.allDay) {
      start = `${calendarDatePart(event.start)}T09:00`;
      end = `${calendarDatePart(event.start)}T10:00`;
    } else if (intent.start !== undefined && intent.end === undefined) {
      const times = shiftedOccurrenceTimes(event, event.start, intent.start, undefined);
      if (times === null) return failure("event.invalid-interval");
      start = times.start;
      end = times.end;
    }
    if (start >= end) return failure("event.invalid-interval");
    const next: CalendarEvent = {
      ...event,
      title: intent.title ?? event.title,
      start,
      end,
      allDay,
      calendarId: intent.calendarId ?? event.calendarId,
      recurrence: intent.recurrence === undefined ? event.recurrence : intent.recurrence,
    };
    if (isCalendarAllDay(next) ? parseCalendarDate(next.start) === null : parseCalendarInstant(next.start) === null) {
      return failure("event.invalid-instant");
    }
    return session.apply({
      operations: [{ op: "replace", path: buildPointer(["events", index]), value: next }],
      selectionAfter: selectionForOccurrence(event.id, next.start),
      origin: intent.type,
    });
  }

  function editOccurrence(intent: Extract<CalendarIntent, { type: "occurrence.edit" }>): EditingResult<CalendarSelection> {
    const events = value().events;
    const index = events.findIndex((event) => event.id === intent.eventId);
    const event = events[index];
    if (!event) return failure("selection.event-not-found");
    const recurrence = calendarEventRecurrence(event);
    if (recurrence === null) {
      return updateEvent({
        type: "event.update",
        eventId: intent.eventId,
        ...(intent.title === undefined ? {} : { title: intent.title }),
        ...(intent.start === undefined ? {} : { start: intent.start }),
        ...(intent.end === undefined ? {} : { end: intent.end }),
      });
    }
    if (intent.scope === "all") {
      const start = intent.start === undefined
        ? undefined
        : shiftSeriesValue(event.start, intent.occurrenceStart, intent.start);
      const end = intent.end === undefined
        ? undefined
        : shiftSeriesValue(event.end, occurrenceEndOf(event, intent.occurrenceStart), intent.end);
      if (intent.start !== undefined && start === undefined) return failure("event.invalid-instant");
      if (intent.end !== undefined && end === undefined) return failure("event.invalid-instant");
      return updateEvent({
        type: "event.update",
        eventId: intent.eventId,
        ...(intent.title === undefined ? {} : { title: intent.title }),
        ...(start === undefined ? {} : { start }),
        ...(end === undefined ? {} : { end }),
      });
    }
    const times = shiftedOccurrenceTimes(event, intent.occurrenceStart, intent.start, intent.end);
    if (times === null) return failure("event.invalid-interval");
    const occurrenceDate = calendarDatePart(intent.occurrenceStart);
    if (intent.scope === "this") {
      const split: CalendarEvent = {
        ...event,
        id: createUniqueId(events, createId),
        title: intent.title ?? event.title,
        start: times.start,
        end: times.end,
        recurrence: null,
        excludeDates: [],
      };
      return session.apply({
        operations: [
          {
            op: "replace",
            path: buildPointer(["events", index, "excludeDates"]),
            value: [...calendarEventExcludeDates(event), occurrenceDate],
          },
          { op: "add", path: `/events/${events.length}`, value: split },
        ],
        selectionAfter: selectionForEvents([...events, split], [split.id]),
        origin: intent.type,
      });
    }
    const until = addCalendarDate(occurrenceDate, -1) ?? occurrenceDate;
    const following: CalendarEvent = {
      ...event,
      id: createUniqueId(events, createId),
      title: intent.title ?? event.title,
      start: times.start,
      end: times.end,
      recurrence: { ...recurrence, until: "" },
      excludeDates: [],
    };
    return session.apply({
      operations: [
        { op: "replace", path: buildPointer(["events", index, "recurrence"]), value: { ...recurrence, until } },
        { op: "add", path: `/events/${events.length}`, value: following },
      ],
      selectionAfter: selectionForEvents([...events, following], [following.id]),
      origin: intent.type,
    });
  }

  function removeOccurrence(
    intent: Extract<CalendarIntent, { type: "occurrence.remove" }>,
  ): EditingResult<CalendarSelection> {
    const events = value().events;
    const index = events.findIndex((event) => event.id === intent.eventId);
    const event = events[index];
    if (!event) return failure("selection.event-not-found");
    const recurrence = calendarEventRecurrence(event);
    if (recurrence === null || intent.scope === "all") {
      return removeSelected([event.id]);
    }
    const occurrenceDate = calendarDatePart(intent.occurrenceStart);
    if (intent.scope === "this") {
      return session.apply({
        operations: [{
          op: "replace",
          path: buildPointer(["events", index, "excludeDates"]),
          value: [...calendarEventExcludeDates(event), occurrenceDate],
        }],
        selectionAfter: selectionForEvents(events, [event.id]),
        origin: intent.type,
      });
    }
    const until = addCalendarDate(occurrenceDate, -1);
    if (until === null || until < calendarDatePart(event.start)) {
      return removeSelected([event.id]);
    }
    return session.apply({
      operations: [{
        op: "replace",
        path: buildPointer(["events", index, "recurrence"]),
        value: { ...recurrence, until },
      }],
      selectionAfter: selectionForEvents(events, [event.id]),
      origin: intent.type,
    });
  }

  function setCalendarHidden(calendarId: string, hidden: boolean): EditingResult<CalendarSelection> {
    const calendars = calendarDocumentCalendars(value());
    const index = calendars.findIndex((item) => item.id === calendarId);
    if (index < 0) return failure("calendar.not-found");
    return session.apply({
      operations: [{ op: "replace", path: buildPointer(["calendars", index, "hidden"]), value: hidden }],
      selectionAfter: session.snapshot.selection,
      origin: "calendar.set-hidden",
    });
  }

  function removeSelected(ids: ReadonlyArray<string>): EditingResult<CalendarSelection> {
    const events = value().events;
    const removing = new Set(ids);
    const indices = events
      .map((event, index) => removing.has(event.id) ? index : -1)
      .filter((index) => index >= 0)
      .sort((left, right) => right - left);
    const remaining = events.filter((event) => !removing.has(event.id));
    const firstRemoved = Math.min(...indices);
    const next = remaining[Math.min(firstRemoved, remaining.length - 1)];
    return session.apply({
      operations: indices.map((index) => ({ op: "remove", path: buildPointer(["events", index]) })),
      selectionAfter: selectionForEvents(remaining, next ? [next.id] : []),
      origin: "selection.remove",
    });
  }

  function copy(occurrences?: ReadonlyArray<CalendarOccurrenceSelection>): CalendarClipboard | null {
    const source = occurrences ?? selectedOccurrences();
    const items = source.flatMap((occurrence): CalendarClipboardItem[] => {
      const event = value().events.find((candidate) => candidate.id === occurrence.eventId);
      if (event === undefined || occurrence.start >= occurrence.end) return [];
      return [{
        sourceEventId: event.id,
        occurrenceStart: occurrence.start,
        event: {
          ...event,
          start: occurrence.start,
          end: occurrence.end,
          recurrence: null,
          excludeDates: [],
        },
      }];
    });
    if (items.length === 0) return null;
    return {
      type: "application/vnd.interactive-os.calendar+json",
      items,
      text: items.map((item) => `${item.event.start}\t${item.event.end}\t${item.event.title}`).join("\n"),
    };
  }

  function removeClipboard(clipboard: CalendarClipboard): EditingResult<CalendarSelection> {
    if (clipboard.items.length === 0) return failure("clipboard.empty");
    const events = value().events;
    const removals = new Set<string>();
    const exclusions = new Map<string, Set<string>>();
    for (const item of clipboard.items) {
      const event = events.find((candidate) => candidate.id === item.sourceEventId);
      if (event === undefined) return failure("selection.event-not-found");
      if (calendarEventRecurrence(event) === null) removals.add(event.id);
      else {
        const dates = exclusions.get(event.id) ?? new Set(calendarEventExcludeDates(event));
        dates.add(calendarDatePart(item.occurrenceStart));
        exclusions.set(event.id, dates);
      }
    }
    const operations: JSONPatchOperation[] = [];
    for (const [eventId, dates] of exclusions) {
      const index = events.findIndex((event) => event.id === eventId);
      operations.push({ op: "replace", path: buildPointer(["events", index, "excludeDates"]), value: [...dates] });
    }
    for (const index of events.map((event, index) => removals.has(event.id) ? index : -1).filter((index) => index >= 0).sort((a, b) => b - a)) {
      operations.push({ op: "remove", path: buildPointer(["events", index]) });
    }
    return session.apply({ operations, selectionAfter: emptyCalendarSelection(), origin: "clipboard.cut" });
  }

  function paste(clipboard: CalendarClipboard, target?: string): EditingResult<CalendarSelection> {
    if (clipboard.items.length === 0) return failure("clipboard.empty");
    const resolvedTarget = target ?? selectedEvents()[0]?.start;
    if (resolvedTarget === undefined) return failure("clipboard.invalid-target");
    const targetInstant = parseCalendarInstant(resolvedTarget);
    const targetDate = parseCalendarDate(calendarDatePart(resolvedTarget));
    if (targetInstant === null && targetDate === null) return failure("clipboard.invalid-target");
    const timedAnchor = clipboard.items.map((item) => parseCalendarInstant(item.event.start)).find((item) => item !== null) ?? null;
    const dateAnchor = parseCalendarDate(calendarDatePart(clipboard.items[0]!.event.start));
    if (dateAnchor === null) return failure("clipboard.invalid");
    const existing = [...value().events];
    const pasted: CalendarEvent[] = [];
    for (const item of clipboard.items) {
      const source = item.event;
      let start: string;
      let end: string;
      if (!source.allDay && targetInstant !== null && timedAnchor !== null) {
        const from = parseCalendarInstant(source.start);
        const to = parseCalendarInstant(source.end);
        if (from === null || to === null) return failure("clipboard.invalid");
        const offset = calendarMinutesBetween(timedAnchor, from);
        const duration = calendarMinutesBetween(from, to);
        const nextStart = targetInstant.add({ minutes: offset });
        start = formatCalendarInstant(nextStart);
        end = formatCalendarInstant(nextStart.add({ minutes: duration }));
      } else {
        const from = parseCalendarDate(calendarDatePart(source.start));
        const to = parseCalendarDate(calendarDatePart(source.end));
        if (from === null || to === null || targetDate === null) return failure("clipboard.invalid");
        const offset = calendarDaysBetween(dateAnchor, from);
        const duration = calendarDaysBetween(from, to);
        const nextStart = targetDate.add({ days: offset });
        start = source.allDay ? formatCalendarDate(nextStart) : `${formatCalendarDate(nextStart)}T${source.start.slice(11)}`;
        end = source.allDay ? formatCalendarDate(nextStart.add({ days: duration })) : `${formatCalendarDate(nextStart.add({ days: duration }))}T${source.end.slice(11)}`;
      }
      const event = { ...source, id: createUniqueId([...existing, ...pasted], createId), start, end, recurrence: null, excludeDates: [] };
      pasted.push(event);
    }
    return session.apply({
      operations: pasted.map((event, offset) => ({ op: "add", path: `/events/${existing.length + offset}`, value: event })),
      selectionAfter: selectionForEvents([...existing, ...pasted], pasted.map((event) => event.id)),
      origin: "clipboard.paste",
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedEvents() { return selectedEvents(); },
    get selectedOccurrences() { return selectedOccurrences(); },
    get primaryOccurrence() { return primaryOccurrence(); },
    dispatch,
    copy,
    cut: (occurrences) => cutEditingClipboard(
      () => copy(occurrences),
      removeClipboard,
    ),
    paste,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function isCalendarClipboardEvent(value: unknown): value is CalendarEvent {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.start === "string"
    && typeof value.end === "string"
    && typeof value.allDay === "boolean"
    && typeof value.calendarId === "string"
    && value.recurrence === null
    && Array.isArray(value.excludeDates)
    && value.excludeDates.every((date) => typeof date === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function calendarVisibleEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent> {
  const events = calendarDocumentEvents(document);
  const hidden = new Set(calendarDocumentCalendars(document).filter((item) => item.hidden).map((item) => item.id));
  if (hidden.size === 0) return events;
  return events.filter((event) => !hidden.has(event.calendarId));
}

export function calendarOccurrenceTopology(
  document: CalendarDocument,
  rangeStart: string,
  rangeEnd: string,
): CalendarOccurrenceTopologySnapshot {
  const points = projectCalendarOccurrences(calendarVisibleEvents(document), rangeStart, rangeEnd)
    .map((occurrence): CalendarOccurrencePoint => ({
      eventId: occurrence.event.id,
      occurrenceStart: occurrence.start,
    }))
    .sort((left, right) => compareCalendarOccurrencePoints(document.events, left, right));
  return { points };
}

export function sameCalendarOccurrencePoint(
  left: CalendarOccurrencePoint,
  right: CalendarOccurrencePoint,
): boolean {
  return left.eventId === right.eventId && left.occurrenceStart === right.occurrenceStart;
}

function calendarOccurrenceOrderedTopology(
  events: ReadonlyArray<CalendarEvent>,
  visiblePoints: ReadonlyArray<CalendarOccurrencePoint>,
): OrderedTopology<CalendarOccurrencePoint, CalendarOccurrencePoint> {
  return {
    equals: sameCalendarOccurrencePoint,
    interval(anchor, focus) {
      const start = visiblePoints.findIndex((point) => sameCalendarOccurrencePoint(point, anchor));
      const end = visiblePoints.findIndex((point) => sameCalendarOccurrencePoint(point, focus));
      if (start < 0 || end < 0) return [];
      return visiblePoints.slice(Math.min(start, end), Math.max(start, end) + 1);
    },
    reconcilePoint: (point) => resolveCalendarOccurrence(events, point) === null ? null : point,
  };
}

function compareCalendarOccurrencePoints(
  events: ReadonlyArray<CalendarEvent>,
  left: CalendarOccurrencePoint,
  right: CalendarOccurrencePoint,
): number {
  const date = calendarDatePart(left.occurrenceStart).localeCompare(calendarDatePart(right.occurrenceStart));
  if (date !== 0) return date;
  const leftEvent = events.find((event) => event.id === left.eventId);
  const rightEvent = events.find((event) => event.id === right.eventId);
  const band = Number(leftEvent?.allDay !== true) - Number(rightEvent?.allDay !== true);
  return band
    || left.occurrenceStart.localeCompare(right.occurrenceStart)
    || left.eventId.localeCompare(right.eventId);
}

function resolveCalendarOccurrence(
  events: ReadonlyArray<CalendarEvent>,
  point: CalendarOccurrencePoint,
): CalendarOccurrenceSelection | null {
  const event = events.find((candidate) => candidate.id === point.eventId);
  if (event === undefined) return null;
  const day = calendarDatePart(point.occurrenceStart);
  const next = addCalendarDate(day, 1);
  if (next === null) return null;
  const occurrence = projectCalendarOccurrences([event], day, next).find((candidate) => (
    candidate.start === point.occurrenceStart
  ));
  return occurrence === undefined ? null : {
    eventId: event.id,
    start: occurrence.start,
    end: occurrence.end,
  };
}

export function calendarNowMarker(nowInstant: string, day: string): { readonly minutes: number } | null {
  if (calendarDatePart(nowInstant) !== day) return null;
  const start = parseCalendarInstant(`${day}T00:00`);
  const now = parseCalendarInstant(nowInstant);
  if (start === null || now === null) return null;
  return { minutes: calendarMinutesBetween(start, now) };
}

export function calendarEventsOnDay(
  events: ReadonlyArray<CalendarEvent>,
  day: string,
): ReadonlyArray<CalendarEvent> {
  const next = addCalendarDate(day, 1);
  if (next === null) return [];
  return projectCalendarOccurrences(events, day, next).map((item) => ({
    ...item.event,
    start: item.start,
    end: item.end,
  }));
}

export function calendarMonthDayLayout(
  events: ReadonlyArray<CalendarEvent>,
  day: string,
  rowLimit: number,
): {
  readonly events: ReadonlyArray<CalendarEvent>;
  readonly hiddenCount: number;
} {
  const onDay = [...calendarEventsOnDay(events, day)].sort((left, right) => {
    const leftAllDay = isCalendarAllDay(left);
    const rightAllDay = isCalendarAllDay(right);
    if (leftAllDay !== rightAllDay) return leftAllDay ? -1 : 1;
    return left.start.localeCompare(right.start);
  });
  if (rowLimit < 1) return { events: [], hiddenCount: onDay.length };
  if (onDay.length <= rowLimit) return { events: onDay, hiddenCount: 0 };
  const shown = Math.max(0, rowLimit - 1);
  return { events: onDay.slice(0, shown), hiddenCount: onDay.length - shown };
}

export function calendarBusyDates(
  events: ReadonlyArray<CalendarEvent>,
  rangeStart: string,
  rangeEnd: string,
): ReadonlySet<string> {
  const dates = new Set<string>();
  for (const item of projectCalendarOccurrences(events, rangeStart, rangeEnd)) {
    for (const day of calendarOccurrenceDays(item.start, item.end, isCalendarAllDay(item.event))) {
      if (day >= rangeStart && day < rangeEnd) dates.add(day);
    }
  }
  return dates;
}

function calendarOccurrenceDays(start: string, end: string, allDay: boolean): ReadonlyArray<string> {
  const first = calendarDatePart(start);
  const last = calendarIntervalLastDate(start, end, allDay);
  const days: string[] = [];
  for (let day = first; day <= last; ) {
    days.push(day);
    const next = addCalendarDate(day, 1);
    if (next === null) break;
    day = next;
  }
  return days;
}

export function calendarTimedLayout(
  events: ReadonlyArray<CalendarEvent>,
  day: string,
): ReadonlyArray<{
  readonly event: CalendarEvent;
  readonly startMinutes: number;
  readonly endMinutes: number;
  readonly lane: number;
  readonly laneCount: number;
}> {
  const dayStart = parseCalendarInstant(`${day}T00:00`);
  if (dayStart === null) return [];
  const dayEnd = dayStart.add({ days: 1 });
  const next = addCalendarDate(day, 1);
  if (next === null) return [];
  const layout: Array<{ event: CalendarEvent; startMinutes: number; endMinutes: number }> = [];
  for (const item of projectCalendarOccurrences(events, day, next)) {
    if (isCalendarAllDay(item.event)) continue;
    const bounds = calendarEventBounds({ ...item.event, start: item.start, end: item.end });
    if (bounds === null || Temporal.PlainDateTime.compare(bounds.to, dayStart) <= 0 || Temporal.PlainDateTime.compare(bounds.from, dayEnd) >= 0) continue;
    const clippedStart = Temporal.PlainDateTime.compare(bounds.from, dayStart) < 0 ? dayStart : bounds.from;
    const clippedEnd = Temporal.PlainDateTime.compare(bounds.to, dayEnd) > 0 ? dayEnd : bounds.to;
    layout.push({
      event: { ...item.event, start: item.start, end: item.end },
      startMinutes: calendarMinutesBetween(dayStart, clippedStart),
      endMinutes: calendarMinutesBetween(dayStart, clippedEnd),
    });
  }
  const sorted = layout.sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
  const positioned: Array<typeof sorted[number] & { lane: number; laneCount: number }> = [];
  let groupStart = 0;
  while (groupStart < sorted.length) {
    let groupEnd = groupStart + 1;
    let occupiedUntil = sorted[groupStart]!.endMinutes;
    while (groupEnd < sorted.length && sorted[groupEnd]!.startMinutes < occupiedUntil) {
      occupiedUntil = Math.max(occupiedUntil, sorted[groupEnd]!.endMinutes);
      groupEnd += 1;
    }
    const laneEnds: number[] = [];
    const group = sorted.slice(groupStart, groupEnd).map((item) => {
      const available = laneEnds.findIndex((end) => end <= item.startMinutes);
      const lane = available === -1 ? laneEnds.length : available;
      laneEnds[lane] = item.endMinutes;
      return { ...item, lane };
    });
    positioned.push(...group.map((item) => ({ ...item, laneCount: laneEnds.length })));
    groupStart = groupEnd;
  }
  return positioned;
}

export function calendarAllDayLayout(
  events: ReadonlyArray<CalendarEvent>,
  days: ReadonlyArray<string>,
): ReadonlyArray<{
  readonly event: CalendarEvent;
  readonly startIndex: number;
  readonly span: number;
  readonly lane: number;
  readonly laneCount: number;
}> {
  const rangeStart = days[0];
  const rangeLast = days.at(-1);
  if (rangeStart === undefined || rangeLast === undefined) return [];
  const rangeEnd = addCalendarDate(rangeLast, 1);
  if (rangeEnd === null) return [];
  const layout: Array<{ event: CalendarEvent; startIndex: number; span: number }> = [];
  for (const item of projectCalendarOccurrences(events, rangeStart, rangeEnd)) {
    if (!isCalendarAllDay(item.event)) continue;
    const clipped = clipAllDayToDays(item.start, item.end, days);
    if (clipped === null) continue;
    layout.push({
      event: { ...item.event, start: item.start, end: item.end },
      startIndex: clipped.startIndex,
      span: clipped.span,
    });
  }
  const sorted = layout.sort((left, right) => left.startIndex - right.startIndex || right.span - left.span);
  const positioned = assignCalendarSpanLanes(sorted);
  const laneCount = Math.max(1, positioned[0]?.laneCount ?? 0);
  return positioned.map((item) => ({ ...item, laneCount }));
}

export function calendarMonthWeekLayout(
  events: ReadonlyArray<CalendarEvent>,
  days: ReadonlyArray<string>,
  rowLimit: number,
): {
  readonly items: ReadonlyArray<{
    readonly event: CalendarEvent;
    readonly startIndex: number;
    readonly span: number;
    readonly lane: number;
  }>;
  readonly hiddenCounts: ReadonlyArray<number>;
  readonly laneCount: number;
} {
  const empty = { items: [], hiddenCounts: days.map(() => 0), laneCount: 0 };
  const rangeStart = days[0];
  const rangeLast = days.at(-1);
  if (rangeStart === undefined || rangeLast === undefined) return empty;
  const rangeEnd = addCalendarDate(rangeLast, 1);
  if (rangeEnd === null) return empty;
  const layout: Array<{ event: CalendarEvent; startIndex: number; span: number }> = [];
  for (const item of projectCalendarOccurrences(events, rangeStart, rangeEnd)) {
    const occurrence = { ...item.event, start: item.start, end: item.end };
    const clipped = isCalendarAllDay(occurrence)
      ? clipAllDayToDays(item.start, item.end, days)
      : clipTimedToDays(item.start, item.end, days);
    if (clipped === null) continue;
    layout.push({ event: occurrence, startIndex: clipped.startIndex, span: clipped.span });
  }
  layout.sort((left, right) => {
    if (left.startIndex !== right.startIndex) return left.startIndex - right.startIndex;
    const leftAllDay = isCalendarAllDay(left.event) ? 0 : 1;
    const rightAllDay = isCalendarAllDay(right.event) ? 0 : 1;
    if (leftAllDay !== rightAllDay) return leftAllDay - rightAllDay;
    return right.span - left.span || left.event.start.localeCompare(right.event.start);
  });
  const positioned = assignCalendarSpanLanes(layout);
  const covering = (index: number) => positioned.filter((item) => (
    index >= item.startIndex && index < item.startIndex + item.span
  ));
  const overflow = days.some((_, index) => covering(index).length > rowLimit);
  const visibleLaneCount = overflow
    ? Math.max(0, rowLimit - 1)
    : positioned.reduce((max, item) => Math.max(max, item.lane + 1), 0);
  return {
    items: positioned.filter((item) => item.lane < visibleLaneCount),
    hiddenCounts: days.map((_, index) => covering(index).filter((item) => item.lane >= visibleLaneCount).length),
    laneCount: visibleLaneCount,
  };
}

function assignCalendarSpanLanes<T extends { readonly startIndex: number; readonly span: number }>(
  layout: ReadonlyArray<T>,
): ReadonlyArray<T & { readonly lane: number; readonly laneCount: number }> {
  const laneEnds: number[] = [];
  const positioned = layout.map((item) => {
    const available = laneEnds.findIndex((end) => end <= item.startIndex);
    const lane = available === -1 ? laneEnds.length : available;
    laneEnds[lane] = item.startIndex + item.span;
    return { ...item, lane };
  });
  const laneCount = laneEnds.length;
  return positioned.map((item) => ({ ...item, laneCount }));
}

function clipTimedToDays(
  start: string,
  end: string,
  days: ReadonlyArray<string>,
): { readonly startIndex: number; readonly span: number } | null {
  let startIndex = -1;
  let lastIndex = -1;
  for (const day of calendarOccurrenceDays(start, end, false)) {
    const index = days.indexOf(day);
    if (index < 0) continue;
    if (startIndex < 0) startIndex = index;
    lastIndex = index;
  }
  if (startIndex < 0 || lastIndex < startIndex) return null;
  return { startIndex, span: lastIndex - startIndex + 1 };
}

function clipAllDayToDays(
  start: string,
  end: string,
  days: ReadonlyArray<string>,
): { readonly startIndex: number; readonly span: number } | null {
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) return null;
  const visibleEnd = addCalendarDate(last, 1);
  if (visibleEnd === null) return null;
  const startDate = calendarDatePart(start);
  const exclusiveEnd = calendarDatePart(end);
  if (exclusiveEnd <= first || startDate >= visibleEnd) return null;
  const foundStart = days.indexOf(startDate);
  const foundEnd = days.indexOf(exclusiveEnd);
  const startIndex = foundStart >= 0 ? foundStart : startDate < first ? 0 : -1;
  const endIndex = foundEnd >= 0 ? foundEnd : exclusiveEnd >= visibleEnd ? days.length : -1;
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return null;
  return { startIndex, span: endIndex - startIndex };
}

export function calendarEventsInMonth(
  events: ReadonlyArray<CalendarEvent>,
  month: string,
): ReadonlyArray<CalendarEvent> {
  const start = `${month}-01`;
  const startUtc = parseCalendarDate(start);
  if (startUtc === null) return [];
  const end = Temporal.PlainYearMonth.from(month).add({ months: 1 }).toPlainDate({ day: 1 }).toString();
  return projectCalendarOccurrences(events, start, end).map((item) => ({
    ...item.event,
    start: item.start,
    end: item.end,
  }));
}

function occurrenceEndOf(event: CalendarEvent, occurrenceStart: string): string {
  const bounds = calendarEventBounds(event);
  if (bounds === null) return occurrenceStart;
  if (isCalendarAllDay(event)) {
    const from = parseCalendarDate(calendarDatePart(occurrenceStart));
    if (from === null) return occurrenceStart;
    return formatCalendarDate(from.add({ days: calendarDaysBetween(bounds.from.toPlainDate(), bounds.to.toPlainDate()) }));
  }
  const from = parseCalendarInstant(occurrenceStart);
  if (from === null) return occurrenceStart;
  return formatCalendarInstant(from.add({ minutes: calendarMinutesBetween(bounds.from, bounds.to) }));
}

function shiftSeriesValue(seriesValue: string, origin: string, next: string): string | undefined {
  const originInstant = parseCalendarInstant(origin);
  const nextInstant = parseCalendarInstant(next);
  const seriesInstant = parseCalendarInstant(seriesValue);
  if (originInstant !== null && nextInstant !== null && seriesInstant !== null) {
    return formatCalendarInstant(seriesInstant.add({ minutes: calendarMinutesBetween(originInstant, nextInstant) }));
  }
  const originDate = parseCalendarDate(calendarDatePart(origin));
  const nextDate = parseCalendarDate(calendarDatePart(next));
  const seriesDate = parseCalendarDate(calendarDatePart(seriesValue));
  if (originDate === null || nextDate === null || seriesDate === null) return undefined;
  return formatCalendarDate(seriesDate.add({ days: calendarDaysBetween(originDate, nextDate) }));
}

function shiftedOccurrenceTimes(
  event: CalendarEvent,
  occurrenceStart: string,
  start: string | undefined,
  end: string | undefined,
): { readonly start: string; readonly end: string } | null {
  const nextStart = start ?? occurrenceStart;
  if (end !== undefined) return nextStart < end ? { start: nextStart, end } : null;
  const bounds = calendarEventBounds(event);
  if (bounds === null) return null;
  if (isCalendarAllDay(event)) {
    const from = parseCalendarDate(calendarDatePart(nextStart));
    if (from === null) return null;
    const duration = calendarDaysBetween(bounds.from.toPlainDate(), bounds.to.toPlainDate());
    const nextEnd = formatCalendarDate(from.add({ days: duration }));
    const dateStart = calendarDatePart(nextStart);
    return dateStart < nextEnd ? { start: dateStart, end: nextEnd } : null;
  }
  const from = parseCalendarInstant(nextStart);
  if (from === null) return null;
  const duration = calendarMinutesBetween(bounds.from, bounds.to);
  const nextEnd = formatCalendarInstant(from.add({ minutes: duration }));
  return nextStart < nextEnd ? { start: nextStart, end: nextEnd } : null;
}

function createUniqueId(events: ReadonlyArray<CalendarEvent>, createId: () => string): string {
  const existing = new Set(events.map((event) => event.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId();
    if (!existing.has(id)) return id;
  }
  throw new Error("createId did not produce a unique calendar event id");
}

function emptyCalendarSelection(): CalendarSelection {
  return { kind: "range", ranges: [], primaryIndex: null };
}

function selectionForOccurrence(eventId: string, occurrenceStart: string): CalendarSelection {
  const point: CalendarOccurrencePoint = { eventId, occurrenceStart };
  return {
    kind: "range",
    ranges: [{ anchor: point, focus: point, points: [point] }],
    primaryIndex: 0,
  };
}

function asCalendarSelection(selection: MaterializedRangeSelection<CalendarOccurrencePoint>): CalendarSelection {
  return {
    kind: "range",
    ranges: selection.ranges.map((range) => ({
      anchor: range.anchor,
      focus: range.focus,
      points: [...range.points],
    })),
    primaryIndex: selection.primaryIndex,
  };
}

function selectionForEvents(
  events: ReadonlyArray<CalendarEvent>,
  eventIds: ReadonlyArray<string>,
): CalendarSelection {
  const byId = new Map(events.map((event) => [event.id, event]));
  const ranges = eventIds.flatMap((eventId) => {
    const event = byId.get(eventId);
    if (event === undefined) return [];
    return selectionForOccurrence(eventId, event.start).ranges;
  });
  return { kind: "range", ranges, primaryIndex: ranges.length === 0 ? null : ranges.length - 1 };
}

function success(snapshot: EditingSnapshot<CalendarSelection>): EditingResult<CalendarSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<CalendarSelection> {
  return { ok: false, code };
}
