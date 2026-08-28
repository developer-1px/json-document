import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  createCalendarEditor,
  type CalendarDocument,
} from "@interactive-os/json-document-editing";
import { useCalendarHand, useCalendarPointerInteractions } from "../src/index.js";

const initial: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [{
    id: "standup",
    title: "Standup",
    start: "2026-08-03T09:00",
    end: "2026-08-03T09:30",
    allDay: false,
    calendarId: "work",
    recurrence: null,
    excludeDates: [],
  }],
};

describe("useCalendarHand", () => {
  test("observes the editor and owns selection-aware patching", () => {
    const editor = createCalendarEditor(initial);
    const { result } = renderHook(() => useCalendarHand(editor));

    act(() => {
      result.current.selectOccurrence("standup", "2026-08-03T09:00", "2026-08-03T09:30");
    });
    expect(result.current.selectedEvent?.id).toBe("standup");

    act(() => {
      result.current.applySelectedPatch({ title: "Daily standup" });
    });
    expect(result.current.selectedEvent?.title).toBe("Daily standup");
    expect(result.current.inspectedInterval).toEqual({
      start: "2026-08-03T09:00",
      end: "2026-08-03T09:30",
    });
  });

  test("owns preview and create-naming lifecycle state", () => {
    const editor = createCalendarEditor(initial, { createId: () => "draft" });
    const { result } = renderHook(() => useCalendarHand(editor, { defaultTitle: "Event" }));

    act(() => {
      result.current.setTimePreview({
        originInstant: "2026-08-03T10:00",
        originEventId: null,
        originEventStart: null,
        originHandle: null,
        targetInstant: "2026-08-03T11:00",
      });
    });
    expect(result.current.timePreview).not.toBeNull();

    act(() => {
      result.current.createInterval("2026-08-03T10:00", "2026-08-03T11:00", { title: "Event" });
    });
    expect(result.current.naming).toBe(true);
    expect(result.current.occurrence).toEqual({
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:00",
    });

    act(() => result.current.cancelNaming());
    expect(result.current.naming).toBe(false);
    expect(result.current.document.events).toHaveLength(1);
  });

  test("owns normalized resize preview and commit across React, Web, and Editing", () => {
    const editor = createCalendarEditor(initial);
    const { result } = renderHook(() => {
      const hand = useCalendarHand(editor);
      const pointer = useCalendarPointerInteractions(hand, {
        hourStart: 0,
        hourEnd: 24,
        stepMinutes: 15,
        pixelsPerHour: 60,
      });
      return { hand, pointer };
    });
    act(() => result.current.hand.dispatch({ type: "selection.set", eventIds: ["standup"] }));

    act(() => result.current.pointer.resizeTimed(
      "standup", "end", "2026-08-03T09:00", "2026-08-03T09:30", 30, "preview",
    ));
    expect(result.current.hand.timePreview?.targetInstant).toBe("2026-08-03T10:00");

    act(() => result.current.pointer.resizeTimed(
      "standup", "end", "2026-08-03T09:00", "2026-08-03T09:30", 30, "commit",
    ));
    expect(result.current.hand.selectedEvent?.end).toBe("2026-08-03T10:00");
    expect(result.current.hand.timePreview).toBeNull();
  });
});
