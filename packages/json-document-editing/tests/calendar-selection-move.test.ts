import { describe, expect, test } from "vitest";
import {
  createCalendarEditor,
  planCalendarSelectionMove,
  type CalendarDocument,
  type CalendarEvent,
} from "../src/index.js";

const events: CalendarEvent[] = [
  event("a", "2026-08-03T09:00", "2026-08-03T10:00"),
  event("b", "2026-08-04T11:00", "2026-08-04T12:30"),
];

describe("Calendar selection move", () => {
  test("plans every selected occurrence with the anchor temporal delta", () => {
    const plan = planCalendarSelectionMove(events, [
      { eventId: "a", start: events[0]!.start, end: events[0]!.end },
      { eventId: "b", start: events[1]!.start, end: events[1]!.end },
    ], { eventId: "a", occurrenceStart: events[0]!.start }, {
      type: "instant",
      instant: "2026-08-03T10:30",
    }, { primary: { eventId: "b", occurrenceStart: events[1]!.start } });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.events.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: "2026-08-03T10:30", end: "2026-08-03T11:30" },
      { start: "2026-08-04T12:30", end: "2026-08-04T14:00" },
    ]);
    expect(plan.selectionAfter.primaryIndex).toBe(1);
  });

  test("commits the group once and restores it with one undo", () => {
    const document: CalendarDocument = { calendars: [], events };
    const editor = createCalendarEditor(document, { initialEventIds: [] });
    const topology = { points: events.map((item) => ({ eventId: item.id, occurrenceStart: item.start })) };
    editor.dispatch({ type: "selection.set", point: topology.points[0]!, topology });
    editor.dispatch({ type: "selection.set", point: topology.points[1]!, topology, mode: "toggle" });
    const source = editor.prepareSelectionDrag(topology.points[0]!, topology);
    expect(source?.occurrences).toHaveLength(2);
    expect(editor.dispatch({
      type: "selection.move",
      source: source!,
      target: { type: "instant", instant: "2026-08-03T10:00" },
    }).ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events.map((item) => item.start)).toEqual([
      "2026-08-03T10:00",
      "2026-08-04T12:00",
    ]);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as CalendarDocument).events).toEqual(events);
  });

  test("replace-selects an occurrence pressed outside the selection", () => {
    const editor = createCalendarEditor({ calendars: [], events }, { initialEventIds: ["a"] });
    const point = { eventId: "b", occurrenceStart: events[1]!.start };
    const source = editor.prepareSelectionDrag(point, { points: events.map((item) => ({ eventId: item.id, occurrenceStart: item.start })) });
    expect(source?.points).toEqual([point]);
    expect(editor.selectedOccurrences.map((item) => item.eventId)).toEqual(["b"]);
  });

  test("moves all-day occurrences by one shared day delta", () => {
    const allDay = [
      { ...event("a", "2026-08-03", "2026-08-04"), allDay: true },
      { ...event("b", "2026-08-05", "2026-08-07"), allDay: true },
    ];
    const plan = planCalendarSelectionMove(allDay, allDay.map((item) => ({
      eventId: item.id, start: item.start, end: item.end,
    })), { eventId: "a", occurrenceStart: "2026-08-03" }, { type: "day", day: "2026-08-06" });
    expect(plan.ok && plan.events.map((item) => [item.start, item.end])).toEqual([
      ["2026-08-06", "2026-08-07"],
      ["2026-08-08", "2026-08-10"],
    ]);
  });

  test("detaches recurring occurrences atomically while preserving the series", () => {
    let sequence = 0;
    const recurring = [{
      ...event("series", "2026-08-03T09:00", "2026-08-03T10:00"),
      recurrence: { freq: "daily" as const, interval: 1, until: "2026-08-31" },
    }];
    const plan = planCalendarSelectionMove(recurring, [
      { eventId: "series", start: "2026-08-03T09:00", end: "2026-08-03T10:00" },
      { eventId: "series", start: "2026-08-04T09:00", end: "2026-08-04T10:00" },
    ], { eventId: "series", occurrenceStart: "2026-08-03T09:00" }, {
      type: "instant", instant: "2026-08-03T11:00",
    }, { createId: () => `detached-${++sequence}` });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.events[0]?.excludeDates).toEqual(["2026-08-03", "2026-08-04"]);
    expect(plan.events.slice(1).map((item) => [item.id, item.start, item.recurrence])).toEqual([
      ["detached-1", "2026-08-03T11:00", null],
      ["detached-2", "2026-08-04T11:00", null],
    ]);
  });
});

function event(id: string, start: string, end: string): CalendarEvent {
  return {
    id,
    title: id,
    start,
    end,
    allDay: false,
    calendarId: "calendar",
    recurrence: null,
    excludeDates: [],
  };
}
