import type { CalendarView } from "@interactive-os/json-document-editing";

export type WebCalendarCommand =
  | { readonly type: "view"; readonly view: CalendarView }
  | { readonly type: "shift"; readonly direction: 1 | -1 }
  | { readonly type: "today" }
  | { readonly type: "create" }
  | { readonly type: "remove" };

export interface WebCalendarKeyboardEvent {
  readonly key: string;
  readonly target: unknown;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
}

export function calendarCommandFromWebKeyboardEvent(event: WebCalendarKeyboardEvent): WebCalendarCommand | null {
  if (event.metaKey === true || event.ctrlKey === true || event.altKey === true) return null;
  if (isTextEntryTarget(event.target)) return null;
  if (event.key === "d") return { type: "view", view: "day" };
  if (event.key === "w") return { type: "view", view: "week" };
  if (event.key === "m") return { type: "view", view: "month" };
  if (event.key === "y") return { type: "view", view: "year" };
  if (event.key === "t") return { type: "today" };
  if (event.key === "c") return { type: "create" };
  if (event.key === "Delete" || event.key === "Backspace") return { type: "remove" };
  if (event.key === "n") return { type: "shift", direction: 1 };
  if (event.key === "p") return { type: "shift", direction: -1 };
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    if (isRadioOrTab(event.target)) return null;
    return { type: "shift", direction: event.key === "ArrowRight" ? 1 : -1 };
  }
  return null;
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
