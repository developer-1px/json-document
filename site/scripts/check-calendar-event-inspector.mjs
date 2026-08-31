import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/calendar-event-inspector.tsx");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const ownerTest = read("packages/json-document-calendar/tests/calendar-event-inspector.test.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("site/src/routes/date-controls-demo/DateControlsDemoRoute.tsx");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function CalendarEventInspector");
requireText(ownerIndex, "CalendarEventInspector");
requireText(ownerTest, "<CalendarEventInspector");
requireText(host, "<CalendarEventInspector");
requireText(usage, "<CalendarEventInspector");
requireText(sources, 'symbol: "CalendarEventInspector"');
requireText(sources, 'calendarEventInspectorSource from "../../../../packages/json-document-calendar/src/calendar-event-inspector.tsx?raw"');
requireText(sources, '["packages/json-document-calendar/src/calendar-event-inspector.tsx", calendarEventInspectorSource]');
forbid(owner, /render(?:Field|Section)/);
forbid(host, /detailsEditing|useCalendarRenameInput|calendarRecurrenceWith(?:Frequency|Interval|Until)|aria-label=["']Edit occurrence["']/);

console.log("CalendarEventInspector guard ok; public owner, tests, Host consumer, Usage, source registration, and no render escape hatch checked.");

function read(path) { return readFileSync(resolve(root, path), "utf8"); }
function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`CalendarEventInspector 정본 연결이 없습니다: ${value}`);
}
function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar inspector의 자의적 구현이 다시 생겼습니다: ${pattern}`);
}
