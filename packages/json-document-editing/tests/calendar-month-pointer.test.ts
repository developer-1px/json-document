import { describe, expect, test } from "vitest";
import {
  bindCalendarMonthIntent,
  createCalendarEditor,
  interpretCalendarMonthPointer,
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
  calendars: [{ id: "home", title: "Home", hidden: false }],
  events: [
    event({ id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false }),
    event({ id: "review", title: "Review", start: "2026-08-03T14:00", end: "2026-08-03T15:00", allDay: false }),
  ],
};

describe("interpretCalendarMonthPointer", () => {
  test("empty same-day click creates even when another event is already selected", () => {
    const editor = createCalendarEditor(initial);
    expect(editor.snapshot.selection.primaryKey).toBe("standup");
    const intent = interpretCalendarMonthPointer({
      originDay: "2026-08-10",
      originEventId: null,
      targetDay: "2026-08-10",
      eventsOnTargetDay: [],
    });
    expect(intent).toEqual({
      type: "event.create",
      start: "2026-08-10",
      end: "2026-08-11",
      allDay: true,
    });
    expect(editor.dispatch(intent!).ok).toBe(true);
    const events = (editor.snapshot.value as CalendarDocument).events;
    expect(events.find((event) => event.id === "standup")).toMatchObject({
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
    });
    expect(events.at(-1)).toMatchObject({
      start: "2026-08-10",
      end: "2026-08-11",
      allDay: true,
    });
  });

  test("empty click on an occupied day still creates an all-day event", () => {
    expect(interpretCalendarMonthPointer({
      originDay: "2026-08-03",
      originEventId: null,
      targetDay: "2026-08-03",
      eventsOnTargetDay: [{ id: "standup" }, { id: "review" }],
    })).toEqual({
      type: "event.create",
      start: "2026-08-03",
      end: "2026-08-04",
      allDay: true,
    });
  });

  test("occupied same-day click selects the origin event, not the current selection", () => {
    expect(interpretCalendarMonthPointer({
      originDay: "2026-08-03",
      originEventId: "review",
      targetDay: "2026-08-03",
      eventsOnTargetDay: [{ id: "standup" }, { id: "review" }],
    })).toEqual({ type: "selection.set", eventIds: ["review"] });
  });

  test("dragging the origin event to another day moves that event", () => {
    const editor = createCalendarEditor(initial);
    const intent = interpretCalendarMonthPointer({
      originDay: "2026-08-03",
      originEventId: "standup",
      targetDay: "2026-08-10",
      eventsOnTargetDay: [],
    });
    expect(intent).toEqual({ type: "event.move-day", eventId: "standup", day: "2026-08-10" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-10T09:00",
      end: "2026-08-10T09:30",
    });
  });

  test("dragging a later day of a multi-day event shifts by the grab-to-drop delta", () => {
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false }],
      events: [
        event({ id: "holiday", title: "Holiday", start: "2026-08-03", end: "2026-08-06", allDay: true }),
      ],
    });
    const intent = interpretCalendarMonthPointer({
      originDay: "2026-08-05",
      originEventId: "holiday",
      originEventStart: "2026-08-03",
      targetDay: "2026-08-06",
      eventsOnTargetDay: [],
    });
    expect(intent).toEqual({ type: "event.move-day", eventId: "holiday", day: "2026-08-04" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events[0]).toMatchObject({
      start: "2026-08-04",
      end: "2026-08-07",
    });
  });

  test("turns a recurring later-occurrence drag into this-occurrence edit", () => {
    const series = event({
      id: "standup",
      title: "Standup",
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
      recurrence: { freq: "daily", interval: 1, until: "2026-08-05" },
    });
    const move = interpretCalendarMonthPointer({
      originDay: "2026-08-04",
      originEventId: "standup",
      originEventStart: "2026-08-04T09:00",
      targetDay: "2026-08-06",
      eventsOnTargetDay: [],
    });
    expect(move).toEqual({ type: "event.move-day", eventId: "standup", day: "2026-08-06" });
    const intent = bindCalendarMonthIntent(move, series, "2026-08-04T09:00", "this");
    expect(intent).toEqual({
      type: "occurrence.edit",
      eventId: "standup",
      occurrenceStart: "2026-08-04T09:00",
      scope: "this",
      start: "2026-08-06T09:00",
    });
    const editor = createCalendarEditor({
      calendars: [{ id: "home", title: "Home", hidden: false }],
      events: [series],
    }, { createId: () => "split" });
    expect(editor.dispatch(intent!).ok).toBe(true);
    const document = editor.snapshot.value as CalendarDocument;
    expect(document.events.find((item) => item.id === "standup")?.excludeDates).toEqual(["2026-08-04"]);
    expect(document.events.at(-1)).toMatchObject({
      id: "split",
      start: "2026-08-06T09:00",
      end: "2026-08-06T09:30",
      recurrence: null,
    });
  });

  test("empty-to-empty drag is a no-op", () => {
    expect(interpretCalendarMonthPointer({
      originDay: "2026-08-10",
      originEventId: null,
      targetDay: "2026-08-11",
      eventsOnTargetDay: [],
    })).toBeNull();
  });
});
