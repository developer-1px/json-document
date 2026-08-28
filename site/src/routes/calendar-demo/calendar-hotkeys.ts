import type { CalendarView } from "@interactive-os/json-document-editing";

export type CalendarHotkey =
  | { readonly type: "view"; readonly view: CalendarView }
  | { readonly type: "shift"; readonly direction: 1 | -1 }
  | { readonly type: "today" }
  | { readonly type: "create" }
  | { readonly type: "remove" };

export function interpretCalendarHotkey(event: {
  readonly key: string;
  readonly target: EventTarget | null;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
}): CalendarHotkey | null {
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

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (target == null) return false;
  const node = target as Partial<Pick<HTMLInputElement, "tagName" | "isContentEditable" | "type">>;
  if (node.isContentEditable === true) return true;
  const tagName = node.tagName?.toUpperCase();
  if (tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (tagName !== "INPUT") return false;
  const type = typeof node.type === "string" ? node.type.toLowerCase() : "text";
  return type !== "radio" && type !== "checkbox" && type !== "button" && type !== "submit" && type !== "reset";
}

function isRadioOrTab(target: EventTarget | null): boolean {
  if (target == null) return false;
  const role = readAttribute(target, "role");
  if (role === "radio" || role === "tab") return true;
  const node = target as Partial<Pick<HTMLInputElement, "type">>;
  return node.type === "radio";
}

function readAttribute(target: EventTarget, name: string): string | null {
  const getAttribute = (target as { getAttribute?: (key: string) => string | null }).getAttribute;
  return typeof getAttribute === "function" ? getAttribute.call(target, name) : null;
}
