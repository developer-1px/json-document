import type { JSONValue } from "@interactive-os/json-document";

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

/** A resolved document occurrence, independent of selection or an editor. */
export interface CalendarOccurrenceInterval {
  readonly eventId: string;
  readonly start: string;
  readonly end: string;
}
