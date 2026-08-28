import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-validation.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const ownerTest = read("packages/json-document-editing/tests/calendar-validation.test.ts");
const route = read("site/src/routes/calendar-demo/calendar-search.ts");
const usage = read("docs/public/hands.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function parseCalendarView");
requireText(ownerIndex, "parseCalendarView");
requireText(ownerTest, '["day", "week", "month", "year"].map(parseCalendarView)');
requireText(route, "parseCalendarView(search.view) ?? calendarSearchDefaults.view");
forbid(route, /new Set\(\["day", "week", "month", "year"\]\)/);
forbid(route, /as CalendarView/);
requireText(usage, "`parseCalendarView`가 판별하고");
requireText(sources, 'symbol: "parseCalendarView"');
requireText(sources, 'sourcePath: "packages/json-document-editing/src/calendar-validation.ts"');

console.log("Calendar view parser guard ok; Editing owner, public export, tests, Host composition, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar view parser 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar route에 view membership 중복이 다시 생겼습니다: ${pattern}`);
}
