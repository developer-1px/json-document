import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-validation.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const ownerTest = read("packages/json-document-editing/tests/calendar-validation.test.ts");
const editor = read("packages/json-document-editing/src/calendar.ts");
const allDayPointer = read("packages/json-document-editing/src/calendar-allday-pointer.ts");
const monthPointer = read("packages/json-document-editing/src/calendar-month-pointer.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function calendarAllDaySpan");
requireText(ownerIndex, "calendarAllDaySpan");
requireText(ownerTest, 'calendarAllDaySpan("2026-05-27", "2026-05-25")');
requireText(editor, "calendarAllDaySpan(start, start)?.end");
requireCount(allDayPointer, "calendarAllDaySpan(", 2);
requireCount(monthPointer, "calendarAllDaySpan(", 1);
requireCount(host, "calendarAllDaySpan(", 2);
forbid(allDayPointer, /addCalendarDate\(release\.targetDay, 1\)/);
forbid(editor, /addCalendarDate\(start, 1\)/);
forbid(host, /addCalendarDate\((?:day|value), 1\)/);
requireText(usage, 'symbol: "calendarAllDaySpan"');
requireText(usage, 'sourcePath: "packages/json-document-editing/src/calendar-validation.ts"');

console.log("Calendar all-day span guard ok; owner, two pointer consumers, editor, two Host consumers, and Usage checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar all-day span 정본 연결이 없습니다: ${text}`);
}

function requireCount(source, text, expected) {
  const actual = source.split(text).length - 1;
  if (actual !== expected) throw new Error(`Calendar all-day span 소비 수가 다릅니다: ${text}, expected=${expected}, actual=${actual}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar all-day event storage에 직접 +1일이 다시 생겼습니다: ${pattern}`);
}
