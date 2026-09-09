import {
  buildPointer,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createMaterializedRangeSelectionFamily,
  resolveMaterializedSelectionDragSource,
  type MaterializedRangeSelection,
  type MaterializedRangeSelectionCommand,
  type OrderedTopology,
} from "@interactive-os/json-document-selection";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";
import { cutEditingClipboard, type EditingClipboardCut } from "./clipboard.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import { createEditingId, createEditingIdAllocator } from "./identity.js";
import type { EditingHistoryOptions } from "./history.js";
import {
  assertCalendarDocument,
  calendarDatePart,
  calendarDaysBetween,
  calendarDocumentCalendars,
  calendarVisibleEvents,
  calendarMinutesBetween,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  parseCalendarDate,
  parseCalendarInstant,
  planCalendarEventEdit,
  planCalendarEventRemoval,
  planCalendarOccurrenceRemoval,
  planCalendarVisibility,
  projectCalendarOccurrences,
  resolveCalendarOccurrence,
  validateCalendarEvent,
  type CalendarDocument,
  type CalendarEvent,
  type CalendarEventOperation,
  type CalendarOccurrenceInterval,
  type CalendarOccurrencePoint,
} from "@interactive-os/json-document-calendar-document";
import {
  planCalendarSelectionMove,
  type CalendarSelectionMoveTarget,
} from "./calendar-selection-move.js";

export type { CalendarCalendar, CalendarDocument, CalendarEvent, CalendarRecurrence, CalendarOccurrencePoint } from "@interactive-os/json-document-calendar-document";

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
  readonly anchorOccurrenceStart: string;
  readonly items: ReadonlyArray<CalendarClipboardItem>;
  readonly text: string;
}

export type CalendarOccurrenceSelection = CalendarOccurrenceInterval;

export interface CalendarSelectionDragSource {
  readonly anchor: CalendarOccurrencePoint;
  readonly primary: CalendarOccurrencePoint;
  readonly points: ReadonlyArray<CalendarOccurrencePoint>;
  readonly occurrences: ReadonlyArray<CalendarOccurrenceSelection>;
}

export const calendarClipboardFormat = {
  mimeType: "application/vnd.interactive-os.calendar+json" as const,
  parse(value: unknown): CalendarClipboard | null {
    if (!isRecord(value) || value.type !== this.mimeType || typeof value.text !== "string") return null;
    if (!Array.isArray(value.items) || value.items.length === 0) return null;
    if (!value.items.every((item) => (
      isRecord(item)
      && typeof item.sourceEventId === "string" && item.sourceEventId.length > 0
      && isCalendarClipboardEvent(item.event)
      && item.occurrenceStart === item.event.start
    ))) return null;
    const anchorOccurrenceStart = value.anchorOccurrenceStart ?? (value.items[0] as CalendarClipboardItem).occurrenceStart;
    if (!value.items.some((item: CalendarClipboardItem) => item.occurrenceStart === anchorOccurrenceStart)) return null;
    return { ...value, anchorOccurrenceStart } as CalendarClipboard;
  },
};

export type CalendarView = "day" | "week" | "month" | "year";

const CALENDAR_VIEWS: ReadonlySet<string> = new Set(["day", "week", "month", "year"]);

export function parseCalendarView(value: unknown): CalendarView | null {
  return typeof value === "string" && CALENDAR_VIEWS.has(value) ? value as CalendarView : null;
}

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
      readonly type: "selection.move";
      readonly source: CalendarSelectionDragSource;
      readonly target: CalendarSelectionMoveTarget;
      readonly scope?: "this" | "this-and-following" | "all";
    }
  | CalendarEventOperation
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
  prepareSelectionDrag(
    point: CalendarOccurrencePoint,
    topology?: CalendarOccurrenceTopologySnapshot,
  ): CalendarSelectionDragSource | null;
  dispatch(intent: CalendarIntent): EditingResult<CalendarSelection>;
  copy(occurrences?: ReadonlyArray<CalendarOccurrenceSelection>): CalendarClipboard | null;
  cut(source?: ReadonlyArray<CalendarOccurrenceSelection> | CalendarClipboard): EditingClipboardCut<CalendarClipboard, EditingResult<CalendarSelection>> | null;
  paste(clipboard: CalendarClipboard, target?: string, options?: { readonly calendarId?: string }): EditingResult<CalendarSelection>;
  undo(): EditingResult<CalendarSelection>;
  redo(): EditingResult<CalendarSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<CalendarSelection>) => void): () => void;
}

export function createCalendarEditor(
  source: EditingDocumentSource<CalendarDocument>,
  options: EditingHistoryOptions & {
    readonly createId?: () => string;
    readonly initialEventIds?: ReadonlyArray<string>;
  } = {},
): CalendarEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as CalendarDocument;
  assertCalendarDocument(initial);
  const createId = options.createId ?? (() => createEditingId("event"));
  const selectionFamily = createMaterializedRangeSelectionFamily<CalendarOccurrencePoint>();
  const first = initial.events[0];
  const availableIds = new Set(initial.events.map((event) => event.id));
  const initialEventIds = options.initialEventIds === undefined
    ? (first ? [first.id] : [])
    : options.initialEventIds.filter((id) => availableIds.has(id));
  const session = createEditingSession({
    ...options,
    document,
    selection: selectionForEvents(initial.events, initialEventIds),
    reconcileSelection: (selection, value) => asCalendarSelection(selectionFamily.reconcile(selection, {
      topology: calendarOccurrenceOrderedTopology(
        (value as CalendarDocument).events,
        selection.ranges.flatMap((range) => range.points),
      ),
    }).state),
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

    if (intent.type === "selection.move") {
      if (intent.source.points.length !== intent.source.occurrences.length || intent.source.points.some((point, index) => {
        const occurrence = intent.source.occurrences[index];
        return occurrence === undefined || point.eventId !== occurrence.eventId || point.occurrenceStart !== occurrence.start;
      })) return failure("selection.invalid-drag-source");
      const plan = planCalendarSelectionMove(
        value().events,
        intent.source.occurrences,
        intent.source.anchor,
        intent.target,
        { ...(intent.scope === undefined ? {} : { scope: intent.scope }), createId, primary: intent.source.primary },
      );
      if (!plan.ok) return failure(plan.code);
      return session.apply({
        operations: [{ op: "replace", path: "/events", value: plan.events }],
        selectionAfter: plan.selectionAfter,
        origin: intent.type,
      });
    }

    if (intent.type === "event.create" || intent.type === "event.move" || intent.type === "event.resize"
      || intent.type === "event.move-day" || intent.type === "event.update" || intent.type === "occurrence.edit") {
      const current = value();
      const plan = planCalendarEventEdit(current.events, intent, {
        allocateId: createEditingIdAllocator(current.events.map((event) => event.id), createId, "calendar event"),
        calendarIds: new Set(calendarDocumentCalendars(current).map((calendar) => calendar.id)),
        defaultCalendarId: calendarDocumentCalendars(current)[0]?.id ?? "",
      });
      if (!plan.ok) return plan;
      return session.apply({
        operations: plan.operations,
        selectionAfter: selectionForOccurrence(plan.affectedOccurrence.eventId, plan.affectedOccurrence.occurrenceStart),
        origin: intent.type,
      });
    }

    if (intent.type === "occurrence.remove") {
      return removeOccurrence(intent);
    }

    if (intent.type === "calendar.set-hidden") {
      return setCalendarHidden(intent.calendarId, intent.hidden);
    }

    if (intent.type !== "selection.remove") return failure("intent.unsupported");
    const selected = selectedEvents();
    if (selected.length === 0) return failure("selection.empty");
    return removeSelected(selected.map((event) => event.id));
  }

  function removeOccurrence(
    intent: Extract<CalendarIntent, { type: "occurrence.remove" }>,
  ): EditingResult<CalendarSelection> {
    const events = value().events;
    const plan = planCalendarOccurrenceRemoval(events, intent);
    if (!plan.ok) return plan;
    return session.apply({
      operations: plan.operations,
      selectionAfter: plan.events.some((event) => event.id === intent.eventId)
        ? selectionForEvents(plan.events, [intent.eventId])
        : selectionAfterRemoval(events, plan.events, [intent.eventId]),
      origin: intent.type,
    });
  }

  function setCalendarHidden(calendarId: string, hidden: boolean): EditingResult<CalendarSelection> {
    const plan = planCalendarVisibility(value(), calendarId, hidden);
    return plan.ok ? session.apply({
      operations: plan.operations,
      selectionAfter: session.snapshot.selection,
      origin: "calendar.set-hidden",
    }) : plan;
  }

  function removeSelected(ids: ReadonlyArray<string>): EditingResult<CalendarSelection> {
    const events = value().events;
    const plan = planCalendarEventRemoval(events, ids);
    return plan.ok ? session.apply({
      operations: plan.operations,
      selectionAfter: selectionAfterRemoval(events, plan.events, ids),
      origin: "selection.remove",
    }) : plan;
  }

  function selectionAfterRemoval(events: ReadonlyArray<CalendarEvent>, remaining: ReadonlyArray<CalendarEvent>, ids: ReadonlyArray<string>): CalendarSelection {
    const removing = new Set(ids);
    const firstRemoved = events.findIndex((event) => removing.has(event.id));
    const next = remaining[Math.min(firstRemoved, remaining.length - 1)];
    return selectionForEvents(remaining, next ? [next.id] : []);
  }

  function copy(occurrences?: ReadonlyArray<CalendarOccurrenceSelection>): CalendarClipboard | null {
    const source = occurrences ?? selectedOccurrences();
    const items = source.flatMap((occurrence): CalendarClipboardItem[] => {
      const event = value().events.find((candidate) => candidate.id === occurrence.eventId);
      const current = resolveCalendarOccurrence(value().events, { eventId: occurrence.eventId, occurrenceStart: occurrence.start });
      if (event === undefined || current === null || current.end !== occurrence.end) return [];
      return [{
        sourceEventId: event.id,
        occurrenceStart: occurrence.start,
        event: {
          ...event,
          start: occurrence.start,
          end: occurrence.end,
          allDay: isCalendarAllDay(event),
          calendarId: event.calendarId ?? "",
          recurrence: null,
          excludeDates: [],
        },
      }];
    });
    if (items.length === 0 || items.length !== source.length) return null;
    return {
      type: "application/vnd.interactive-os.calendar+json",
      anchorOccurrenceStart: items[0]!.occurrenceStart,
      items,
      text: items.map((item) => `${item.event.start}\t${item.event.end}\t${item.event.title}`).join("\n"),
    };
  }

  function prepareSelectionDrag(
    point: CalendarOccurrencePoint,
    topology?: CalendarOccurrenceTopologySnapshot,
  ): CalendarSelectionDragSource | null {
    const context = selectionContext(topology?.points ?? [point]);
    const source = resolveMaterializedSelectionDragSource(session.snapshot.selection, point, context);
    if (source === null) return null;
    if (source.selectionChanged) session.select(asCalendarSelection(source.selection));
    const occurrences = source.points.flatMap((candidate) => {
      const occurrence = resolveCalendarOccurrence(value().events, candidate);
      return occurrence === null ? [] : [occurrence];
    });
    const primaryIndex = source.selection.primaryIndex;
    const primary = primaryIndex === null ? source.anchor : source.selection.ranges[primaryIndex]?.focus ?? source.anchor;
    return occurrences.length !== source.points.length ? null : {
      anchor: source.anchor,
      primary,
      points: source.points,
      occurrences,
    };
  }

  function removeClipboard(clipboard: CalendarClipboard): EditingResult<CalendarSelection> {
    if (clipboard.items.length === 0) return failure("clipboard.empty");
    const events = value().events;
    let remaining = events;
    const preconditions: JSONPatchOperation[] = [];
    const operations: JSONPatchOperation[] = [];
    for (const item of clipboard.items) {
      const event = events.find((candidate) => candidate.id === item.sourceEventId);
      if (event === undefined) return failure("selection.event-not-found");
      const current = resolveCalendarOccurrence(events, { eventId: event.id, occurrenceStart: item.occurrenceStart });
      if (current === null || current.end !== item.event.end) return failure("selection.stale-occurrence");
      const expected: Record<string, JSONValue> = { ...item.event, start: event.start, end: event.end };
      // Clipboard events are materialized; keep the source's legacy optional-field shape.
      for (const field of ["allDay", "calendarId", "recurrence", "excludeDates"] as const) {
        if (event[field] === undefined) delete expected[field];
        else if (field === "recurrence" || field === "excludeDates") expected[field] = event[field];
      }
      preconditions.push({ op: "test", path: buildPointer(["events", events.indexOf(event)]), value: expected });
      const plan = planCalendarOccurrenceRemoval(remaining, {
        eventId: event.id, occurrenceStart: item.occurrenceStart, scope: "this",
      });
      if (!plan.ok) return plan;
      remaining = plan.events;
      operations.push(...plan.operations);
    }
    return session.apply({ operations: [...preconditions, ...operations], selectionAfter: emptyCalendarSelection(), origin: "clipboard.cut" });
  }

  function paste(clipboard: CalendarClipboard, target?: string, options: { readonly calendarId?: string } = {}): EditingResult<CalendarSelection> {
    const parsed = calendarClipboardFormat.parse(clipboard);
    if (parsed === null) return failure("clipboard.invalid");
    clipboard = parsed;
    const calendarIds = new Set(calendarDocumentCalendars(value()).map((calendar) => calendar.id));
    if (options.calendarId !== undefined && !calendarIds.has(options.calendarId)) return failure("calendar.not-found");
    const resolvedTarget = target ?? primaryOccurrence()?.start;
    if (resolvedTarget === undefined) return failure("clipboard.invalid-target");
    const targetInstant = parseCalendarInstant(resolvedTarget);
    const targetDate = parseCalendarDate(calendarDatePart(resolvedTarget));
    if (targetInstant === null && parseCalendarDate(resolvedTarget) === null) return failure("clipboard.invalid-target");
    const timedAnchor = parseCalendarInstant(clipboard.anchorOccurrenceStart)
      ?? clipboard.items.map((item) => parseCalendarInstant(item.event.start)).find((item) => item !== null)
      ?? null;
    const dateAnchor = parseCalendarDate(calendarDatePart(clipboard.anchorOccurrenceStart));
    if (dateAnchor === null) return failure("clipboard.invalid");
    const existing = value().events;
    const allocateId = createEditingIdAllocator(existing.map((event) => event.id), createId, "calendar event");
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
      const event = { ...source, start, end, calendarId: options.calendarId ?? source.calendarId, recurrence: null, excludeDates: [] };
      const validation = validateCalendarEvent(event, calendarIds);
      if (!validation.ok) return validation;
      pasted.push({ ...event, id: allocateId() });
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
    prepareSelectionDrag,
    dispatch,
    copy,
    cut: (source) => cutEditingClipboard(
      () => source !== undefined && "type" in source ? calendarClipboardFormat.parse(source) : copy(source),
      removeClipboard,
    ),
    paste,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function isCalendarClipboardEvent(value: unknown): value is CalendarEvent {
  return isRecord(value) && validateCalendarEvent(value).ok
    && typeof value.allDay === "boolean" && typeof value.calendarId === "string"
    && value.recurrence === null && Array.isArray(value.excludeDates) && value.excludeDates.length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
