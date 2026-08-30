import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/calendar-month-grid.tsx");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const ownerTest = read("packages/json-document-calendar/tests/calendar-month-grid.test.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("site/src/routes/date-controls-demo/DateControlsDemoRoute.tsx");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export const CalendarMonthGrid");
requireText(ownerIndex, "CalendarMonthGrid");
requireText(ownerTest, "<CalendarMonthGrid");
requireText(host, "<CalendarMonthGrid");
requireText(usage, "<CalendarMonthGrid");
requireText(sources, 'symbol: "CalendarMonthGrid"');
requireText(sources, 'sourcePath: "packages/json-document-calendar/src/calendar-month-grid.tsx"');
forbid(owner, /render(?:Cell|Event)/);
forbid(host, /calendarMonthWeekLayout|calendarMonthDayLayout|function MonthEvent/);

console.log("CalendarMonthGrid guard ok; public owner, tests, Host consumer, Usage, source registration, and no render escape hatch checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`CalendarMonthGrid 정본 연결이 없습니다: ${value}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar 월간 표면의 자의적 구현이 다시 생겼습니다: ${pattern}`);
}
