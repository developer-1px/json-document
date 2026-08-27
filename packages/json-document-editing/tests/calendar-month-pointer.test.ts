import { describe, expect, test } from "vitest";
import {
  createCalendarEditor,
  interpretCalendarMonthPointer,
  type CalendarDocument,
} from "../src/index.js";

const initial: CalendarDocument = {
  events: [
    { id: "standup", title: "Standup", start: "2026-08-03T09:00", end: "2026-08-03T09:30", allDay: false },
    { id: "review", title: "Review", start: "2026-08-03T14:00", end: "2026-08-03T15:00", allDay: false },
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

  test("empty-to-empty drag is a no-op", () => {
    expect(interpretCalendarMonthPointer({
      originDay: "2026-08-10",
      originEventId: null,
      targetDay: "2026-08-11",
      eventsOnTargetDay: [],
    })).toBeNull();
  });
});
