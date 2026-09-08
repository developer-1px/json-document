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

  test("uses the focused occurrence for copy, cut, and temporal paste", () => {
    let sequence = 0;
    const editor = createCalendarEditor(initial, { createId: () => `copy-${++sequence}` });
    const { result } = renderHook(() => useCalendarHand(editor));

    act(() => result.current.selectOccurrence("standup", "2026-08-03T09:00", "2026-08-03T09:30"));
    const payload = result.current.copy();
    act(() => result.current.setOccurrence({ start: "2026-08-04T11:00", end: "2026-08-04T11:30" }));
    act(() => { expect(result.current.paste(payload!).ok).toBe(true); });
    expect(result.current.selectedEvent).toMatchObject({ id: "copy-1", start: "2026-08-04T11:00" });

    act(() => { expect(result.current.cut()?.ok).toBe(true); });
    expect(result.current.document.events.some((item) => item.id === "copy-1")).toBe(false);
    act(() => result.current.undo());
    expect(result.current.document.events.some((item) => item.id === "copy-1")).toBe(true);
  });

  test("selects an empty time slot as the temporal paste destination", () => {
    let sequence = 0;
    const editor = createCalendarEditor(initial, { createId: () => `copy-${++sequence}` });
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
    const payload = result.current.hand.copy();
    const grid = { getBoundingClientRect: () => ({ top: 0, height: 1440 }) };
    const target = {
      closest: () => grid,
      focus: () => undefined,
      setPointerCapture: () => undefined,
      hasPointerCapture: () => false,
      releasePointerCapture: () => undefined,
    };

    act(() => result.current.pointer.timePointerDown({
      button: 0,
      clientY: 660,
      currentTarget: target,
      pointerId: 1,
    } as never, "2026-08-04", null, null, null, null));
    act(() => result.current.pointer.timePointerUp({ pointerId: 1 } as never));

    expect(result.current.hand.selectedEvent).toBeNull();
    expect(result.current.hand.occurrence.start).toBe("2026-08-04T11:00");
    act(() => { expect(result.current.hand.paste(payload!).ok).toBe(true); });
    expect(result.current.hand.selectedEvent).toMatchObject({ id: "copy-1", start: "2026-08-04T11:00" });
  });

  test("composes the canonical Rename session for created-event cancellation", () => {
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
    expect(result.current.renaming).toBe(true);
    expect(result.current.occurrence).toEqual({
      start: "2026-08-03T10:00",
      end: "2026-08-03T11:00",
    });

    act(() => result.current.cancelTitleRename());
    expect(result.current.renaming).toBe(false);
    expect(result.current.document.events).toHaveLength(1);
  });

  test("commits and cancels title drafts through the canonical Rename session", () => {
    const editor = createCalendarEditor(initial);
    const { result } = renderHook(() => useCalendarHand(editor));

    act(() => result.current.selectOccurrence("standup", "2026-08-03T09:00", "2026-08-03T09:30"));
    act(() => {
      result.current.beginTitleRename();
      result.current.setTitleDraft("Daily standup");
      result.current.commitTitleRename();
    });
    expect(result.current.selectedEvent?.title).toBe("Daily standup");

    act(() => {
      result.current.beginTitleRename();
      result.current.setTitleDraft("Discard me");
      result.current.cancelTitleRename();
    });
    expect(result.current.selectedEvent?.title).toBe("Daily standup");
    expect(result.current.titleDraft).toBe("Daily standup");
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
    act(() => result.current.hand.dispatch({
      type: "selection.set",
      point: { eventId: "standup", occurrenceStart: "2026-08-03T09:00" },
    }));

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

  test("moves the selected occurrence set through Web pointer and semantic gesture sessions", () => {
    const second = {
      ...initial.events[0]!,
      id: "review",
      title: "Review",
      start: "2026-08-04T11:00",
      end: "2026-08-04T12:00",
      excludeDates: [],
    };
    const editor = createCalendarEditor({ ...initial, events: [...initial.events, second] }, { initialEventIds: [] });
    const { result } = renderHook(() => {
      const hand = useCalendarHand(editor);
      const pointer = useCalendarPointerInteractions(hand, {
        hourStart: 0, hourEnd: 24, stepMinutes: 15, pixelsPerHour: 60,
      });
      return { hand, pointer };
    });
    const points = [
      { eventId: "standup", occurrenceStart: "2026-08-03T09:00" },
      { eventId: "review", occurrenceStart: "2026-08-04T11:00" },
    ];
    act(() => result.current.hand.dispatch({ type: "selection.set", point: points[0]!, topology: { points } }));
    act(() => result.current.hand.dispatch({ type: "selection.set", point: points[1]!, topology: { points }, mode: "toggle" }));

    const grid = document.createElement("div");
    grid.dataset.calendarGrid = "time";
    grid.dataset.calendarDay = "2026-08-03";
    grid.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 1440, width: 100, height: 1440, x: 0, y: 0, toJSON: () => ({}) });
    document.body.append(grid);
    const target = {
      closest: () => grid,
      focus: () => undefined,
      setPointerCapture: () => undefined,
      hasPointerCapture: () => false,
      releasePointerCapture: () => undefined,
    };
    act(() => result.current.pointer.timePointerDown({
      button: 0, clientY: 555, currentTarget: target, pointerId: 7,
    } as never, "2026-08-03", "standup", "2026-08-03T09:00", "2026-08-03T09:30", "body"));
    act(() => result.current.pointer.timePointerMove({ pointerId: 7, clientX: 50, clientY: 600, target } as never));
    expect(result.current.hand.selectionDragPreview).not.toBeNull();
    expect(result.current.hand.paintedEvents.map((item) => item.start)).toEqual([
      "2026-08-03T09:45", "2026-08-04T11:45",
    ]);
    act(() => result.current.pointer.timePointerUp({ pointerId: 7 } as never));
    expect(result.current.hand.selectionDragPreview).toBeNull();
    expect(result.current.hand.document.events.map((item) => item.start)).toEqual([
      "2026-08-03T09:45", "2026-08-04T11:45",
    ]);
    expect(result.current.hand.selectedOccurrences).toHaveLength(2);
    act(() => result.current.hand.undo());
    expect(result.current.hand.document.events.map((item) => item.start)).toEqual([
      "2026-08-03T09:00", "2026-08-04T11:00",
    ]);
    grid.remove();
  });

  test("finishes an outstanding create rename when selection drag commits", () => {
    const editor = createCalendarEditor(initial, { createId: () => "draft" });
    const { result } = renderHook(() => useCalendarHand(editor));
    act(() => result.current.createInterval("2026-08-04T10:00", "2026-08-04T11:00"));
    expect(result.current.renaming).toBe(true);
    act(() => result.current.selectOccurrence("standup", "2026-08-03T09:00", "2026-08-03T09:30"));
    const source = result.current.prepareSelectionDrag("standup", "2026-08-03T09:00");
    act(() => result.current.commitSelectionDrag({
      source: source!,
      target: { type: "instant", instant: "2026-08-03T10:00" },
    }));
    expect(result.current.renaming).toBe(false);
  });

  test("keeps a newly created all-day occurrence primary after selection history", () => {
    const editor = createCalendarEditor(initial, { createId: () => "all-day" });
    const { result } = renderHook(() => useCalendarHand(editor));
    act(() => result.current.createInterval("2026-08-04", "2026-08-05", { allDay: true }));
    expect(result.current.isPrimaryOccurrence("all-day", "2026-08-04")).toBe(true);
  });

  test("projects month span pointer coordinates through the Web row adapter", () => {
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
    const row = { getBoundingClientRect: () => ({ left: 100, width: 700 }) };
    const target = {
      closest: () => row,
      focus: () => undefined,
      setPointerCapture: () => undefined,
      hasPointerCapture: () => false,
      releasePointerCapture: () => undefined,
    };

    act(() => result.current.pointer.monthPointerDown({
      button: 0,
      clientX: 450,
      currentTarget: target,
      pointerId: 1,
    } as never, "2026-08-02", [
      "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05",
      "2026-08-06", "2026-08-07", "2026-08-08",
    ], "standup", "2026-08-03T09:00", "2026-08-03T09:30"));

    expect(result.current.hand.monthPreview?.originDay).toBe("2026-08-05");
  });
});
