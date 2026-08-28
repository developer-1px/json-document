import { describe, expect, test } from "vitest";
import {
  calendarOccurrenceAfterIntent,
  calendarOccurrenceForInspector,
  calendarOccurrenceFromSelection,
  calendarUpdateIntent,
  calendarVisibleHourBand,
} from "../src/index.js";

const origin = { start: "2026-05-25T09:00", end: "2026-05-25T09:30" };

describe("calendar occurrence selection projection", () => {
  test("follows create, move, and resize results", () => {
    expect(calendarOccurrenceAfterIntent(
      { type: "event.create", start: "2026-05-25T10:00", end: "2026-05-25T11:30" },
      { start: null, end: null },
      null,
    )).toEqual({ start: "2026-05-25T10:00", end: "2026-05-25T11:30" });
    expect(calendarOccurrenceAfterIntent(
      { type: "event.move", eventId: "standup", start: "2026-05-25T11:00" },
      origin,
      { start: "2026-05-25T11:00", end: "2026-05-25T11:30" },
    )).toEqual({ start: "2026-05-25T11:00", end: "2026-05-25T11:30" });
    expect(calendarOccurrenceAfterIntent(
      { type: "event.resize", eventId: "standup", edge: "end", instant: "2026-05-25T10:00" },
      origin,
      origin,
    )).toEqual({ start: "2026-05-25T09:00", end: "2026-05-25T10:00" });
  });

  test("projects selected and recurring occurrence intervals for an inspector", () => {
    expect(calendarOccurrenceFromSelection(null)).toEqual({ start: null, end: null });
    expect(calendarOccurrenceFromSelection(origin)).toEqual(origin);
    expect(calendarOccurrenceForInspector(
      {
        ...origin,
        recurrence: { freq: "daily", interval: 1, until: "2026-05-29" },
      },
      { start: "2026-05-26T09:00", end: "2026-05-26T09:30" },
    )).toEqual({ start: "2026-05-26T09:00", end: "2026-05-26T09:30" });
  });

  test("clips an event to the visible hour band", () => {
    expect(calendarVisibleHourBand(0, 1440, 7, 19)).toEqual({ startMinutes: 420, endMinutes: 1140 });
    expect(calendarVisibleHourBand(19 * 60, 20 * 60, 7, 19)).toEqual({
      startMinutes: 19 * 60 - 15,
      endMinutes: 19 * 60,
    });
  });

  test("plans occurrence edits without making the consumer repeat series rules", () => {
    const event = {
      id: "daily",
      title: "Daily",
      start: origin.start!,
      end: origin.end!,
      allDay: false,
      calendarId: "work",
      recurrence: { freq: "daily" as const, interval: 1, until: "2026-05-29" },
      excludeDates: [],
    };
    expect(calendarUpdateIntent(event, "2026-05-26T09:00", "this", { title: "Changed" })).toMatchObject({
      type: "occurrence.edit",
      eventId: "daily",
      occurrenceStart: "2026-05-26T09:00",
      scope: "this",
      title: "Changed",
    });
    expect(calendarUpdateIntent(event, "2026-05-26T09:00", "this", { calendarId: "home" })).toMatchObject({
      type: "event.update",
      eventId: "daily",
      calendarId: "home",
    });
  });
});
