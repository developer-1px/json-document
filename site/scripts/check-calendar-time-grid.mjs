import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/calendar-time-grid.tsx");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const ownerTest = read("packages/json-document-calendar/tests/calendar-time-grid.test.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("site/src/routes/date-controls-demo/DateControlsDemoRoute.tsx");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function CalendarTimeGrid");
requireText(ownerIndex, "CalendarTimeGrid");
requireText(ownerTest, "<CalendarTimeGrid");
requireText(host, "<CalendarTimeGrid");
requireText(usage, "<CalendarTimeGrid");
requireText(sources, 'symbol: "CalendarTimeGrid"');
requireText(sources, 'calendarTimeGridSource from "../../../../packages/json-document-calendar/src/calendar-time-grid.tsx?raw"');
requireText(sources, '["packages/json-document-calendar/src/calendar-time-grid.tsx", calendarTimeGridSource]');
forbid(owner, /render(?:Cell|Event)/);
forbid(host, /calendarAllDayLayout|calendarTimedLayout|calendarVisibleHourBand|data-calendar-grid=["']time["']/);

console.log("CalendarTimeGrid guard ok; public owner, tests, Host consumer, Usage, source registration, and no render escape hatch checked.");

function read(path) { return readFileSync(resolve(root, path), "utf8"); }
function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`CalendarTimeGrid 정본 연결이 없습니다: ${value}`);
}
function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar day/week 표면의 자의적 구현이 다시 생겼습니다: ${pattern}`);
}
