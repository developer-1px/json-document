import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { calendarClipboardFormat, createCalendarEditor, type CalendarDocument } from "@interactive-os/json-document-editing";
import { createWebClipboardBinding, createWebJSONClipboardRepresentation } from "@interactive-os/json-document-web";
import { useCalendarHand, useCalendarPointerInteractions } from "../src/index.js";

afterEach(cleanup);
const initial: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "accent" }],
  events: [{ id: "a", title: "A", start: "2026-08-01T09:00", end: "2026-08-01T10:00", allDay: false, calendarId: "work", recurrence: null, excludeDates: [] }],
};
const policy = { hourStart: 0, hourEnd: 24, stepMinutes: 15, pixelsPerHour: 60 };
const rect = (width: number) => ({ left: 0, right: width, top: 0, bottom: 1440, width, height: 1440, x: 0, y: 0, toJSON: () => ({}) });
function surface(width: number, day: string) {
  const root = document.createElement("div");
  const grid = document.createElement("div");
  grid.dataset.calendarGrid = "time";
  grid.dataset.calendarDay = day;
  grid.dataset.calendarAlldayDay = day;
  grid.getBoundingClientRect = () => rect(width);
  root.append(grid);
  document.body.append(root);
  return { root, grid };
}

describe("Calendar Hand protocol composition", () => {
  test.each(["time", "allDay", "month"] as const)("returning a %s drag to its origin clears preview and does not commit", (kind) => {
    const sourceEvent = kind === "time" ? initial.events[0]! : { ...initial.events[0]!, start: "2026-08-01", end: "2026-08-02", allDay: true };
    const editor = createCalendarEditor({ ...initial, events: [sourceEvent] });
    const { result } = renderHook(() => {
      const hand = useCalendarHand(editor);
      return { hand, pointer: useCalendarPointerInteractions(hand, policy) };
    });
    const { root, grid } = surface(100, kind === "time" ? "2026-08-01" : "2026-08-02");
    try {
      result.current.pointer.rootRef.current = root;
      const target = { closest: () => kind === "time" ? grid : null, focus() {}, setPointerCapture() {}, hasPointerCapture: () => false, releasePointerCapture() {} };
      const down = { button: 0, clientX: 50, clientY: 540, currentTarget: target, pointerId: 1 } as never;
      act(() => {
        if (kind === "time") result.current.pointer.timePointerDown(down, "2026-08-01", "a", sourceEvent.start, sourceEvent.end, "body");
        else if (kind === "allDay") result.current.pointer.allDayPointerDown(down, "2026-08-01", "a", sourceEvent.start, sourceEvent.end, "body");
        else result.current.pointer.monthPointerDown(down, "2026-08-01", ["2026-08-01"], "a", sourceEvent.start, sourceEvent.end);
      });
      act(() => result.current.pointer[`${kind}PointerMove`]({ pointerId: 1, clientX: 50, clientY: 600, target: grid } as never));
      expect(result.current.hand.selectionDragPreview).not.toBeNull();
      grid.dataset.calendarDay = grid.dataset.calendarAlldayDay = "2026-08-01";
      act(() => result.current.pointer[`${kind}PointerMove`]({ pointerId: 1, clientX: 50, clientY: 540, target: grid } as never));
      expect(result.current.hand.selectionDragPreview).toBeNull();
      act(() => result.current.pointer[`${kind}PointerUp`]({ pointerId: 1, clientX: 50, clientY: 540 } as never));
      expect(result.current.hand.document.events).toEqual([sourceEvent]);
      expect(editor.snapshot.canUndo).toBe(false);
    } finally { root.remove(); }
  });

  test("cuts the written payload even when the writer re-enters selection", () => {
    const editor = createCalendarEditor({ ...initial, events: [...initial.events, { ...structuredClone(initial.events[0]!), id: "b", title: "B" }] });
    const { result } = renderHook(() => useCalendarHand(editor));
    const data = new Map<string, string>();
    const binding = createWebClipboardBinding({
      codec: createWebJSONClipboardRepresentation(calendarClipboardFormat),
      read: result.current.copy, cut: result.current.cut, paste: result.current.paste,
    });
    act(() => {
      expect(binding.cut({
        clipboardData: {
          types: [],
          getData: (type) => data.get(type) ?? "",
          setData(type, value) {
            data.set(type, value);
            editor.dispatch({ type: "selection.set", point: { eventId: "b", occurrenceStart: "2026-08-01T09:00" } });
          },
        },
        preventDefault() {},
      }).ok).toBe(true);
    });
    expect(JSON.parse(data.get(calendarClipboardFormat.mimeType)!).items[0].sourceEventId).toBe("a");
    expect(result.current.document.events.map((event) => event.id)).toEqual(["b"]);
  });

  test("reports a rejected pointer edit without success aftercare", () => {
    const editor = createCalendarEditor(initial, { createId: () => "draft" });
    const onResult = vi.fn();
    const { result } = renderHook(() => {
      const hand = useCalendarHand(editor, { onResult });
      return { hand, pointer: useCalendarPointerInteractions(hand, policy) };
    });
    act(() => result.current.hand.createInterval("2026-08-01T11:00", "2026-08-01T12:00"));
    const before = editor.snapshot;
    const occurrence = result.current.hand.occurrence;
    act(() => result.current.pointer.resizeTimed("draft", "end", "2026-08-01T11:00", "2026-08-01T12:00", -120, "commit"));
    expect(editor.snapshot).toEqual(before);
    expect(result.current.hand.occurrence).toEqual(occurrence);
    expect(result.current.hand.renaming).toBe(true);
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ ok: false, code: "event.invalid-interval" }));
  });

  test("keeps the edited later occurrence focused for all-scope Inspector follow-up", () => {
    const editor = createCalendarEditor({ ...initial, events: [{ ...initial.events[0]!, recurrence: { freq: "daily", interval: 1, until: "2026-08-08" } }] });
    const { result } = renderHook(() => useCalendarHand(editor));
    act(() => result.current.selectOccurrence("a", "2026-08-03T09:00", "2026-08-03T10:00"));
    act(() => result.current.setScope("all"));
    act(() => result.current.applySelectedPatch({ start: "2026-08-03T11:00" }));
    expect(result.current.inspectedInterval).toEqual({ start: "2026-08-03T11:00", end: "2026-08-03T12:00" });
    act(() => result.current.applySelectedPatch({ end: "2026-08-03T13:00" }));
    expect(result.current.document.events[0]).toMatchObject({ start: "2026-08-01T11:00", end: "2026-08-01T13:00" });
  });

  test("two overlapping Calendar instances hit-test and resize within their own roots", () => {
    const allDay = { ...initial, events: [{ ...initial.events[0]!, start: "2026-08-01", end: "2026-08-02", allDay: true }] };
    const first = createCalendarEditor(allDay), second = createCalendarEditor(allDay);
    const { result } = renderHook(() => {
      const firstHand = useCalendarHand(first), secondHand = useCalendarHand(second);
      return { first: useCalendarPointerInteractions(firstHand, policy), second: useCalendarPointerInteractions(secondHand, policy) };
    });
    const left = surface(100, "2026-08-01"), right = surface(200, "2026-08-02");
    try {
      result.current.first.rootRef.current = left.root;
      result.current.second.rootRef.current = right.root;
      act(() => result.current.second.timePointerMove({ pointerId: 1, clientX: 50, clientY: 540, target: right.grid } as never));
      expect(result.current.second.hoveredTime?.day).toBe("2026-08-02");
      act(() => result.current.first.resizeAllDay("a", "end", "2026-08-01", "2026-08-01", 200, "commit"));
      act(() => result.current.second.resizeAllDay("a", "end", "2026-08-01", "2026-08-01", 200, "commit"));
      expect((first.snapshot.value as CalendarDocument).events[0]?.end).toBe("2026-08-04");
      expect((second.snapshot.value as CalendarDocument).events[0]?.end).toBe("2026-08-03");
    } finally { left.root.remove(); right.root.remove(); }
  });

  test("all-day body dragging preserves the grab offset inside a multi-day span", () => {
    const editor = createCalendarEditor({ ...initial, events: [{ ...initial.events[0]!, start: "2026-08-01", end: "2026-08-04", allDay: true }] });
    const { result } = renderHook(() => {
      const hand = useCalendarHand(editor);
      return { hand, pointer: useCalendarPointerInteractions(hand, policy) };
    });
    const { root, grid } = surface(100, "2026-08-04");
    try {
      result.current.pointer.rootRef.current = root;
      const target = { focus() {}, setPointerCapture() {}, hasPointerCapture: () => false, releasePointerCapture() {} };
      act(() => result.current.pointer.allDayPointerDown({ button: 0, currentTarget: target, pointerId: 1 } as never, "2026-08-03", "a", "2026-08-01", "2026-08-04", "body"));
      act(() => result.current.pointer.allDayPointerMove({ pointerId: 1, clientX: 50, clientY: 50, target: grid } as never));
      expect(result.current.hand.paintedEvents[0]?.start).toBe("2026-08-02");
      act(() => result.current.pointer.allDayPointerUp({ pointerId: 1, clientX: 50, clientY: 50 } as never));
      expect(result.current.hand.document.events[0]).toMatchObject({ start: "2026-08-02", end: "2026-08-05" });
    } finally { root.remove(); }
  });
});
