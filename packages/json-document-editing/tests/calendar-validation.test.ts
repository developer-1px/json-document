import { describe, expect, test } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import {
  calendarAllDaySpan,
  calendarDatePart,
  calendarDocumentCalendar,
  calendarDocumentCalendars,
  calendarIntervalLastDate,
  formatCalendarInstant,
  parseCalendarView,
  type CalendarDocument,
} from "../src/index.js";

const calendarDocument: CalendarDocument = {
  calendars: [
    { id: "work", title: "Work", hidden: false, color: "accent" },
    { id: "home", title: "Home", hidden: true, color: "subtle" },
  ],
  events: [],
};

describe("Calendar document calendar projection", () => {
  test("projects a safe collection and resolves calendars by id", () => {
    expect(calendarDocumentCalendars(calendarDocument)).toBe(calendarDocument.calendars);
    expect(calendarDocumentCalendars({ calendars: null } as unknown as CalendarDocument)).toEqual([]);
    expect(calendarDocumentCalendar(calendarDocument, "home")).toBe(calendarDocument.calendars[1]);
    expect(calendarDocumentCalendar(calendarDocument, "missing")).toBeNull();
  });
});

describe("formatCalendarInstant", () => {
  test("serializes Calendar date-time values at minute precision", () => {
    expect(formatCalendarInstant(Temporal.PlainDateTime.from("2026-05-25T09:30:45.123"))).toBe("2026-05-25T09:30");
  });
});

describe("parseCalendarView", () => {
  test("accepts canonical calendar views and rejects other runtime values", () => {
    expect(["day", "week", "month", "year"].map(parseCalendarView)).toEqual(["day", "week", "month", "year"]);
    expect(parseCalendarView("agenda")).toBeNull();
    expect(parseCalendarView(1)).toBeNull();
    expect(parseCalendarView(null)).toBeNull();
  });
});

describe("calendarAllDaySpan", () => {
  test("projects inclusive UI dates to an ordered exclusive all-day interval", () => {
    expect(calendarAllDaySpan("2026-05-25", "2026-05-27")).toEqual({
      start: "2026-05-25",
      end: "2026-05-28",
    });
    expect(calendarAllDaySpan("2026-05-27", "2026-05-25")).toEqual({
      start: "2026-05-25",
      end: "2026-05-28",
    });
    expect(calendarAllDaySpan("2026-05-25", "2026-05-25")).toEqual({
      start: "2026-05-25",
      end: "2026-05-26",
    });
    expect(calendarAllDaySpan("not-a-date", "2026-05-25")).toBeNull();
  });
});

describe("calendarDatePart", () => {
  test("projects the calendar date from date and date-time values", () => {
    expect(calendarDatePart("2026-05-25")).toBe("2026-05-25");
    expect(calendarDatePart("2026-05-25T23:30")).toBe("2026-05-25");
  });
});

describe("calendarIntervalLastDate", () => {
  test("projects exclusive all-day and midnight boundaries without changing timed end dates", () => {
    expect(calendarIntervalLastDate("2026-05-25", "2026-05-28", true)).toBe("2026-05-27");
    expect(calendarIntervalLastDate("2026-05-25T23:30", "2026-05-26T00:00", false)).toBe("2026-05-25");
    expect(calendarIntervalLastDate("2026-05-25T23:30", "2026-05-26T00:30", false)).toBe("2026-05-26");
    expect(calendarIntervalLastDate("2026-05-25", "2026-05-25", true)).toBe("2026-05-25");
  });
});
