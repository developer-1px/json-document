import { describe, expect, test } from "vitest";

import { calendarSearch } from "../../src/routes/calendar-demo/calendar-search";

describe("calendarSearch", () => {
  test("parses a valid view and date", () => {
    expect(calendarSearch({ view: "month", date: "2026-06-01" })).toEqual({
      view: "month",
      date: "2026-06-01",
    });
  });

  test("falls back for an invalid view", () => {
    expect(calendarSearch({ view: "agenda", date: "2026-06-01" })).toEqual({
      view: "week",
      date: "2026-06-01",
    });
  });

  test("falls back for an invalid date", () => {
    expect(calendarSearch({ view: "day", date: "05/25/2026" })).toEqual({
      view: "day",
      date: "2026-05-25",
    });
  });

  test("falls back when keys are missing", () => {
    expect(calendarSearch({})).toEqual({
      view: "week",
      date: "2026-05-25",
    });
  });

  test("falls back for an impossible civil date", () => {
    expect(calendarSearch({ view: "month", date: "2026-02-31" })).toEqual({
      view: "month",
      date: "2026-05-25",
    });
  });
});
