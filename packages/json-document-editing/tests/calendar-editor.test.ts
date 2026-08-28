import { describe, expect, test } from "vitest";
import {
  calendarAllDayLayout,
  calendarBusyDates,
  calendarMonthDayLayout,
  calendarMonthWeekLayout,
  calendarNowMarker,
  calendarTimedLayout,
  calendarVisibleEvents,
  createCalendarEditor,
  projectCalendarOccurrences,
  type CalendarDocument,
  type CalendarEvent,
} from "../src/index.js";

function event(fields: {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly allDay?: boolean;
  readonly calendarId?: string;
  readonly recurrence?: CalendarEvent["recurrence"];
  readonly excludeDates?: CalendarEvent["excludeDates"];
}): CalendarEvent {
  return {
    id: fields.id,
    title: fields.title,
    start: fields.start,
    end: fields.end,
    allDay: fields.allDay === true,
    calendarId: fields.calendarId ?? "home",
    recurrence: fields.recurrence ?? null,
    excludeDates: fields.excludeDates ?? [],
  };
}

const initial: CalendarDocument = {
  calendars: [
    { id: "home", title: "Home", hidden: false, color: "subtle" },
    { id: "work", title: "Work", hidden: false, color: "accent" },
  ],
  events: [
    event({ id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false }),
    event({ id: "review", title: "Review", start: "2026-08-03T14:00", end: "2026-08-03T15:00", allDay: false }),
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
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toEqual(event({
      id: "draft",
      title: "Write",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:00",
      allDay: false,
    }));

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
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toEqual(event({
      id: "holiday",
      title: "Holiday",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
    }));

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
      event({ id: "span", title: "Write", start: "2026-08-03T10:00", end: "2026-08-03T11:30", allDay: false }),
      event({ id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-04", allDay: true }),
    ], "2026-08-03");
    expect(layout).toEqual([
      {
        event: event({ id: "span", title: "Write", start: "2026-08-03T10:00", end: "2026-08-03T11:30", allDay: false }),
        startMinutes: 600,
        endMinutes: 690,
        lane: 0,
        laneCount: 1,
      },
    ]);
  });

  test("lays out a multi-day timed event as that day's midnight-to-midnight minutes", () => {
    const layout = calendarTimedLayout([
      event({
        id: "span",
        title: "Write",
        start: "2026-08-03T10:00",
        end: "2026-08-06T15:30",
        allDay: false,
      }),
    ], "2026-08-04");
    expect(layout.map((item) => ({
      startMinutes: item.startMinutes,
      endMinutes: item.endMinutes,
    }))).toEqual([{ startMinutes: 0, endMinutes: 1440 }]);
  });

  test("places overlapping timed events in parallel lanes", () => {
    const layout = calendarTimedLayout([
      event({ id: "first", title: "First", start: "2026-08-03T09:00", end: "2026-08-03T10:30", allDay: false }),
      event({ id: "second", title: "Second", start: "2026-08-03T10:00", end: "2026-08-03T11:00", allDay: false }),
      event({ id: "third", title: "Third", start: "2026-08-03T11:00", end: "2026-08-03T11:30", allDay: false }),
    ], "2026-08-03");
    expect(layout.map(({ event, lane, laneCount }) => ({ id: event.id, lane, laneCount }))).toEqual([
      { id: "first", lane: 0, laneCount: 2 },
      { id: "second", lane: 1, laneCount: 2 },
      { id: "third", lane: 0, laneCount: 1 },
    ]);
  });

  test("marks now on that day only", () => {
    expect(calendarNowMarker("2026-08-03T09:15", "2026-08-03")).toEqual({ minutes: 555 });
    expect(calendarNowMarker("2026-08-03T09:15", "2026-08-04")).toBeNull();
  });

  test("lays out each all-day occurrence instead of spanning the series", () => {
    const series = event({
      id: "holiday",
      title: "Holiday",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"];
    expect(calendarAllDayLayout([series], days).map((item) => ({
      id: item.event.id,
      start: item.event.start,
      startIndex: item.startIndex,
      span: item.span,
    }))).toEqual([
      { id: "holiday", start: "2026-08-03", startIndex: 0, span: 1 },
      { id: "holiday", start: "2026-08-04", startIndex: 1, span: 1 },
      { id: "holiday", start: "2026-08-05", startIndex: 2, span: 1 },
    ]);
  });

  test("monthly recurrence on the 31st stays on the last day of shorter months", () => {
    const series = event({
      id: "month-end",
      title: "Month-end",
      start: "2026-05-31T18:00",
      end: "2026-05-31T18:30",
      recurrence: { freq: "monthly", interval: 1, until: "2026-08-31" },
    });
    expect(projectCalendarOccurrences([series], "2026-05-01", "2026-09-01").map((item) => item.start)).toEqual([
      "2026-05-31T18:00",
      "2026-06-30T18:00",
      "2026-07-31T18:00",
      "2026-08-31T18:00",
    ]);
  });

  test("daily recurrence crosses leap day and keeps local clock time", () => {
    const series = event({
      id: "leap-daily",
      title: "Leap daily",
      start: "2028-02-28T23:30",
      end: "2028-02-29T00:15",
      recurrence: { freq: "daily", interval: 1, until: "2028-03-01" },
    });
    expect(projectCalendarOccurrences([series], "2028-02-28", "2028-03-02").map((item) => ({
      start: item.start,
      end: item.end,
    }))).toEqual([
      { start: "2028-02-28T23:30", end: "2028-02-29T00:15" },
      { start: "2028-02-29T23:30", end: "2028-03-01T00:15" },
      { start: "2028-03-01T23:30", end: "2028-03-02T00:15" },
    ]);
  });

  test("moves all-day and timed events across leap day with their spans intact", () => {
    const document: CalendarDocument = {
      calendars: initial.calendars,
      events: [
        event({ id: "trip", title: "Trip", start: "2028-02-28", end: "2028-03-01", allDay: true }),
        event({ id: "night", title: "Night", start: "2028-02-28T23:30", end: "2028-02-29T00:30" }),
      ],
    };
    const editor = createCalendarEditor(document);
    expect(editor.dispatch({ type: "event.move-day", eventId: "trip", day: "2028-03-01" }).ok).toBe(true);
    expect(editor.dispatch({ type: "event.move-day", eventId: "night", day: "2028-03-01" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events).toMatchObject([
      { start: "2028-03-01", end: "2028-03-03" },
      { start: "2028-03-01T23:30", end: "2028-03-02T00:30" },
    ]);
  });

  test("places overlapping all-day events on separate lanes", () => {
    const days = ["2026-08-03", "2026-08-04", "2026-08-05"];
    const layout = calendarAllDayLayout([
      event({ id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-04", allDay: true }),
      event({ id: "travel", title: "Travel", start: "2026-08-03", end: "2026-08-05", allDay: true }),
    ], days);
    expect(layout.map((item) => ({
      id: item.event.id,
      startIndex: item.startIndex,
      span: item.span,
      lane: item.lane,
      laneCount: item.laneCount,
    }))).toEqual([
      { id: "travel", startIndex: 0, span: 2, lane: 0, laneCount: 2 },
      { id: "holiday", startIndex: 0, span: 1, lane: 1, laneCount: 2 },
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

  test("names a created event and updates title, time, and all-day", () => {
    const editor = createCalendarEditor(initial, { createId: () => "named" });
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:30",
    }).ok).toBe(true);
    expect(editor.dispatch({ type: "event.update", eventId: "named", title: "Write brief" }).ok).toBe(true);
    expect(editor.dispatch({
      type: "event.update",
      eventId: "named",
      start: "2026-08-03T11:00",
      end: "2026-08-03T12:00",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      title: "Write brief",
      start: "2026-08-03T11:00",
      end: "2026-08-03T12:00",
      allDay: false,
    });
    expect(editor.dispatch({ type: "event.update", eventId: "named", allDay: true }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
    });
    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)?.title).toBe("Event");
  });

  test("updating only start keeps duration for timed and all-day events", () => {
    const editor = createCalendarEditor(initial, { createId: () => "holiday" });
    expect(editor.dispatch({
      type: "event.update",
      eventId: "standup",
      start: "2026-08-04T11:00",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-04T11:00",
      end: "2026-08-04T11:30",
    });

    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
      title: "Holiday",
    }).ok).toBe(true);
    expect(editor.dispatch({ type: "event.update", eventId: "holiday", start: "2026-08-06" }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-06",
      end: "2026-08-07",
      allDay: true,
    });
  });

  test("expands a weekly event and edits this, following, and all", () => {
    let sequence = 0;
    const editor = createCalendarEditor(initial, { createId: () => `split-${++sequence}` });
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      title: "Standup series",
      recurrence: { freq: "weekly", interval: 1, until: "" },
    }).ok).toBe(true);
    const occurrences = projectCalendarOccurrences(
      [(editor.snapshot.value as CalendarDocument).events.at(-1)!],
      "2026-08-03",
      "2026-08-25",
    );
    expect(occurrences.map((item) => item.start)).toEqual([
      "2026-08-03T09:00",
      "2026-08-10T09:00",
      "2026-08-17T09:00",
      "2026-08-24T09:00",
    ]);

    expect(editor.dispatch({
      type: "occurrence.edit",
      eventId: "split-1",
      occurrenceStart: "2026-08-10T09:00",
      scope: "this",
      title: "Skip-week standup",
    }).ok).toBe(true);
    const afterThis = editor.snapshot.value as CalendarDocument;
    expect(afterThis.events.find((item) => item.id === "split-1")?.excludeDates).toEqual(["2026-08-10"]);
    expect(afterThis.events.at(-1)).toMatchObject({
      title: "Skip-week standup",
      start: "2026-08-10T09:00",
      end: "2026-08-10T09:30",
      recurrence: null,
    });
    expect(calendarTimedLayout(calendarVisibleEvents(afterThis), "2026-08-10").map((item) => ({
      id: item.event.id,
      start: item.event.start,
      end: item.event.end,
    }))).toEqual([{ id: "split-2", start: "2026-08-10T09:00", end: "2026-08-10T09:30" }]);

    let following = 0;
    const series = createCalendarEditor(initial, { createId: () => `series-${++following}` });
    series.dispatch({
      type: "event.create",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      title: "Standup series",
      recurrence: { freq: "weekly", interval: 1, until: "" },
    });
    expect(series.dispatch({
      type: "occurrence.edit",
      eventId: "series-1",
      occurrenceStart: "2026-08-10T09:00",
      scope: "this-and-following",
      title: "Later standup",
    }).ok).toBe(true);
    const afterFollowing = series.snapshot.value as CalendarDocument;
    expect(afterFollowing.events.find((item) => item.id === "series-1")?.recurrence).toMatchObject({ until: "2026-08-09" });
    expect(afterFollowing.events.at(-1)).toMatchObject({
      title: "Later standup",
      start: "2026-08-10T09:00",
      end: "2026-08-10T09:30",
    });
    expect(projectCalendarOccurrences(
      calendarVisibleEvents(afterFollowing),
      "2026-08-10",
      "2026-08-25",
    ).map((item) => ({ id: item.event.id, start: item.start, end: item.end }))).toEqual([
      { id: "series-2", start: "2026-08-10T09:00", end: "2026-08-10T09:30" },
      { id: "series-2", start: "2026-08-17T09:00", end: "2026-08-17T09:30" },
      { id: "series-2", start: "2026-08-24T09:00", end: "2026-08-24T09:30" },
    ]);

    const all = createCalendarEditor(initial, { createId: () => "all" });
    all.dispatch({
      type: "event.create",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      title: "Standup series",
      recurrence: { freq: "weekly", interval: 1, until: "" },
    });
    expect(all.dispatch({
      type: "occurrence.edit",
      eventId: "all",
      occurrenceStart: "2026-08-10T09:00",
      scope: "all",
      title: "Team standup",
    }).ok).toBe(true);
    expect((all.snapshot.value as CalendarDocument).events.at(-1)?.title).toBe("Team standup");
    expect(all.undo().ok).toBe(true);
    expect((all.snapshot.value as CalendarDocument).events.at(-1)?.title).toBe("Standup series");
  });

  test("this-scope remove excludes that occurrence without deleting the series", () => {
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
      events: [
        event({
          id: "standup",
          title: "Standup",
          start: "2026-08-03T09:00",
          end: "2026-08-03T09:30",
          recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
        }),
      ],
    });
    expect(editor.dispatch({
      type: "occurrence.remove",
      eventId: "standup",
      occurrenceStart: "2026-08-04T09:00",
      scope: "this",
    }).ok).toBe(true);
    const document = editor.snapshot.value as CalendarDocument;
    expect(document.events).toHaveLength(1);
    expect(document.events[0]?.excludeDates).toEqual(["2026-08-04"]);
    expect(projectCalendarOccurrences(document.events, "2026-08-03", "2026-08-06").map((item) => item.start)).toEqual([
      "2026-08-03T09:00",
      "2026-08-05T09:00",
    ]);
  });

  test("all-scope start edit from a later occurrence shifts the series by the same delta", () => {
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
      events: [
        event({
          id: "standup",
          title: "Standup",
          start: "2026-08-03T09:00",
          end: "2026-08-03T09:30",
          recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
        }),
      ],
    });
    expect(editor.dispatch({
      type: "occurrence.edit",
      eventId: "standup",
      occurrenceStart: "2026-08-04T09:00",
      scope: "all",
      start: "2026-08-04T11:00",
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-03T11:00",
      end: "2026-08-03T11:30",
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
  });

  test("opens a document that omits calendars", () => {
    const editor = createCalendarEditor({
      events: [
        { id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false },
      ],
    } as unknown as CalendarDocument);
    expect(calendarVisibleEvents(editor.snapshot.value as CalendarDocument).map((item) => item.id)).toEqual(["standup"]);
    expect(editor.dispatch({
      type: "event.create",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:00",
      title: "Write",
    }).ok).toBe(true);
  });

  test("hides a calendar's events without deleting them", () => {
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch({ type: "event.update", eventId: "review", calendarId: "work" }).ok).toBe(true);
    expect(calendarVisibleEvents(editor.snapshot.value as CalendarDocument).map((item) => item.id)).toEqual([
      "standup",
      "review",
    ]);
    expect(editor.dispatch({ type: "calendar.set-hidden", calendarId: "work", hidden: true }).ok).toBe(true);
    expect(calendarVisibleEvents(editor.snapshot.value as CalendarDocument).map((item) => item.id)).toEqual(["standup"]);
    expect((editor.snapshot.value as CalendarDocument).events.map((item) => item.id)).toEqual(["standup", "review"]);
    expect(editor.dispatch({ type: "calendar.set-hidden", calendarId: "work", hidden: false }).ok).toBe(true);
    expect(calendarVisibleEvents(editor.snapshot.value as CalendarDocument).map((item) => item.id)).toEqual([
      "standup",
      "review",
    ]);
  });

  test("keeps each calendar's color token when hiding it", () => {
    const editor = createCalendarEditor(initial);
    expect((editor.snapshot.value as CalendarDocument).calendars.map((item) => [item.id, item.color])).toEqual([
      ["home", "subtle"],
      ["work", "accent"],
    ]);
    expect(editor.dispatch({ type: "calendar.set-hidden", calendarId: "work", hidden: true }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).calendars.find((item) => item.id === "work")).toMatchObject({
      hidden: true,
      color: "accent",
    });
  });

  test("month day layout puts all-day events first and keeps overflow off the last row", () => {
    const events = [
      event({ id: "late", title: "Late", start: "2026-08-03T16:00", end: "2026-08-03T17:00" }),
      event({ id: "early", title: "Early", start: "2026-08-03T09:00", end: "2026-08-03T09:30" }),
      event({
        id: "holiday",
        title: "Holiday",
        start: "2026-08-03",
        end: "2026-08-04",
        allDay: true,
      }),
      event({ id: "noon", title: "Noon", start: "2026-08-03T12:00", end: "2026-08-03T13:00" }),
    ];
    expect(calendarMonthDayLayout(events, "2026-08-03", 3).events.map((item) => item.id)).toEqual([
      "holiday",
      "early",
    ]);
    expect(calendarMonthDayLayout(events, "2026-08-03", 3).hiddenCount).toBe(2);
    expect(calendarMonthDayLayout(events, "2026-08-03", 4).hiddenCount).toBe(0);
    expect(calendarMonthDayLayout(events, "2026-08-03", 4).events.map((item) => item.id)).toEqual([
      "holiday",
      "early",
      "noon",
      "late",
    ]);
  });

  test("month week layout keeps a later all-day event from blocking earlier days' lanes", () => {
    const days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];
    const layout = calendarMonthWeekLayout([
      event({ id: "monday", title: "Monday", start: "2026-08-03T09:00", end: "2026-08-03T09:30" }),
      event({ id: "sunday", title: "Sunday", start: "2026-08-09", end: "2026-08-10", allDay: true }),
    ], days, 3);
    expect(layout.items.map((item) => ({
      id: item.event.id,
      startIndex: item.startIndex,
      lane: item.lane,
    }))).toEqual([
      { id: "monday", startIndex: 0, lane: 0 },
      { id: "sunday", startIndex: 6, lane: 0 },
    ]);
    expect(layout.hiddenCounts).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test("month week layout spans an all-day event across days and stacks timed events below", () => {
    const days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];
    const layout = calendarMonthWeekLayout([
      event({ id: "travel", title: "Travel", start: "2026-08-04", end: "2026-08-07", allDay: true }),
      event({ id: "standup", title: "Standup", start: "2026-08-04T09:00", end: "2026-08-04T09:30" }),
    ], days, 3);
    expect(layout.items.map((item) => ({
      id: item.event.id,
      startIndex: item.startIndex,
      span: item.span,
      lane: item.lane,
    }))).toEqual([
      { id: "travel", startIndex: 1, span: 3, lane: 0 },
      { id: "standup", startIndex: 1, span: 1, lane: 1 },
    ]);
    expect(layout.laneCount).toBe(2);
    expect(layout.hiddenCounts).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test("resizing an all-day event across a week boundary yields two clipped pieces", () => {
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
      events: [
        event({ id: "travel", title: "Travel", start: "2026-08-07", end: "2026-08-09", allDay: true }),
      ],
    });
    expect(editor.dispatch({
      type: "event.resize",
      eventId: "travel",
      edge: "end",
      instant: "2026-08-11",
    }).ok).toBe(true);
    const events = (editor.snapshot.value as CalendarDocument).events;
    expect(events[0]).toMatchObject({ start: "2026-08-07", end: "2026-08-11", allDay: true });
    const first = calendarMonthWeekLayout(
      events,
      ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"],
      3,
    );
    const second = calendarMonthWeekLayout(
      events,
      ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"],
      3,
    );
    expect(first.items).toEqual([expect.objectContaining({ startIndex: 4, span: 3, lane: 0 })]);
    expect(second.items).toEqual([expect.objectContaining({ startIndex: 0, span: 1, lane: 0 })]);
  });

  test("month week layout clips a multi-day bar at the week boundary", () => {
    const eventSpan = event({
      id: "travel",
      title: "Travel",
      start: "2026-08-07",
      end: "2026-08-11",
      allDay: true,
    });
    const first = calendarMonthWeekLayout(
      [eventSpan],
      ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"],
      3,
    );
    const second = calendarMonthWeekLayout(
      [eventSpan],
      ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"],
      3,
    );
    expect(first.items).toEqual([expect.objectContaining({ startIndex: 4, span: 3, lane: 0 })]);
    expect(second.items).toEqual([expect.objectContaining({ startIndex: 0, span: 1, lane: 0 })]);
  });

  test("month week layout keeps overflow off the last row", () => {
    const days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];
    const layout = calendarMonthWeekLayout([
      event({ id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-04", allDay: true }),
      event({ id: "early", title: "Early", start: "2026-08-03T09:00", end: "2026-08-03T09:30" }),
      event({ id: "noon", title: "Noon", start: "2026-08-03T12:00", end: "2026-08-03T13:00" }),
      event({ id: "late", title: "Late", start: "2026-08-03T16:00", end: "2026-08-03T17:00" }),
    ], days, 3);
    expect(layout.items.map((item) => item.event.id)).toEqual(["holiday", "early"]);
    expect(layout.laneCount).toBe(2);
    expect(layout.hiddenCounts[0]).toBe(2);
  });

  test("busy dates mark every civil day an occurrence occupies", () => {
    const events = [
      event({ id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30" }),
      event({
        id: "offsite",
        title: "Offsite",
        start: "2026-08-04",
        end: "2026-08-06",
        allDay: true,
      }),
      event({ id: "overnight", title: "Overnight", start: "2026-08-06T22:00", end: "2026-08-07T02:00" }),
    ];
    expect([...calendarBusyDates(events, "2026-08-03", "2026-08-08")].sort()).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });
});
