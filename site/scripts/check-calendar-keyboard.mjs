import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const web = read("packages/json-document-web/src/calendar-input.ts");
const binding = read("packages/json-document-calendar/src/use-calendar-keyboard.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(web, "Escape: { type: \"dismiss\" }");
requireText(binding, "calendarCommandFromWebKeyboardEvent");
requireText(binding, "dispatchCalendarKeyboardCommand");
requireText(host, "useCalendarKeyboard");
forbid(host, /addEventListener\(["']keydown["']/);
forbid(host, /removeEventListener\(["']keydown["']/);
forbid(host, /calendarCommandFromWebKeyboardEvent/);

console.log("Calendar Keyboard guard ok; Web owner, Calendar binding, and Host checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar Keyboard 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 Keyboard local lifecycle이 다시 생겼습니다: ${pattern}`);
}
