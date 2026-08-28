import { describe, expect, test } from "vitest";

import { interpretCalendarHotkey } from "../../src/routes/calendar-demo/calendar-hotkeys";

describe("interpretCalendarHotkey", () => {
  test("maps view, today, and period-shift keys", () => {
    expect(interpretCalendarHotkey(hotkey("d"))).toEqual({ type: "view", view: "day" });
    expect(interpretCalendarHotkey(hotkey("w"))).toEqual({ type: "view", view: "week" });
    expect(interpretCalendarHotkey(hotkey("m"))).toEqual({ type: "view", view: "month" });
    expect(interpretCalendarHotkey(hotkey("y"))).toEqual({ type: "view", view: "year" });
    expect(interpretCalendarHotkey(hotkey("t"))).toEqual({ type: "today" });
    expect(interpretCalendarHotkey(hotkey("c"))).toEqual({ type: "create" });
    expect(interpretCalendarHotkey(hotkey("Delete"))).toEqual({ type: "remove" });
    expect(interpretCalendarHotkey(hotkey("Backspace"))).toEqual({ type: "remove" });
    expect(interpretCalendarHotkey(hotkey("n"))).toEqual({ type: "shift", direction: 1 });
    expect(interpretCalendarHotkey(hotkey("ArrowRight"))).toEqual({ type: "shift", direction: 1 });
    expect(interpretCalendarHotkey(hotkey("p"))).toEqual({ type: "shift", direction: -1 });
    expect(interpretCalendarHotkey(hotkey("ArrowLeft"))).toEqual({ type: "shift", direction: -1 });
  });

  test("returns null for keys the host does not own", () => {
    expect(interpretCalendarHotkey(hotkey("x"))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("Enter"))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("ArrowUp"))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("D"))).toBeNull();
  });

  test("ignores text-entry targets", () => {
    for (const target of [
      fakeTarget({ tagName: "INPUT" }),
      fakeTarget({ tagName: "input" }),
      fakeTarget({ tagName: "TEXTAREA" }),
      fakeTarget({ tagName: "SELECT" }),
      fakeTarget({ tagName: "DIV", isContentEditable: true }),
    ]) {
      expect(interpretCalendarHotkey(hotkey("d", { target }))).toBeNull();
      expect(interpretCalendarHotkey(hotkey("ArrowRight", { target }))).toBeNull();
    }
  });

  test("allows toolbar, grid, document, and view radios", () => {
    for (const target of [
      fakeTarget({ tagName: "BUTTON" }),
      fakeTarget({ tagName: "DIV" }),
      fakeTarget({ tagName: "BODY" }),
      fakeTarget({ tagName: "TD" }),
      fakeTarget({ tagName: "INPUT", type: "radio" }),
      null,
    ]) {
      expect(interpretCalendarHotkey(hotkey("w", { target }))).toEqual({ type: "view", view: "week" });
    }
    expect(interpretCalendarHotkey(hotkey("ArrowLeft", { target: fakeTarget({ tagName: "DIV" }) }))).toEqual({
      type: "shift",
      direction: -1,
    });
  });

  test("does not steal arrow keys from radios and tabs", () => {
    expect(interpretCalendarHotkey(hotkey("ArrowRight", { target: fakeTarget({ tagName: "INPUT", type: "radio" }) }))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("ArrowLeft", { target: fakeTarget({ role: "tab" }) }))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("n", { target: fakeTarget({ tagName: "INPUT", type: "radio" }) }))).toEqual({
      type: "shift",
      direction: 1,
    });
  });

  test("ignores meta, ctrl, and alt chords", () => {
    expect(interpretCalendarHotkey(hotkey("d", { metaKey: true }))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("n", { ctrlKey: true }))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("t", { altKey: true }))).toBeNull();
    expect(interpretCalendarHotkey(hotkey("ArrowRight", { metaKey: true, ctrlKey: true }))).toBeNull();
  });
});

function fakeTarget(options: {
  readonly tagName?: string;
  readonly type?: string;
  readonly role?: string;
  readonly isContentEditable?: boolean;
} = {}): EventTarget {
  return {
    tagName: options.tagName ?? "DIV",
    type: options.type,
    isContentEditable: options.isContentEditable ?? false,
    getAttribute: (name: string) => name === "role" ? (options.role ?? null) : null,
  } as EventTarget;
}

function hotkey(
  key: string,
  options: {
    readonly target?: EventTarget | null;
    readonly metaKey?: boolean;
    readonly ctrlKey?: boolean;
    readonly altKey?: boolean;
  } = {},
): {
  readonly key: string;
  readonly target: EventTarget | null;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
} {
  return {
    key,
    target: options.target === undefined ? fakeTarget() : options.target,
    metaKey: options.metaKey,
    ctrlKey: options.ctrlKey,
    altKey: options.altKey,
  };
}
