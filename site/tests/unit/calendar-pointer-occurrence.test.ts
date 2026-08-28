import { describe, expect, test } from "vitest";
import {
  calendarAllDayResizeDays,
  calendarInspectorOccurrence,
  calendarPointerOccurrence,
  calendarSelectionOccurrence,
  calendarVisibleHourBand,
} from "../../src/routes/calendar-demo/calendar-pointer-occurrence";

const origin = { start: "2026-05-25T09:00", end: "2026-05-25T09:30" };

describe("calendarPointerOccurrence", () => {
  test("keeps origin times when the pointer only selects", () => {
    expect(calendarPointerOccurrence(
      { type: "selection.set", eventIds: ["standup"] },
      origin,
      { start: "2026-05-25T09:00", end: "2026-05-25T09:30" },
    )).toEqual(origin);
  });

  test("uses the committed event after an occurrence edit", () => {
    expect(calendarPointerOccurrence(
      {
        type: "occurrence.edit",
        eventId: "standup",
        occurrenceStart: "2026-05-26T09:00",
        scope: "this",
        start: "2026-05-26T11:00",
      },
      origin,
      { start: "2026-05-26T11:00", end: "2026-05-26T11:30" },
    )).toEqual({ start: "2026-05-26T11:00", end: "2026-05-26T11:30" });
  });

  test("uses the committed event after a duration-preserving move", () => {
    expect(calendarPointerOccurrence(
      { type: "event.move", eventId: "standup", start: "2026-05-25T11:00" },
      origin,
      { start: "2026-05-25T11:00", end: "2026-05-25T11:30" },
    )).toEqual({ start: "2026-05-25T11:00", end: "2026-05-25T11:30" });
  });

  test("uses the committed event after an edge resize", () => {
    expect(calendarPointerOccurrence(
      { type: "event.resize", eventId: "standup", edge: "end", instant: "2026-05-25T10:00" },
      origin,
      { start: "2026-05-25T09:00", end: "2026-05-25T10:00" },
    )).toEqual({ start: "2026-05-25T09:00", end: "2026-05-25T10:00" });
  });

  test("uses the resized instant even if committed still has the origin interval", () => {
    expect(calendarPointerOccurrence(
      { type: "event.resize", eventId: "holiday", edge: "end", instant: "2026-05-25" },
      { start: "2026-05-22", end: "2026-05-24" },
      { start: "2026-05-22", end: "2026-05-24" },
    )).toEqual({ start: "2026-05-22", end: "2026-05-25" });
    expect(calendarPointerOccurrence(
      { type: "event.resize", eventId: "holiday", edge: "start", instant: "2026-05-21" },
      { start: "2026-05-22", end: "2026-05-24" },
      { start: "2026-05-22", end: "2026-05-24" },
    )).toEqual({ start: "2026-05-21", end: "2026-05-24" });
  });

  test("uses the committed event after a day move", () => {
    expect(calendarPointerOccurrence(
      { type: "event.move-day", eventId: "standup", day: "2026-05-26" },
      origin,
      { start: "2026-05-26T09:00", end: "2026-05-26T09:30" },
    )).toEqual({ start: "2026-05-26T09:00", end: "2026-05-26T09:30" });
  });

  test("uses the created span", () => {
    expect(calendarPointerOccurrence(
      { type: "event.create", start: "2026-05-25T10:00", end: "2026-05-25T11:30" },
      { start: null, end: null },
      null,
    )).toEqual({ start: "2026-05-25T10:00", end: "2026-05-25T11:30" });
  });
});

describe("calendarSelectionOccurrence", () => {
  test("follows the selected event after delete or undo", () => {
    expect(calendarSelectionOccurrence(null)).toEqual({ start: null, end: null });
    expect(calendarSelectionOccurrence({
      start: "2026-05-25T09:00",
      end: "2026-05-25T09:30",
    })).toEqual({
      start: "2026-05-25T09:00",
      end: "2026-05-25T09:30",
    });
  });
});

describe("calendarInspectorOccurrence", () => {
  test("uses the committed event for a non-recurring resize even if occurrence state is stale", () => {
    expect(calendarInspectorOccurrence(
      { start: "2026-05-22", end: "2026-05-25", recurrence: null },
      { start: "2026-05-22", end: "2026-05-24" },
    )).toEqual({ start: "2026-05-22", end: "2026-05-25" });
  });

  test("uses the occurrence interval for a recurring series", () => {
    expect(calendarInspectorOccurrence(
      {
        start: "2026-05-25T09:00",
        end: "2026-05-25T09:30",
        recurrence: { freq: "daily", interval: 1, until: "2026-05-29" },
      },
      { start: "2026-05-26T09:00", end: "2026-05-26T09:30" },
    )).toEqual({ start: "2026-05-26T09:00", end: "2026-05-26T09:30" });
  });
});

describe("calendarAllDayResizeDays", () => {
  test("maps pixel delta to whole days using the column width", () => {
    expect(calendarAllDayResizeDays(100, 100)).toBe(1);
    expect(calendarAllDayResizeDays(40, 100)).toBe(0);
    expect(calendarAllDayResizeDays(-160, 100)).toBe(-2);
    expect(calendarAllDayResizeDays(80, 0)).toBe(0);
  });
});

describe("calendarVisibleHourBand", () => {
  test("clips a full-day layout to the visible hour band", () => {
    expect(calendarVisibleHourBand(0, 1440, 7, 19)).toEqual({
      startMinutes: 420,
      endMinutes: 1140,
    });
  });

  test("keeps a last-hour create visible on the hourEnd line", () => {
    expect(calendarVisibleHourBand(19 * 60, 20 * 60, 7, 19)).toEqual({
      startMinutes: 19 * 60 - 15,
      endMinutes: 19 * 60,
    });
  });
});
