import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/date-values.ts");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const ownerTest = read("packages/json-document-calendar/tests/date-controls.test.tsx");
const ownerControls = read("packages/json-document-calendar/src/date-controls.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const navigator = read("site/src/routes/calendar-demo/calendar-demo-navigator.tsx");
const usage = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "calendarCells(period: CalendarPeriod");
requireText(owner, 'if (period === "day") return [cell(visibleDate, true)]');
requireText(owner, "readonly day: number");
requireText(owner, "day: parsed.day");
requireText(ownerIndex, "type CalendarCell");
requireText(ownerTest, 'calendarCells("day", "2026-05-28")');
requireText(ownerTest, "cell.day");
requireCount(ownerControls, "{cell.day}", 1);
requireText(host, 'calendarCells(view === "day" ? "day" : "week", visibleDate)');
requireText(host, "weekdays[cell.weekday - 1]");
requireCount(host, "{cell.day}", 3);
requireCount(navigator, "{cell.day}", 1);
forbid(host, /Array\.from\(\{ length: 7 \},[^\n]*addCalendarDays/);
forbid(host, /startOfIsoWeek\(visibleDate\)/);
forbid(host, /cell\.date\.slice\(8\)/);
forbid(navigator, /cell\.date\.slice\(8\)/);
forbid(ownerControls, /cell\.date\.slice\(8\)/);
requireText(usage, 'symbol: "calendarCells"');
requireText(usage, 'sourcePath: "packages/json-document-calendar/src/date-values.ts"');

console.log("Calendar period-cells guard ok; CalendarCell day owner, five consumers, public type, and Usage checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar period cell 정본 연결이 없습니다: ${text}`);
}

function requireCount(source, text, expected) {
  const count = source.split(text).length - 1;
  if (count !== expected) throw new Error(`Calendar period cell 정본 소비 수가 다릅니다: ${text} (${count}/${expected})`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 day/week cell projection이 다시 생겼습니다: ${pattern}`);
}
