import { describe, expect, test } from "vitest";
import {
  bindCalendarAllDayIntent,
  bindCalendarTimeGridIntent,
  createCalendarEditor,
  interpretCalendarAllDayPointer,
  interpretCalendarTimeGridPointer,
  previewCalendarAllDay,
  previewCalendarTimeGrid,
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
  calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
  events: [
    event({ id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false }),
    event({ id: "review", title: "Review", start: "2026-08-03T14:00", end: "2026-08-03T15:00", allDay: false }),
    event({ id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-04", allDay: true }),
  ],
};

describe("interpretCalendarTimeGridPointer", () => {
  test("empty time-span drag creates that start and end", () => {
    const editor = createCalendarEditor(initial, { createId: () => "span" });
    const intent = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-03T11:30",
    });
    expect(intent).toEqual({
      type: "event.create",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:30",
    });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.at(-1)).toMatchObject({
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:30",
    });
  });

  test("empty drag across days creates a same-day span on the target day", () => {
    expect(interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-06T15:30",
    })).toEqual({
      type: "event.create",
      start: "2026-08-06T10:00",
      end: "2026-08-06T15:30",
    });
  });

  test("empty click clears selection instead of creating", () => {
    const editor = createCalendarEditor(initial);
    expect(editor.selectedEvents[0]?.id).toBe("standup");
    const intent = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-04T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-04T10:00",
    });
    expect(intent).toEqual({ type: "selection.clear" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect(editor.snapshot.selection.primaryIndex).toBeNull();
    expect((editor.snapshot.value as CalendarDocument).events).toHaveLength(initial.events.length);
  });

  test("occupied press on the same instant selects the origin event", () => {
    expect(interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T14:00",
      originEventId: "review",
      originEventStart: "2026-08-03T14:00",
      originHandle: "body",
      targetInstant: "2026-08-03T14:00",
    })).toBeNull();
  });

  test("body drag moves the origin event and keeps duration", () => {
    const editor = createCalendarEditor(initial);
    const intent = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T09:15",
      originEventId: "standup",
      originEventStart: "2026-08-03T09:00",
      originHandle: "body",
      targetInstant: "2026-08-03T11:15",
    });
    expect(intent).toEqual({ type: "event.move", eventId: "standup", start: "2026-08-03T11:00" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-03T11:00",
      end: "2026-08-03T11:30",
    });
  });

  test("edge drag resizes only that edge", () => {
    const start = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-03T09:00",
      originHandle: "start",
      targetInstant: "2026-08-03T08:30",
    });
    expect(start).toEqual({
      type: "event.resize",
      eventId: "standup",
      edge: "start",
      instant: "2026-08-03T08:30",
    });
    const end = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T09:30",
      originEventId: "standup",
      originEventStart: "2026-08-03T09:00",
      originHandle: "end",
      targetInstant: "2026-08-03T10:00",
    });
    expect(end).toEqual({
      type: "event.resize",
      eventId: "standup",
      edge: "end",
      instant: "2026-08-03T10:00",
    });
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch(start!).ok).toBe(true);
    expect(editor.dispatch(end!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-03T08:30",
      end: "2026-08-03T10:00",
    });
  });
});

describe("previewCalendarTimeGrid", () => {
  test("body drag preview keeps duration then commit matches", () => {
    const release = {
      originInstant: "2026-08-03T09:15",
      originEventId: "standup",
      originEventStart: "2026-08-03T09:00",
      originHandle: "body" as const,
      targetInstant: "2026-08-03T11:15",
    };
    const preview = previewCalendarTimeGrid(initial.events, release);
    expect(preview.find((item) => item.id === "standup")).toMatchObject({
      start: "2026-08-03T11:00",
      end: "2026-08-03T11:30",
    });
    expect(initial.events[0]?.start).toBe("2026-08-03T09:00");
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch(interpretCalendarTimeGridPointer(release)!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-03T11:00",
      end: "2026-08-03T11:30",
    });
  });

  test("start and end edge preview change only that edge", () => {
    const startRelease = {
      originInstant: "2026-08-03T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-03T09:00",
      originHandle: "start" as const,
      targetInstant: "2026-08-03T08:30",
    };
    expect(previewCalendarTimeGrid(initial.events, startRelease).find((item) => item.id === "standup")).toMatchObject({
      start: "2026-08-03T08:30",
      end: "2026-08-03T09:30",
    });
    const endRelease = {
      originInstant: "2026-08-03T09:30",
      originEventId: "standup",
      originEventStart: "2026-08-03T09:00",
      originHandle: "end" as const,
      targetInstant: "2026-08-03T10:00",
    };
    expect(previewCalendarTimeGrid(initial.events, endRelease).find((item) => item.id === "standup")).toMatchObject({
      start: "2026-08-03T09:00",
      end: "2026-08-03T10:00",
    });
  });

  test("empty click preview does not paint a ghost", () => {
    expect(previewCalendarTimeGrid(initial.events, {
      originInstant: "2026-08-04T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-04T10:00",
    })).toEqual(initial.events);
  });

  test("empty span preview yields that start and end", () => {
    const preview = previewCalendarTimeGrid(initial.events, {
      originInstant: "2026-08-03T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-03T11:30",
    });
    expect(preview.at(-1)).toMatchObject({
      id: "preview",
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:30",
    });
  });

  test("empty drag across days previews a same-day ghost on the target day", () => {
    const preview = previewCalendarTimeGrid(initial.events, {
      originInstant: "2026-08-03T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-06T15:30",
    });
    expect(preview.at(-1)).toMatchObject({
      id: "preview",
      start: "2026-08-06T10:00",
      end: "2026-08-06T15:30",
    });
  });

  test("recurring body drag previews only that occurrence", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      allDay: false,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const preview = previewCalendarTimeGrid([series], {
      originInstant: "2026-08-04T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      originHandle: "body",
      targetInstant: "2026-08-04T11:00",
    });
    expect(preview.find((item) => item.id === "standup")?.excludeDates).toEqual(["2026-08-04"]);
    expect(preview.find((item) => item.id === "preview")).toMatchObject({
      start: "2026-08-04T11:00",
      end: "2026-08-04T11:30",
      recurrence: null,
    });
  });

  test("all-scope later occurrence drag previews the series shift", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      allDay: false,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const preview = previewCalendarTimeGrid([series], {
      originInstant: "2026-08-04T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      originHandle: "body",
      targetInstant: "2026-08-04T11:00",
    }, "all");
    expect(preview.find((item) => item.id === "standup")).toMatchObject({
      start: "2026-08-03T11:00",
      end: "2026-08-03T11:30",
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    expect(preview.find((item) => item.id === "preview")).toBeUndefined();
  });

  test("following-scope later occurrence drag previews a split series", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      allDay: false,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const preview = previewCalendarTimeGrid([series], {
      originInstant: "2026-08-04T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      originHandle: "body",
      targetInstant: "2026-08-04T11:00",
    }, "this-and-following");
    expect(preview.find((item) => item.id === "standup")?.recurrence).toMatchObject({ until: "2026-08-03" });
    expect(preview.find((item) => item.id === "preview")).toMatchObject({
      start: "2026-08-04T11:00",
      end: "2026-08-04T11:30",
      recurrence: { freq: "daily", interval: 1, until: "" },
    });
  });
});

describe("previewCalendarAllDay", () => {
  test("empty span drag previews that all-day range", () => {
    const preview = previewCalendarAllDay(initial.events, {
      originDay: "2026-08-03",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetDay: "2026-08-05",
    });
    expect(preview.at(-1)).toMatchObject({
      id: "preview",
      start: "2026-08-03",
      end: "2026-08-06",
      allDay: true,
    });
  });

  test("body drag preview keeps duration then commit matches", () => {
    const release = {
      originDay: "2026-08-03",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      originHandle: "body" as const,
      targetDay: "2026-08-06",
    };
    expect(previewCalendarAllDay(initial.events, release).find((item) => item.id === "holiday")).toMatchObject({
      start: "2026-08-06",
      end: "2026-08-07",
      allDay: true,
    });
    expect(initial.events[2]?.start).toBe("2026-08-03");
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch(interpretCalendarAllDayPointer(release)!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[2]).toMatchObject({
      start: "2026-08-06",
      end: "2026-08-07",
      allDay: true,
    });
  });

  test("end edge preview changes only that exclusive end", () => {
    const release = {
      originDay: "2026-08-03",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      originHandle: "end" as const,
      targetDay: "2026-08-05",
    };
    expect(previewCalendarAllDay(initial.events, release).find((item) => item.id === "holiday")).toMatchObject({
      start: "2026-08-03",
      end: "2026-08-06",
      allDay: true,
    });
  });
});

describe("bindCalendarTimeGridIntent", () => {
  test("turns a recurring move into this-occurrence edit", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      allDay: false,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const move = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-04T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      originHandle: "body",
      targetInstant: "2026-08-04T11:00",
    });
    const intent = bindCalendarTimeGridIntent(move, series, "2026-08-04T09:00", "this");
    expect(intent).toEqual({
      type: "occurrence.edit",
      eventId: "standup",
      occurrenceStart: "2026-08-04T09:00",
      scope: "this",
      start: "2026-08-04T11:00",
    });
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
      events: [series],
    }, { createId: () => "split" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    const document = editor.snapshot.value as CalendarDocument;
    expect(document.events.find((item) => item.id === "standup")?.excludeDates).toEqual(["2026-08-04"]);
    expect(document.events.at(-1)).toMatchObject({
      id: "split",
      start: "2026-08-04T11:00",
      end: "2026-08-04T11:30",
      recurrence: null,
    });
  });

  test("turns a recurring start-edge resize into this-occurrence edit keeping the original end", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      allDay: false,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const resize = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-04T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      originHandle: "start",
      targetInstant: "2026-08-04T08:30",
    });
    const intent = bindCalendarTimeGridIntent(resize, series, "2026-08-04T09:00", "this");
    expect(intent).toEqual({
      type: "occurrence.edit",
      eventId: "standup",
      occurrenceStart: "2026-08-04T09:00",
      scope: "this",
      start: "2026-08-04T08:30",
      end: "2026-08-04T09:30",
    });
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
      events: [series],
    }, { createId: () => "split" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    const document = editor.snapshot.value as CalendarDocument;
    expect(document.events.find((item) => item.id === "standup")?.excludeDates).toEqual(["2026-08-04"]);
    expect(document.events.at(-1)).toMatchObject({
      id: "split",
      start: "2026-08-04T08:30",
      end: "2026-08-04T09:30",
      recurrence: null,
    });
  });

  test("shifts the series by the same delta when a later occurrence is dragged with scope all", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      allDay: false,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const move = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-04T09:00",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      originHandle: "body",
      targetInstant: "2026-08-04T11:00",
    });
    const intent = bindCalendarTimeGridIntent(move, series, "2026-08-04T09:00", "all");
    expect(intent).toEqual({
      type: "event.move",
      eventId: "standup",
      start: "2026-08-03T11:00",
    });
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
      events: [series],
    });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-03T11:00",
      end: "2026-08-03T11:30",
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
  });
});

describe("interpretCalendarAllDayPointer", () => {
  test("empty same-day press clears selection instead of creating", () => {
    expect(interpretCalendarAllDayPointer({
      originDay: "2026-08-10",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetDay: "2026-08-10",
    })).toEqual({ type: "selection.clear" });
  });

  test("empty span drag creates an all-day range", () => {
    expect(interpretCalendarAllDayPointer({
      originDay: "2026-08-03",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetDay: "2026-08-05",
    })).toEqual({
      type: "event.create",
      start: "2026-08-03",
      end: "2026-08-06",
      allDay: true,
    });
  });

  test("occupied same-day press selects the origin event", () => {
    expect(interpretCalendarAllDayPointer({
      originDay: "2026-08-03",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      originHandle: "body",
      targetDay: "2026-08-03",
    })).toBeNull();
  });

  test("body drag move-days the origin all-day event", () => {
    const editor = createCalendarEditor(initial);
    const intent = interpretCalendarAllDayPointer({
      originDay: "2026-08-03",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      originHandle: "body",
      targetDay: "2026-08-06",
    });
    expect(intent).toEqual({ type: "event.move-day", eventId: "holiday", day: "2026-08-06" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[2]).toMatchObject({
      start: "2026-08-06",
      end: "2026-08-07",
      allDay: true,
    });
  });

  test("edge drag resizes only that all-day edge", () => {
    const intent = interpretCalendarAllDayPointer({
      originDay: "2026-08-03",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      originHandle: "end",
      targetDay: "2026-08-05",
    });
    expect(intent).toEqual({
      type: "event.resize",
      eventId: "holiday",
      edge: "end",
      instant: "2026-08-06",
    });
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[2]).toMatchObject({
      start: "2026-08-03",
      end: "2026-08-06",
      allDay: true,
    });
  });

  test("start-edge drag resizes the inclusive start without moving the exclusive end", () => {
    const intent = interpretCalendarAllDayPointer({
      originDay: "2026-08-03",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      originHandle: "start",
      targetDay: "2026-08-02",
    });
    expect(intent).toEqual({
      type: "event.resize",
      eventId: "holiday",
      edge: "start",
      instant: "2026-08-02",
    });
    const editor = createCalendarEditor(initial);
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[2]).toMatchObject({
      start: "2026-08-02",
      end: "2026-08-04",
      allDay: true,
    });
  });

  test("turns a recurring all-day move into this-occurrence edit", () => {
    const series = event({
      id: "holiday",
      title: "Holiday",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const move = interpretCalendarAllDayPointer({
      originDay: "2026-08-04",
      originEventId: "holiday",
      originEventStart: "2026-08-04",
      originHandle: "body",
      targetDay: "2026-08-06",
    });
    expect(move).toEqual({ type: "event.move-day", eventId: "holiday", day: "2026-08-06" });
    const intent = bindCalendarAllDayIntent(move, series, "2026-08-04", "this");
    expect(intent).toEqual({
      type: "occurrence.edit",
      eventId: "holiday",
      occurrenceStart: "2026-08-04",
      scope: "this",
      start: "2026-08-06",
    });
  });
});
