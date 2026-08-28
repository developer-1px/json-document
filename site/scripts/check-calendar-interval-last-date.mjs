import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-validation.ts");
const editingConsumer = read("packages/json-document-editing/src/calendar.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "calendarIntervalLastDate");
requireText(owner, "endInstant.hour === 0");
requireText(editingConsumer, "calendarIntervalLastDate(start, end, allDay)");
requireText(ownerIndex, "calendarIntervalLastDate");
requireCount(host, "calendarIntervalLastDate(", 4);
forbid(host, /addCalendarDate\([^\n]*\.end[^\n]*, -1\)/);

console.log("Calendar interval last-date guard ok; Editing owner, occurrence consumer, and four Host consumers checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar interval 마지막 날짜 정본 연결이 없습니다: ${text}`);
}

function requireCount(source, text, expected) {
  const actual = source.split(text).length - 1;
  if (actual !== expected) throw new Error(`Calendar interval 마지막 날짜 소비 수가 다릅니다: ${text}, expected=${expected}, actual=${actual}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 exclusive-end 보정이 다시 생겼습니다: ${pattern}`);
}
