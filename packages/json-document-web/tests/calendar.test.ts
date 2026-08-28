import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  calendarCommandFromWebKeyboardEvent,
  calendarDayDeltaFromWebWidth,
  calendarMinutesFromWebGrid,
} from "../src/index.js";

describe("Calendar Web adapters", () => {
  test("maps the default calendar keys without stealing text-entry input", () => {
    const cases = [
      ["d", { type: "view", view: "day" }],
      ["w", { type: "view", view: "week" }],
      ["m", { type: "view", view: "month" }],
      ["y", { type: "view", view: "year" }],
      ["t", { type: "today" }],
      ["c", { type: "create" }],
      ["Delete", { type: "remove" }],
      ["Backspace", { type: "remove" }],
      ["Escape", { type: "dismiss" }],
      ["n", { type: "shift", direction: 1 }],
      ["p", { type: "shift", direction: -1 }],
      ["ArrowRight", { type: "shift", direction: 1 }],
      ["ArrowLeft", { type: "shift", direction: -1 }],
    ] as const;
    for (const [key, command] of cases) {
      expect(calendarCommandFromWebKeyboardEvent(stroke(key))).toEqual(command);
    }
    expect(calendarCommandFromWebKeyboardEvent(stroke("d", { tagName: "INPUT" }))).toBeNull();
    expect(calendarCommandFromWebKeyboardEvent(stroke("ArrowRight", { tagName: "INPUT", type: "radio" }))).toBeNull();
    expect(calendarCommandFromWebKeyboardEvent({ ...stroke("d"), metaKey: true })).toBeNull();
    expect(calendarCommandFromWebKeyboardEvent({ ...stroke("d"), shiftKey: true })).toBeNull();
  });

  test("delegates Calendar chords to the canonical keyboard adapter", () => {
    const source = readFileSync(new URL("../src/calendar-input.ts", import.meta.url), "utf8");
    expect(source).toContain("createWebKeyboardAdapter<WebCalendarCommand>");
    expect(source).not.toMatch(/if\s*\(\s*event\.key\s*===\s*["'][dwmtycnp]["']/);
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
