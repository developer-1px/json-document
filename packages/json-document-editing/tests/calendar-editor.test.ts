import { describe, expect, test } from "vitest";
import {
  calendarTimedLayout,
  createCalendarEditor,
  type CalendarDocument,
} from "../src/index.js";

const initial: CalendarDocument = {
  events: [
    { id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false },
    { id: "review", title: "Review", start: "2026-08-03T14:00", end: "2026-08-03T15:00", allDay: false },
  ],
};

describe("calendar editor", () => {
  test("creates a week-grid interval, moves it, resizes it, and restores with undo", () => {
    const editor = createCalendarEditor(initial, { createId: () => "draft" });
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:00",
      title: "Write",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toEqual({
      id: "draft",
      title: "Write",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:00",
      allDay: false,
    });

    expect(editor.dispatch({ type: "event.move", eventId: "draft", start: "2026-08-03T13:00" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-03T13:00",
      end: "2026-08-03T14:00",
    });

    expect(editor.dispatch({
      type: "event.resize",
      eventId: "draft",
      edge: "end",
      instant: "2026-08-03T14:30",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)?.end).toBe("2026-08-03T14:30");

    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)?.end).toBe("2026-08-03T14:00");
    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
    expect(editor.snapshot.selection.keys).toEqual(["standup"]);
  });

  test("moves an event by day without changing its duration or time of day", () => {
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch({ type: "event.move-day", eventId: "review", day: "2026-08-05" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[1]).toMatchObject({
      start: "2026-08-05T14:00",
      end: "2026-08-05T15:00",
    });
    expect(editor.snapshot.selection.keys).toEqual(["review"]);
  });

  test("deletes the selection and restores it selected", () => {
    const editor = createCalendarEditor(initial);
    editor.dispatch({ type: "selection.set", eventIds: ["standup"] });
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.map((event) => event.id)).toEqual(["review"]);
    expect(editor.snapshot.selection.primaryKey).toBe("review");
    expect(editor.undo().ok).toBe(true);
    expect(editor.selectedEvents.map((event) => event.id)).toEqual(["standup"]);
  });

  test("creates a 90-minute span, moves it with duration kept, and resizes each edge", () => {
    const editor = createCalendarEditor(initial, { createId: () => "span" });
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:30",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:30",
    });

    expect(editor.dispatch({ type: "event.move", eventId: "span", start: "2026-08-03T13:00" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-03T13:00",
      end: "2026-08-03T14:30",
    });

    expect(editor.dispatch({
      type: "event.resize",
      eventId: "span",
      edge: "start",
      instant: "2026-08-03T12:30",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)?.start).toBe("2026-08-03T12:30");
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)?.end).toBe("2026-08-03T14:30");

    expect(editor.dispatch({
      type: "event.resize",
      eventId: "span",
      edge: "end",
      instant: "2026-08-03T15:00",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)?.end).toBe("2026-08-03T15:00");
    expect(editor.snapshot.selection.keys).toEqual(["span"]);
  });

  test("creates an all-day event, moves it by day, and keeps it all-day", () => {
    const editor = createCalendarEditor(initial, { createId: () => "holiday" });
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
      title: "Holiday",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toEqual({
      id: "holiday",
      title: "Holiday",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
    });

    expect(editor.dispatch({ type: "event.move-day", eventId: "holiday", day: "2026-08-05" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-05",
      end: "2026-08-06",
      allDay: true,
    });

    expect(editor.dispatch({
      type: "event.resize",
      eventId: "holiday",
      edge: "end",
      instant: "2026-08-08",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-05",
      end: "2026-08-08",
      allDay: true,
    });

    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
    });
  });

  test("timed layout occupies the start/end span, not a single hour cell", () => {
    const layout = calendarTimedLayout([
      { id: "span", title: "Write", start: "2026-08-03T10:00", end: "2026-08-03T11:30", allDay: false },
      { id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-04", allDay: true },
    ], "2026-08-03");
    expect(layout).toEqual([
      {
        event: { id: "span", title: "Write", start: "2026-08-03T10:00", end: "2026-08-03T11:30", allDay: false },
        startMinutes: 600,
        endMinutes: 690,
        lane: 0,
        laneCount: 1,
      },
    ]);
  });

  test("places overlapping timed events in parallel lanes", () => {
    const layout = calendarTimedLayout([
      { id: "first", title: "First", start: "2026-08-03T09:00", end: "2026-08-03T10:30", allDay: false },
      { id: "second", title: "Second", start: "2026-08-03T10:00", end: "2026-08-03T11:00", allDay: false },
      { id: "third", title: "Third", start: "2026-08-03T11:00", end: "2026-08-03T11:30", allDay: false },
    ], "2026-08-03");
    expect(layout.map(({ event, lane, laneCount }) => ({ id: event.id, lane, laneCount }))).toEqual([
      { id: "first", lane: 0, laneCount: 2 },
      { id: "second", lane: 1, laneCount: 2 },
      { id: "third", lane: 0, laneCount: 1 },
    ]);
  });

  test("rejects inverted intervals and unknown events", () => {
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03T11:00",
      end: "2026-08-03T10:00",
    }).ok).toBe(false);
    expect(editor.dispatch({
      type: "event.resize",
      eventId: "standup",
      edge: "end",
      instant: "2026-08-03T08:00",
    }).ok).toBe(false);
    expect(editor.dispatch({ type: "event.move", eventId: "missing", start: "2026-08-03T12:00" }).ok).toBe(false);
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-02-30T10:00",
      end: "2026-02-30T11:00",
    }).ok).toBe(false);
  });
});
