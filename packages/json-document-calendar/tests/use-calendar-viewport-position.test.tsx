import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useCalendarViewportPosition } from "../src/index.js";

afterEach(() => vi.unstubAllGlobals());

describe("useCalendarViewportPosition", () => {
  test("positions the product hour until wheel interaction releases ownership", () => {
    const resizeCallbacks: Array<() => void> = [];
    const scrolls: Array<{ readonly top: number; readonly behavior: ScrollBehavior }> = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resizeCallbacks.push(callback); }
      observe() {}
      disconnect() {}
    });

    function CalendarViewport() {
      const viewportRef = useRef<HTMLDivElement>(null);
      useCalendarViewportPosition({
        viewportRef,
        active: true,
        resetKey: "week:2026-05-25",
        targetHour: 7,
      });
      return (
        <div
          ref={(node) => {
            if (node === null) return;
            viewportRef.current = node;
            Object.defineProperty(node, "clientHeight", { configurable: true, value: 480 });
            node.getBoundingClientRect = () => ({ top: 20 }) as DOMRect;
            node.scrollTo = (options) => {
              if (options === undefined || typeof options === "number") return;
              scrolls.push({ top: options.top ?? 0, behavior: options.behavior ?? "auto" });
            };
          }}
          data-testid="viewport"
        >
          <div
            data-calendar-viewport-hour="07"
            ref={(node) => {
              if (node !== null) node.getBoundingClientRect = () => ({ top: 356 }) as DOMRect;
            }}
          />
        </div>
      );
    }

    const view = render(<CalendarViewport />);
    expect(scrolls.at(0)).toEqual({ top: 336, behavior: "instant" });
    const beforeUserInteraction = scrolls.length;
    act(() => {
      view.getByTestId("viewport").dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
      resizeCallbacks[0]?.();
    });
    expect(scrolls).toHaveLength(beforeUserInteraction);
  });
});
