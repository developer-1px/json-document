import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const web = read("packages/json-document-web/src/calendar-input.ts");
const calendar = read("packages/json-document-calendar/src/use-calendar-pointer-interactions.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(web, "calendarKeyFromWebRow");
requireText(calendar, "calendarKeyFromWebRow");
requireText(calendar, 'closest("[data-calendar-week]")');
requireText(host, "useCalendarPointerInteractions");
forbid(host, /monthWeekDayAt/);
forbid(host, /getBoundingClientRect\(/);
forbid(host, /closest\(["']\[data-calendar-week\]["']\)/);

console.log("Calendar month pointer coordinate guard ok; Web projection, Calendar binding, and Host boundary checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar pointer 좌표 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 pointer 좌표 번역이 다시 생겼습니다: ${pattern}`);
}
