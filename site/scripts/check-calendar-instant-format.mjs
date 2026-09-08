import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-validation.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const ownerTest = read("packages/json-document-editing/tests/calendar-validation.test.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("docs/public/hands.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function formatCalendarInstant");
requireText(ownerIndex, "formatCalendarInstant");
requireText(ownerTest, 'formatCalendarInstant(Temporal.PlainDateTime.from("2026-05-25T09:30:45.123"))');
requireText(host, "formatCalendarInstant(Temporal.Now.plainDateTimeISO())");
forbid(host, /function clockNow/);
forbid(host, /\.toString\(\{ smallestUnit: "minute" \}\)/);
requireText(usage, "Editing `formatCalendarInstant`");
requireText(sources, 'symbol: "formatCalendarInstant"');
requireText(sources, 'sourcePath: "packages/json-document-editing/src/calendar-validation.ts"');

console.log("Calendar instant format guard ok; Editing owner/export/test, Host clock composition, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar instant formatter 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 instant formatter 중복이 다시 생겼습니다: ${pattern}`);
}
