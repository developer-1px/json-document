import { describe, expect, test } from "vitest";
import { calendarIntervalLastDate } from "../src/index.js";

describe("calendarIntervalLastDate", () => {
  test("projects exclusive all-day and midnight boundaries without changing timed end dates", () => {
    expect(calendarIntervalLastDate("2026-05-25", "2026-05-28", true)).toBe("2026-05-27");
    expect(calendarIntervalLastDate("2026-05-25T23:30", "2026-05-26T00:00", false)).toBe("2026-05-25");
    expect(calendarIntervalLastDate("2026-05-25T23:30", "2026-05-26T00:30", false)).toBe("2026-05-26");
    expect(calendarIntervalLastDate("2026-05-25", "2026-05-25", true)).toBe("2026-05-25");
  });
});
