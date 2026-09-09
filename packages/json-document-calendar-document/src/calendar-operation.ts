import { buildPointer, type JSONPatchOperation } from "@interactive-os/json-document";
import type { CalendarDocument, CalendarEvent, CalendarOccurrencePoint, CalendarRecurrence } from "./calendar-model.js";
import { calendarEventExcludeDates, calendarEventRecurrence, resolveCalendarOccurrence } from "./calendar-occurrence.js";
import {
  addCalendarDate, calendarAllDaySpan, calendarDatePart, calendarDaysBetween,
  calendarDocumentCalendars, calendarEventIntervalAt, calendarMinutesBetween, formatCalendarInstant,
  parseCalendarDate, parseCalendarInstant, validateCalendarEvent,
} from "./calendar-validation.js";

export type CalendarEventOperation =
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
    };

export type CalendarOccurrenceRemoval = {
  readonly eventId: string;
  readonly occurrenceStart: string;
  readonly scope: "this" | "this-and-following" | "all";
};

export type CalendarEventPlan = {
  readonly ok: true;
  readonly events: ReadonlyArray<CalendarEvent>;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly affectedOccurrence: CalendarOccurrencePoint;
} | { readonly ok: false; readonly code: string; readonly reason?: string };

/** Calendar's single event/series semantics, shared by commit, preview and group moves. */
export function planCalendarEventEdit(
  events: ReadonlyArray<CalendarEvent>,
  intent: CalendarEventOperation,
  options: { readonly allocateId: () => string; readonly calendarIds?: ReadonlySet<string>; readonly defaultCalendarId?: string },
): CalendarEventPlan {
  const index = intent.type === "event.create" ? -1 : events.findIndex((event) => event.id === intent.eventId);
  const event = events[index];

  function replace(next: CalendarEvent, selectedStart = next.start, fields?: ReadonlyArray<"start" | "end">): CalendarEventPlan {
    const validation = validateCalendarEvent(next, options.calendarIds);
    if (!validation.ok) return validation;
    return {
      ok: true,
      events: events.map((item, position) => position === index ? next : item),
      operations: fields === undefined
        ? [{ op: "replace", path: buildPointer(["events", index]), value: next }]
        : fields.map((field) => ({ op: "replace", path: buildPointer(["events", index, field]), value: next[field] })),
      affectedOccurrence: { eventId: next.id, occurrenceStart: selectedStart },
    };
  }

  function append(next: CalendarEvent, preceding: ReadonlyArray<JSONPatchOperation> = [], previous?: CalendarEvent): CalendarEventPlan {
    const validation = validateCalendarEvent(next, options.calendarIds);
    if (!validation.ok) return validation;
    if (events.some((event) => event.id === next.id)) return failure("event.duplicate-id");
    if (previous !== undefined) {
      const previousValidation = validateCalendarEvent(previous, options.calendarIds);
      if (!previousValidation.ok) return previousValidation;
    }
    // Detached records own their JSON subtrees, including extension metadata.
    const appended = JSON.parse(JSON.stringify(next)) as CalendarEvent;
    return {
      ok: true,
      events: [...events.map((item, position) => position === index && previous !== undefined ? previous : item), appended],
      operations: [...preceding, { op: "add", path: `/events/${events.length}`, value: appended }],
      affectedOccurrence: { eventId: next.id, occurrenceStart: next.start },
    };
  }

  if (intent.type === "event.create") {
    const candidate: CalendarEvent = {
      id: "pending", title: intent.title ?? "Event", start: intent.start, end: intent.end,
      allDay: intent.allDay ?? false, calendarId: intent.calendarId ?? options.defaultCalendarId ?? "",
      recurrence: intent.recurrence ?? null, excludeDates: [],
    };
    const validation = validateCalendarEvent(candidate, options.calendarIds);
    if (!validation.ok) return validation;
    return append({ ...candidate, id: options.allocateId() });
  }
  if (event === undefined) return failure("selection.event-not-found");
  if (intent.type === "event.resize") {
    if (intent.edge !== "start" && intent.edge !== "end") return failure("event.invalid-edge");
    return replace({ ...event, [intent.edge]: intent.instant }, intent.edge === "start" ? intent.instant : event.start, [intent.edge]);
  }
  if (intent.type === "event.move" || intent.type === "event.move-day") {
    if (intent.type === "event.move" && event.allDay) return failure("event.all-day-move");
    if (intent.type === "event.move-day" && parseCalendarDate(intent.day) === null) return failure("event.invalid-day");
    const start = intent.type === "event.move" ? intent.start
      : event.allDay ? intent.day : `${intent.day}T${event.start.slice(11)}`;
    const interval = calendarEventIntervalAt(event, start);
    return interval === null ? failure("event.invalid-instant") : replace({ ...event, ...interval }, start, ["start", "end"]);
  }
  if (intent.type === "event.update") {
    let start = intent.start ?? event.start;
    let end = intent.end ?? event.end;
    if (intent.allDay === true && !event.allDay) {
      start = calendarDatePart(event.start);
      end = calendarAllDaySpan(start, start)?.end ?? start;
    } else if (intent.allDay === false && event.allDay) {
      start = `${calendarDatePart(event.start)}T09:00`;
      end = `${calendarDatePart(event.start)}T10:00`;
    } else if (intent.start !== undefined && intent.end === undefined) {
      const interval = calendarEventIntervalAt(event, intent.start);
      if (interval === null) return failure("event.invalid-instant");
      ({ start, end } = interval);
    }
    return replace({ ...event, start, end, allDay: intent.allDay ?? event.allDay,
      title: intent.title ?? event.title, calendarId: intent.calendarId ?? event.calendarId,
      recurrence: intent.recurrence === undefined ? event.recurrence : intent.recurrence });
  }

  if (intent.type !== "occurrence.edit") return failure("operation.unsupported");
  if (intent.scope !== "this" && intent.scope !== "this-and-following" && intent.scope !== "all") return failure("occurrence.invalid-scope");
  const occurrence = resolveCalendarOccurrence(events, { eventId: event.id, occurrenceStart: intent.occurrenceStart });
  if (occurrence === null) return failure("selection.stale-occurrence");
  const interval = intent.end === undefined
    ? calendarEventIntervalAt({ ...event, start: occurrence.start, end: occurrence.end }, intent.start ?? occurrence.start)
    : { start: intent.start ?? occurrence.start, end: intent.end };
  if (interval === null) return failure("event.invalid-instant");
  const next = { ...event, ...interval, title: intent.title ?? event.title };
  const validation = validateCalendarEvent(next, options.calendarIds);
  if (!validation.ok) return validation;
  const recurrence = calendarEventRecurrence(event);
  if (recurrence === null) return replace(next);

  if (intent.scope === "all") {
    const start = shiftValue(event.start, occurrence.start, interval.start);
    const end = shiftValue(event.end, occurrence.end, interval.end);
    if (start === null || end === null) return failure("event.invalid-instant");
    const shifted = shiftRecurrence(event, occurrence.start, interval.start);
    const plan = replace({ ...next, start, end, ...shifted }, interval.start);
    if (!plan.ok) return plan;
    return resolveCalendarOccurrence(plan.events, plan.affectedOccurrence)?.end === interval.end
      ? plan : failure("selection.unrepresentable-series-move");
  }
  const day = calendarDatePart(occurrence.start);
  const id = options.allocateId();
  if (intent.scope === "this") {
    const excludeDates = [...new Set([...calendarEventExcludeDates(event), day])];
    return append({ ...next, id, recurrence: null, excludeDates: [] }, [
      { op: "add", path: buildPointer(["events", index, "excludeDates"]), value: excludeDates },
    ], { ...event, excludeDates });
  }
  const previous = { ...event, recurrence: { ...recurrence, until: addCalendarDate(day, -1)! } };
  const shifted = shiftRecurrence({ ...event, excludeDates: calendarEventExcludeDates(event).filter((date) => date >= day) }, occurrence.start, interval.start);
  return append({ ...next, id, ...shifted }, [
    { op: "replace", path: buildPointer(["events", index, "recurrence"]), value: previous.recurrence },
  ], previous);
}

function shiftValue(value: string, origin: string, next: string): string | null {
  if (value.length === 10) {
    const from = parseCalendarDate(origin), to = parseCalendarDate(next);
    return from === null || to === null ? null : addCalendarDate(value, calendarDaysBetween(from, to));
  }
  const start = parseCalendarInstant(value), from = parseCalendarInstant(origin), to = parseCalendarInstant(next);
  return start === null || from === null || to === null ? null
    : formatCalendarInstant(start.add({ minutes: calendarMinutesBetween(from, to) }));
}

function shiftRecurrence(event: CalendarEvent, origin: string, next: string): Pick<CalendarEvent, "recurrence" | "excludeDates"> {
  const recurrence = calendarEventRecurrence(event)!;
  const delta = calendarDaysBetween(parseCalendarDate(calendarDatePart(origin))!, parseCalendarDate(calendarDatePart(next))!);
  return {
    recurrence: { ...recurrence, until: recurrence.until === "" ? "" : addCalendarDate(recurrence.until, delta)! },
    excludeDates: calendarEventExcludeDates(event).map((date) => addCalendarDate(date, delta)!),
  };
}

export type CalendarPatchPlan = { readonly ok: true; readonly operations: ReadonlyArray<JSONPatchOperation> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
export type CalendarEventsPlan = (Extract<CalendarPatchPlan, { ok: true }> & { readonly events: ReadonlyArray<CalendarEvent> })
  | Extract<CalendarPatchPlan, { ok: false }>;

/** Remove document records; choosing the next selection belongs to Editing. */
export function planCalendarEventRemoval(events: ReadonlyArray<CalendarEvent>, eventIds: ReadonlyArray<string>): CalendarEventsPlan {
  const removing = new Set(eventIds);
  const knownIds = new Set(events.map((event) => event.id));
  if (removing.size === 0 || eventIds.some((id) => !knownIds.has(id))) return failure("selection.event-not-found");
  return {
    ok: true,
    events: events.filter((event) => !removing.has(event.id)),
    operations: events.flatMap((event, index): JSONPatchOperation[] => removing.has(event.id)
      ? [{ op: "remove", path: buildPointer(["events", index]) }] : []).reverse(),
  };
}

/** Exclusion and recurrence truncation have the same meaning without an editor. */
export function planCalendarOccurrenceRemoval(events: ReadonlyArray<CalendarEvent>, removal: CalendarOccurrenceRemoval): CalendarEventsPlan {
  const index = events.findIndex((event) => event.id === removal.eventId);
  const event = events[index];
  if (event === undefined) return failure("selection.event-not-found");
  if (removal.scope !== "this" && removal.scope !== "this-and-following" && removal.scope !== "all") return failure("occurrence.invalid-scope");
  if (resolveCalendarOccurrence(events, removal) === null) return failure("selection.stale-occurrence");
  const recurrence = calendarEventRecurrence(event);
  if (recurrence === null || removal.scope === "all") return planCalendarEventRemoval(events, [event.id]);
  const day = calendarDatePart(removal.occurrenceStart);
  const until = addCalendarDate(day, -1);
  if (removal.scope === "this-and-following" && (until === null || until < calendarDatePart(event.start))) {
    return planCalendarEventRemoval(events, [event.id]);
  }
  const field = removal.scope === "this" ? "excludeDates" : "recurrence";
  const value = removal.scope === "this" ? [...calendarEventExcludeDates(event), day] : { ...recurrence, until: until! };
  return {
    ok: true,
    events: events.map((item, position) => position === index ? { ...item, [field]: value } : item),
    operations: [{ op: field === "excludeDates" ? "add" : "replace", path: buildPointer(["events", index, field]), value }],
  };
}

export function planCalendarVisibility(document: CalendarDocument, calendarId: string, hidden: boolean): CalendarPatchPlan {
  if (typeof hidden !== "boolean") return failure("calendar.invalid-hidden");
  const index = calendarDocumentCalendars(document).findIndex((calendar) => calendar.id === calendarId);
  return index < 0 ? failure("calendar.not-found") : {
    ok: true, operations: [{ op: "replace", path: buildPointer(["calendars", index, "hidden"]), value: hidden }],
  };
}

function failure(code: string): { readonly ok: false; readonly code: string } { return { ok: false, code }; }
