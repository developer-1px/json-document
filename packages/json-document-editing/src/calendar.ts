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
import { Temporal } from "@js-temporal/polyfill";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import {
  addCalendarDate,
  assertCalendarDocument,
  calendarDatePart,
  calendarDaysBetween,
  calendarDocumentCalendars,
  calendarDocumentEvents,
  calendarEventBounds,
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
        calendarId: intent.calendarId ?? calendarDocumentCalendars(value())[0]?.id ?? "",
        recurrence: intent.recurrence ?? null,
        excludeDates: [],
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
      const delta = calendarDaysBetween(from, nextDay);
      return session.apply({
        operations: [
          { op: "replace", path: buildPointer(["events", index, "start"]), value: formatCalendarDate(from.add({ days: delta })) },
          { op: "replace", path: buildPointer(["events", index, "end"]), value: formatCalendarDate(to.add({ days: delta })) },
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
    const delta = calendarMinutesBetween(currentDay, nextDay);
    return session.apply({
      operations: [
        { op: "replace", path: buildPointer(["events", index, "start"]), value: formatCalendarInstant(from.add({ minutes: delta })) },
        { op: "replace", path: buildPointer(["events", index, "end"]), value: formatCalendarInstant(to.add({ minutes: delta })) },
      ],
      selectionAfter: selectionFor([eventId]),
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
      end = addCalendarDate(start, 1) ?? start;
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
      selectionAfter: selectionFor([event.id]),
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
        selectionAfter: selectionFor([split.id]),
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
      selectionAfter: selectionFor([following.id]),
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
        selectionAfter: selectionFor([event.id]),
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
      selectionAfter: selectionFor([event.id]),
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

export function calendarVisibleEvents(document: CalendarDocument): ReadonlyArray<CalendarEvent> {
  const events = calendarDocumentEvents(document);
  const hidden = new Set(calendarDocumentCalendars(document).filter((item) => item.hidden).map((item) => item.id));
  if (hidden.size === 0) return events;
  return events.filter((event) => !hidden.has(event.calendarId));
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
  let last = calendarDatePart(end);
  if (allDay || !end.includes("T") || end.slice(11, 16) === "00:00") {
    last = addCalendarDate(last, -1) ?? first;
  }
  if (last < first) last = first;
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
