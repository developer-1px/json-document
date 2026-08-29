import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/date-values.ts");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const ownerTest = read("packages/json-document-calendar/tests/date-controls.test.tsx");
const calendar = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const navigator = read("site/src/routes/calendar-demo/calendar-demo-navigator.tsx");
const usage = read("docs/public/hands.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function calendarCellInterval");
requireText(ownerIndex, "calendarCellInterval");
requireText(ownerTest, 'calendarCellInterval(calendarCells("month", "2026-05-25"))');
requireText(calendar, "calendarCellInterval(yearMonths.flatMap");
requireText(navigator, "calendarCellInterval(cells)");
forbid(calendar, /addCalendarDate\(yearStart,\s*-7\)/);
forbid(calendar, /addCalendarDate\(yearEnd,\s*14\)/);
forbid(navigator, /cells\[0\]\?\.date|cells\.at\(-1\)\?\.date/);
requireText(usage, "UI Primitives `calendarCellInterval`");
requireText(sources, 'symbol: "calendarCellInterval"');
requireText(sources, 'sourcePath: "packages/json-document-calendar/src/date-values.ts"');

console.log("Calendar cell interval guard ok; Calendar owner/test, year and navigator consumers, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar cell interval 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 cell interval 중복이 다시 생겼습니다: ${pattern}`);
}
