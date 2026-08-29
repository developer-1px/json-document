import type { CalendarView } from "@interactive-os/json-document-editing";
import { createWebKeyboardAdapter, type WebKeymap } from "./keyboard.js";

export type WebCalendarCommand =
  | { readonly type: "view"; readonly view: CalendarView }
  | { readonly type: "shift"; readonly direction: 1 | -1 }
  | { readonly type: "today" }
  | { readonly type: "create" }
  | { readonly type: "rename" }
  | { readonly type: "remove" }
  | { readonly type: "dismiss" };

export interface WebCalendarKeyboardEvent {
  readonly key: string;
  readonly target: unknown;
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
}

const calendarKeymap = Object.freeze({
  d: { type: "view", view: "day" },
  w: { type: "view", view: "week" },
  m: { type: "view", view: "month" },
  y: { type: "view", view: "year" },
  t: { type: "today" },
  c: { type: "create" },
  F2: { type: "rename" },
  Delete: { type: "remove" },
  Backspace: { type: "remove" },
  Escape: { type: "dismiss" },
  n: { type: "shift", direction: 1 },
  p: { type: "shift", direction: -1 },
  ArrowRight: { type: "shift", direction: 1 },
  ArrowLeft: { type: "shift", direction: -1 },
} satisfies WebKeymap<WebCalendarCommand>);

const calendarKeyboard = createWebKeyboardAdapter<WebCalendarCommand>({
  keymap: calendarKeymap,
  defaults: false,
});

export function calendarCommandFromWebKeyboardEvent(event: WebCalendarKeyboardEvent): WebCalendarCommand | null {
  if (isTextEntryTarget(event.target)) return null;
  if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && isRadioOrTab(event.target)) return null;
  return calendarKeyboard.resolve({
    key: event.key,
    shiftKey: event.shiftKey === true,
    metaKey: event.metaKey === true,
    ctrlKey: event.ctrlKey === true,
    altKey: event.altKey === true,
  });
}

export function calendarMinutesFromWebGrid(
  clientY: number,
  bounds: { readonly top: number; readonly height: number },
  options: { readonly hourStart: number; readonly hourEnd: number; readonly stepMinutes: number },
): number {
  const start = options.hourStart * 60;
  const end = options.hourEnd * 60;
  const raw = start + ((clientY - bounds.top) / bounds.height) * (end - start);
  return Math.round(Math.max(start, Math.min(end, raw)) / options.stepMinutes) * options.stepMinutes;
}

export function calendarDayDeltaFromWebWidth(deltaPx: number, columnWidthPx: number): number {
  if (columnWidthPx <= 0) return 0;
  return Math.round(deltaPx / columnWidthPx);
}

export function calendarKeyFromWebRow<Key>(
  clientX: number,
  bounds: { readonly left: number; readonly width: number },
  keys: ReadonlyArray<Key>,
): Key | null {
  if (keys.length === 0) return null;
  if (bounds.width <= 0) return keys[0] ?? null;
  const index = Math.max(0, Math.min(
    keys.length - 1,
    Math.floor(((clientX - bounds.left) / bounds.width) * keys.length),
  ));
  return keys[index] ?? null;
}

function isTextEntryTarget(target: unknown): boolean {
  if (target == null) return false;
  const node = target as { readonly tagName?: string; readonly isContentEditable?: boolean; readonly type?: string };
  if (node.isContentEditable === true) return true;
  const tagName = node.tagName?.toUpperCase();
  if (tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (tagName !== "INPUT") return false;
  const type = typeof node.type === "string" ? node.type.toLowerCase() : "text";
  return type !== "radio" && type !== "checkbox" && type !== "button" && type !== "submit" && type !== "reset";
}

function isRadioOrTab(target: unknown): boolean {
  if (target == null) return false;
  const role = readAttribute(target, "role");
  if (role === "radio" || role === "tab") return true;
  const node = target as { readonly type?: string };
  return node.type === "radio";
}

function readAttribute(target: unknown, name: string): string | null {
  const getAttribute = (target as { getAttribute?: (key: string) => string | null }).getAttribute;
  return typeof getAttribute === "function" ? getAttribute.call(target, name) : null;
}
