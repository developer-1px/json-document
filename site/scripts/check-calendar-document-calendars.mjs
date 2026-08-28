import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-validation.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const ownerTest = read("packages/json-document-editing/tests/calendar-validation.test.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("docs/public/hands.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

for (const symbol of ["calendarDocumentCalendars", "calendarDocumentCalendar"]) {
  requireText(owner, `export function ${symbol}`);
  requireText(ownerIndex, symbol);
  requireText(ownerTest, symbol);
  requireText(host, symbol);
  requireText(usage, symbol);
  requireText(sources, `symbol: "${symbol}"`);
}
forbid(host, /document\.calendars\s*\?\?\s*\[\]/);
forbid(host, /document\.calendars\.find/);

console.log("Calendar document calendars guard ok; Editing owner/export/tests, Host consumers, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar document calendar 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 document calendar projection 우회가 다시 생겼습니다: ${pattern}`);
}
