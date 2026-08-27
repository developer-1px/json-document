import {
  buildPointer,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createKeySelectionFamily,
  type KeySelectionCommand,
  type KeySelectionContext,
} from "@interactive-os/json-document-selection";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import {
  assertCalendarDocument,
  calendarDatePart,
  calendarEventBounds,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  parseCalendarDate,
  parseCalendarInstant,
} from "./calendar-validation.js";

export interface CalendarEvent extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
}

export interface CalendarDocument extends Record<string, JSONValue> {
  readonly events: ReadonlyArray<CalendarEvent>;
}

export interface CalendarSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}

export type CalendarView = "day" | "week" | "month" | "year";

export type CalendarIntent =
  | {
      readonly type: "selection.set";
      readonly eventIds: ReadonlyArray<string>;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove" }
  | {
      readonly type: "event.create";
      readonly start: string;
      readonly end: string;
      readonly title?: string;
      readonly allDay?: boolean;
    }
  | { readonly type: "event.move"; readonly eventId: string; readonly start: string }
  | { readonly type: "event.resize"; readonly eventId: string; readonly edge: "start" | "end"; readonly instant: string }
  | { readonly type: "event.move-day"; readonly eventId: string; readonly day: string };

export interface CalendarEditor {
  readonly snapshot: EditingSnapshot<CalendarSelection>;
  readonly selectedEvents: ReadonlyArray<CalendarEvent>;
  dispatch(intent: CalendarIntent): EditingResult<CalendarSelection>;
  undo(): EditingResult<CalendarSelection>;
  redo(): EditingResult<CalendarSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<CalendarSelection>) => void): () => void;
}

export function createCalendarEditor(
  source: EditingDocumentSource<CalendarDocument>,
  options: { readonly createId?: () => string } = {},
): CalendarEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as CalendarDocument;
  assertCalendarDocument(initial);
  let sequence = 0;
  const createId = options.createId ?? (() => `event-${++sequence}`);
  const selectionFamily = createKeySelectionFamily<string>();
  const first = initial.events[0];
  const session = createEditingSession({
    document,
    selection: first ? selectionFor([first.id]) : selectionFor([]),
  });

  function value(): CalendarDocument {
    return session.snapshot.value as CalendarDocument;
  }

  function selectedEvents(): CalendarEvent[] {
    const ids = new Set(selectionFamily.targets(session.snapshot.selection, selectionContext()));
    return value().events.filter((event) => ids.has(event.id));
  }

  function selectionContext(): KeySelectionContext<string> {
    return {
      keys: value().events.map((event) => event.id),
      universe: "events",
      universeMismatch: "clear",
    };
  }

  function dispatch(intent: CalendarIntent): EditingResult<CalendarSelection> {
    if (intent.type === "selection.set") {
      const available = new Set(value().events.map((event) => event.id));
      if (intent.eventIds.some((id) => !available.has(id))) return failure("selection.event-not-found");
      const command: KeySelectionCommand<string> = {
        type: intent.mode === "extend" ? "add" : intent.mode ?? "replace",
        keys: intent.eventIds,
      };
      const selection = selectionFamily.transition(
        session.snapshot.selection,
        command,
        selectionContext(),
      ).state;
      return success(session.select(selectionFor(
        selectionFamily.targets(selection, selectionContext()),
        selection.primaryKey,
      )));
    }

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
      };
      return session.apply({
        operations: [{ op: "add", path: `/events/${events.length}`, value: event }],
        selectionAfter: selectionFor([event.id]),
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
    const nextEnd = formatCalendarInstant(nextStart + (to - from));
    return session.apply({
      operations: [
        { op: "replace", path: buildPointer(["events", index, "start"]), value: start },
        { op: "replace", path: buildPointer(["events", index, "end"]), value: nextEnd },
      ],
      selectionAfter: selectionFor([eventId]),
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
      selectionAfter: selectionFor([eventId]),
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
      const delta = nextDay - from;
      return session.apply({
        operations: [
          { op: "replace", path: buildPointer(["events", index, "start"]), value: formatCalendarDate(from + delta) },
          { op: "replace", path: buildPointer(["events", index, "end"]), value: formatCalendarDate(to + delta) },
        ],
        selectionAfter: selectionFor([eventId]),
        origin: "event.move-day",
      });
    }
    const from = parseCalendarInstant(event.start);
    const to = parseCalendarInstant(event.end);
    const currentDay = parseCalendarInstant(`${calendarDatePart(event.start)}T00:00`);
    const nextDay = parseCalendarInstant(`${day}T00:00`);
    if (from === null || to === null || currentDay === null || nextDay === null) return failure("event.invalid-instant");
    const delta = nextDay - currentDay;
    return session.apply({
      operations: [
        { op: "replace", path: buildPointer(["events", index, "start"]), value: formatCalendarInstant(from + delta) },
        { op: "replace", path: buildPointer(["events", index, "end"]), value: formatCalendarInstant(to + delta) },
      ],
      selectionAfter: selectionFor([eventId]),
      origin: "event.move-day",
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
      selectionAfter: selectionFor(next ? [next.id] : []),
      origin: "selection.remove",
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedEvents() { return selectedEvents(); },
    dispatch,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

export function calendarEventsOnDay(
  events: ReadonlyArray<CalendarEvent>,
  day: string,
): ReadonlyArray<CalendarEvent> {
  const start = parseCalendarDate(day) ?? parseCalendarInstant(`${day}T00:00`);
  if (start === null) return [];
  const end = start + 86_400_000;
  return events.filter((event) => {
    const bounds = calendarEventBounds(event);
    return bounds !== null && bounds.from < end && bounds.to > start;
  });
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
  const dayEnd = dayStart + 86_400_000;
  const layout: Array<{ event: CalendarEvent; startMinutes: number; endMinutes: number }> = [];
  for (const event of events) {
    if (isCalendarAllDay(event)) continue;
    const bounds = calendarEventBounds(event);
    if (bounds === null || bounds.to <= dayStart || bounds.from >= dayEnd) continue;
    layout.push({
      event,
      startMinutes: (Math.max(bounds.from, dayStart) - dayStart) / 60_000,
      endMinutes: (Math.min(bounds.to, dayEnd) - dayStart) / 60_000,
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
}> {
  const layout: Array<{ event: CalendarEvent; startIndex: number; span: number }> = [];
  for (const event of events) {
    if (!isCalendarAllDay(event)) continue;
    const occupied = days
      .map((day, index) => calendarEventsOnDay([event], day).length > 0 ? index : -1)
      .filter((index) => index >= 0);
    const startIndex = occupied[0];
    const last = occupied.at(-1);
    if (startIndex === undefined || last === undefined) continue;
    layout.push({ event, startIndex, span: last - startIndex + 1 });
  }
  return layout;
}

export function calendarEventsInMonth(
  events: ReadonlyArray<CalendarEvent>,
  month: string,
): ReadonlyArray<CalendarEvent> {
  const start = parseCalendarDate(`${month}-01`);
  if (start === null) return [];
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const end = Date.UTC(year, monthNumber, 1);
  return events.filter((event) => {
    const bounds = calendarEventBounds(event);
    return bounds !== null && bounds.from < end && bounds.to > start;
  });
}

function createUniqueId(events: ReadonlyArray<CalendarEvent>, createId: () => string): string {
  const existing = new Set(events.map((event) => event.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId();
    if (!existing.has(id)) return id;
  }
  throw new Error("createId did not produce a unique calendar event id");
}

function selectionFor(
  keys: ReadonlyArray<string>,
  primaryKey: string | null = keys.at(-1) ?? null,
): CalendarSelection {
  return { kind: "explicit", keys: [...keys], primaryKey };
}

function success(snapshot: EditingSnapshot<CalendarSelection>): EditingResult<CalendarSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<CalendarSelection> {
  return { ok: false, code };
}
