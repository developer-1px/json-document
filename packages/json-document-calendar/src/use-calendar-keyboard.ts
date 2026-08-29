import { useEffect, useRef } from "react";
import {
  calendarCommandFromWebKeyboardEvent,
  type WebCalendarCommand,
} from "@interactive-os/json-document-web";
import type { CalendarView } from "@interactive-os/json-document-editing";

export interface CalendarKeyboardTarget {
  addEventListener(type: "keydown", listener: (event: KeyboardEvent) => void): void;
  removeEventListener(type: "keydown", listener: (event: KeyboardEvent) => void): void;
}

export interface CalendarKeyboardOptions {
  readonly active: boolean;
  readonly target?: CalendarKeyboardTarget;
  readonly onView: (view: CalendarView) => void;
  readonly onShift: (direction: 1 | -1) => void;
  readonly onToday: () => void;
  readonly onCreate: () => void;
  readonly onRename: () => void;
  readonly onRemove: () => void;
  readonly onDismiss?: () => boolean;
}

/** Owns Calendar's global Web keyboard listener, command dispatch, and default prevention. */
export function useCalendarKeyboard(options: CalendarKeyboardOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!options.active) return;
    const target: CalendarKeyboardTarget = options.target ?? globalThis.window;
    function onKeyDown(event: KeyboardEvent): void {
      const command = calendarCommandFromWebKeyboardEvent(event);
      if (command === null || !dispatchCalendarKeyboardCommand(command, optionsRef.current)) return;
      event.preventDefault();
    }
    target.addEventListener("keydown", onKeyDown);
    return () => target.removeEventListener("keydown", onKeyDown);
  }, [options.active, options.target]);
}

function dispatchCalendarKeyboardCommand(
  command: WebCalendarCommand,
  options: CalendarKeyboardOptions,
): boolean {
  if (command.type === "view") options.onView(command.view);
  if (command.type === "shift") options.onShift(command.direction);
  if (command.type === "today") options.onToday();
  if (command.type === "create") options.onCreate();
  if (command.type === "rename") options.onRename();
  if (command.type === "remove") options.onRemove();
  if (command.type === "dismiss") return options.onDismiss?.() === true;
  return true;
}
