import { describe, expect, test } from "vitest";
import { calendarEventLabel } from "../src/index.js";

describe("calendarEventLabel", () => {
  test("projects timed and all-day events to stable accessible names", () => {
    expect(calendarEventLabel({ title: "Planning", start: "2026-05-25T09:30", allDay: false })).toBe("09:30 Planning");
    expect(calendarEventLabel({ title: "Holiday", start: "2026-05-25", allDay: true })).toBe("Holiday");
    expect(calendarEventLabel({ title: "Fallback", start: "2026-05-25", allDay: false })).toBe("Fallback");
  });
});
