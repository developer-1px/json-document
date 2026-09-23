import { Temporal } from "@js-temporal/polyfill";
import type { CalendarDocument, CalendarEvent } from "./calendar-model.js";
import { projectCalendarOccurrences } from "./calendar-occurrence.js";
import {
  addCalendarDate, calendarDatePart, calendarDocumentCalendars, calendarDocumentEvents,
  calendarEventBounds, calendarIntervalLastDate, calendarMinutesBetween,
  isCalendarAllDay, parseCalendarDate, parseCalendarInstant,
} from "./calendar-validation.js";

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
