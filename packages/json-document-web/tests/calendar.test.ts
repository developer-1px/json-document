import { describe, expect, test } from "vitest";
import {
  calendarCommandFromWebKeyboardEvent,
  calendarDayDeltaFromWebWidth,
  calendarMinutesFromWebGrid,
} from "../src/index.js";

describe("Calendar Web adapters", () => {
  test("maps the default calendar keys without stealing text-entry input", () => {
    expect(calendarCommandFromWebKeyboardEvent(stroke("d"))).toEqual({ type: "view", view: "day" });
    expect(calendarCommandFromWebKeyboardEvent(stroke("ArrowRight"))).toEqual({ type: "shift", direction: 1 });
    expect(calendarCommandFromWebKeyboardEvent(stroke("Delete"))).toEqual({ type: "remove" });
    expect(calendarCommandFromWebKeyboardEvent(stroke("d", { tagName: "INPUT" }))).toBeNull();
    expect(calendarCommandFromWebKeyboardEvent(stroke("ArrowRight", { tagName: "INPUT", type: "radio" }))).toBeNull();
  });

  test("translates Web geometry using injected Calendar policy", () => {
    expect(calendarMinutesFromWebGrid(150, { top: 100, height: 600 }, {
      hourStart: 7,
      hourEnd: 17,
      stepMinutes: 15,
    })).toBe(7 * 60 + 45);
    expect(calendarDayDeltaFromWebWidth(160, 100)).toBe(2);
    expect(calendarDayDeltaFromWebWidth(80, 0)).toBe(0);
  });
});

function stroke(key: string, target: { readonly tagName?: string; readonly type?: string } = {}) {
  return {
    key,
    target: {
      tagName: target.tagName ?? "DIV",
      type: target.type,
      isContentEditable: false,
      getAttribute: () => null,
    } as unknown as EventTarget,
  };
}
