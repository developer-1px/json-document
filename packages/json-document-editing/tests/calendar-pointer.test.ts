import { describe, expect, test } from "vitest";
import {
  createCalendarEditor,
  interpretCalendarAllDayPointer,
  interpretCalendarTimeGridPointer,
  type CalendarDocument,
} from "../src/index.js";

const initial: CalendarDocument = {
  events: [
    { id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false },
    { id: "review", title: "Review", start: "2026-08-03T14:00", end: "2026-08-03T15:00", allDay: false },
    { id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-04", allDay: true },
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

  test("empty click creates a one-hour event even when another event is selected", () => {
    const editor = createCalendarEditor(initial);
    expect(editor.snapshot.selection.primaryKey).toBe("standup");
    const intent = interpretCalendarTimeGridPointer({
      originInstant: "2026-08-04T10:00",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetInstant: "2026-08-04T10:00",
    });
    expect(intent).toEqual({
      type: "event.create",
      start: "2026-08-04T10:00",
      end: "2026-08-04T11:00",
    });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.find((event) => event.id === "standup")).toMatchObject({
      start: "2026-08-03T09:00",
    });
  });

  test("occupied press on the same instant selects the origin event", () => {
    expect(interpretCalendarTimeGridPointer({
      originInstant: "2026-08-03T14:00",
      originEventId: "review",
      originEventStart: "2026-08-03T14:00",
      originHandle: "body",
      targetInstant: "2026-08-03T14:00",
    })).toEqual({ type: "selection.set", eventIds: ["review"] });
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

describe("interpretCalendarAllDayPointer", () => {
  test("empty same-day press creates a one-day all-day event", () => {
    const intent = interpretCalendarAllDayPointer({
      originDay: "2026-08-10",
      originEventId: null,
      originEventStart: null,
      originHandle: null,
      targetDay: "2026-08-10",
    });
    expect(intent).toEqual({
      type: "event.create",
      start: "2026-08-10",
      end: "2026-08-11",
      allDay: true,
    });
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
    })).toEqual({ type: "selection.set", eventIds: ["holiday"] });
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
});
