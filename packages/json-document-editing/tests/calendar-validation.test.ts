import { describe, expect, test } from "vitest";
import { calendarDatePart, calendarIntervalLastDate } from "../src/index.js";

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
