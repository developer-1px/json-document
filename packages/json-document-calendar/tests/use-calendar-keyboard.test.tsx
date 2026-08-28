import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useCalendarKeyboard, type CalendarKeyboardOptions } from "../src/index.js";

describe("useCalendarKeyboard", () => {
  test("owns listener cleanup, command dispatch, and handled default prevention", () => {
    const target = document.createElement("div");
    const actions = createActions();
    const { rerender, unmount } = renderHook(
      ({ active, dismiss }) => useCalendarKeyboard({
        active,
        target,
        ...actions,
        onDismiss: () => dismiss,
      }),
      { initialProps: { active: true, dismiss: false } },
    );

    const view = key("d");
    act(() => target.dispatchEvent(view));
    expect(actions.onView).toHaveBeenCalledWith("day");
    expect(view.defaultPrevented).toBe(true);

    const ignoredDismiss = key("Escape");
    act(() => target.dispatchEvent(ignoredDismiss));
    expect(ignoredDismiss.defaultPrevented).toBe(false);

    rerender({ active: true, dismiss: true });
    const handledDismiss = key("Escape");
    act(() => target.dispatchEvent(handledDismiss));
    expect(handledDismiss.defaultPrevented).toBe(true);

    rerender({ active: false, dismiss: true });
    act(() => target.dispatchEvent(key("c")));
    expect(actions.onCreate).not.toHaveBeenCalled();
    unmount();
  });
});

function createActions(): Omit<CalendarKeyboardOptions, "active" | "target" | "onDismiss"> {
  return {
    onView: vi.fn(),
    onShift: vi.fn(),
    onToday: vi.fn(),
    onCreate: vi.fn(),
    onRemove: vi.fn(),
  };
}

function key(value: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true });
}
