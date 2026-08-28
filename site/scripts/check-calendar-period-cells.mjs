import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-ui-primitives-react/src/date-values.ts");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const ownerTest = read("packages/json-document-ui-primitives-react/tests/date-controls.test.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "calendarCells(period: CalendarPeriod");
requireText(owner, 'if (period === "day") return [cell(visibleDate, true)]');
requireText(ownerIndex, "type CalendarCell");
requireText(ownerTest, 'calendarCells("day", "2026-05-28")');
requireText(host, 'calendarCells(view === "day" ? "day" : "week", visibleDate)');
requireText(host, "weekdays[cell.weekday - 1]");
forbid(host, /Array\.from\(\{ length: 7 \},[^\n]*addCalendarDays/);
forbid(host, /startOfIsoWeek\(visibleDate\)/);
requireText(usage, 'symbol: "calendarCells"');
requireText(usage, 'sourcePath: "packages/json-document-ui-primitives-react/src/date-values.ts"');

console.log("Calendar period-cells guard ok; UI Primitives day/week owner, public type, Host consumer, and Usage checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar period cell 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 day/week cell projection이 다시 생겼습니다: ${pattern}`);
}
