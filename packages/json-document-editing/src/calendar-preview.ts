import type { CalendarEvent } from "./calendar.js";
import { calendarEventExcludeDates, calendarEventRecurrence } from "./calendar-occurrence.js";
import {
  interpretCalendarAllDayPointer,
  type CalendarAllDayPointerRelease,
} from "./calendar-allday-pointer.js";
import {
  bindCalendarTimeGridIntent,
  interpretCalendarTimeGridPointer,
  type CalendarTimeGridPointerIntent,
  type CalendarTimeGridPointerRelease,
} from "./calendar-time-grid-pointer.js";
import {
  addCalendarDate,
  calendarDatePart,
  formatCalendarDate,
  formatCalendarInstant,
  isCalendarAllDay,
  parseCalendarDate,
  parseCalendarInstant,
} from "./calendar-validation.js";

export function previewCalendarAllDay(
  events: ReadonlyArray<CalendarEvent>,
  release: CalendarAllDayPointerRelease,
): ReadonlyArray<CalendarEvent> {
  const intent = interpretCalendarAllDayPointer(release);
  if (intent === null || intent.type === "selection.set") return events;
  if (intent.type === "event.create") {
    return [...events, {
      id: "preview",
      title: "Event",
      start: intent.start,
      end: intent.end,
      allDay: true,
      calendarId: "",
      recurrence: null,
      excludeDates: [],
    }];
  }
  if (intent.type === "event.move-day") {
    return events.map((item) => {
      if (item.id !== intent.eventId || !isCalendarAllDay(item)) return item;
      const from = parseCalendarDate(item.start);
      const to = parseCalendarDate(item.end);
      const nextDay = parseCalendarDate(intent.day);
      if (from === null || to === null || nextDay === null) return item;
      const delta = nextDay - from;
      return {
        ...item,
        start: formatCalendarDate(from + delta),
        end: formatCalendarDate(to + delta),
      };
    });
  }
  return events.map((item) => {
    if (item.id !== intent.eventId) return item;
    const start = intent.edge === "start" ? intent.instant : item.start;
    const end = intent.edge === "end" ? intent.instant : item.end;
    if (start >= end) return item;
    return { ...item, start, end };
  });
}

export function previewCalendarTimeGrid(
  events: ReadonlyArray<CalendarEvent>,
  release: CalendarTimeGridPointerRelease,
  scope: "this" | "this-and-following" | "all" = "this",
): ReadonlyArray<CalendarEvent> {
  const intent = interpretCalendarTimeGridPointer(release);
  if (intent === null || intent.type === "selection.set") return events;
  if (intent.type === "event.create") {
    return [...events, {
      id: "preview",
      title: "Event",
      start: intent.start,
      end: intent.end,
      allDay: false,
      calendarId: "",
      recurrence: null,
      excludeDates: [],
    }];
  }
  const event = events.find((item) => item.id === intent.eventId);
  const bound = bindCalendarTimeGridIntent(intent, event, release.originEventStart, scope) ?? intent;
  if (
    bound.type === "occurrence.edit"
    && event !== undefined
    && release.originEventStart !== null
  ) {
    if (bound.scope === "this-and-following") {
      return previewFollowingOccurrences(events, event, release.originEventStart, intent);
    }
    return previewRecurringOccurrence(events, event, release.originEventStart, intent);
  }
  if (bound.type === "event.move") {
    return events.map((item) => {
      if (item.id !== bound.eventId || isCalendarAllDay(item)) return item;
      const from = parseCalendarInstant(item.start);
      const to = parseCalendarInstant(item.end);
      const nextStart = parseCalendarInstant(bound.start);
      if (from === null || to === null || nextStart === null) return item;
      return { ...item, start: bound.start, end: formatCalendarInstant(nextStart + (to - from)) };
    });
  }
  if (bound.type !== "event.resize") return events;
  return events.map((item) => {
    if (item.id !== bound.eventId) return item;
    const start = bound.edge === "start" ? bound.instant : item.start;
    const end = bound.edge === "end" ? bound.instant : item.end;
    if (start >= end) return item;
    return { ...item, start, end };
  });
}

function previewFollowingOccurrences(
  events: ReadonlyArray<CalendarEvent>,
  event: CalendarEvent,
  occurrenceStart: string,
  intent: Extract<CalendarTimeGridPointerIntent, { type: "event.move" } | { type: "event.resize" }>,
): ReadonlyArray<CalendarEvent> {
  const recurrence = calendarEventRecurrence(event);
  const from = parseCalendarInstant(event.start);
  const to = parseCalendarInstant(event.end);
  const occStart = parseCalendarInstant(occurrenceStart);
  if (recurrence === null || from === null || to === null || occStart === null) return events;
  const duration = to - from;
  let start = occurrenceStart;
  let end = formatCalendarInstant(occStart + duration);
  if (intent.type === "event.move") {
    const nextStart = parseCalendarInstant(intent.start);
    if (nextStart === null) return events;
    start = intent.start;
    end = formatCalendarInstant(nextStart + duration);
  } else if (intent.edge === "start") {
    start = intent.instant;
  } else {
    end = intent.instant;
  }
  if (start >= end) return events;
  const until = addCalendarDate(calendarDatePart(occurrenceStart), -1);
  if (until === null) return events;
  return [
    ...events.map((item) => item.id === event.id
      ? { ...item, recurrence: { ...recurrence, until } }
      : item),
    {
      ...event,
      id: "preview",
      start,
      end,
      recurrence: { ...recurrence, until: "" },
      excludeDates: [],
    },
  ];
}

function previewRecurringOccurrence(
  events: ReadonlyArray<CalendarEvent>,
  event: CalendarEvent,
  occurrenceStart: string,
  intent: Extract<CalendarTimeGridPointerIntent, { type: "event.move" } | { type: "event.resize" }>,
): ReadonlyArray<CalendarEvent> {
  const from = parseCalendarInstant(event.start);
  const to = parseCalendarInstant(event.end);
  const occStart = parseCalendarInstant(occurrenceStart);
  if (from === null || to === null || occStart === null) return events;
  const duration = to - from;
  let start = occurrenceStart;
  let end = formatCalendarInstant(occStart + duration);
  if (intent.type === "event.move") {
    const nextStart = parseCalendarInstant(intent.start);
    if (nextStart === null) return events;
    start = intent.start;
    end = formatCalendarInstant(nextStart + duration);
  } else if (intent.edge === "start") {
    start = intent.instant;
  } else {
    end = intent.instant;
  }
  if (start >= end) return events;
  const excluded = calendarDatePart(occurrenceStart);
  return [
    ...events.map((item) => item.id === event.id
      ? { ...item, excludeDates: [...calendarEventExcludeDates(item), excluded] }
      : item),
    {
      ...event,
      id: "preview",
      start,
      end,
      recurrence: null,
      excludeDates: [],
    },
  ];
}
