import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-occurrence.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const ownerTest = read("packages/json-document-editing/tests/calendar-editor.test.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const inspector = read("packages/json-document-calendar/src/calendar-event-inspector.tsx");
const usage = read("docs/public/hands.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");
const browserTest = read("site/tests/browser/calendar-app.spec.ts");

for (const symbol of ["calendarRecurrenceWithFrequency", "calendarRecurrenceWithInterval", "calendarRecurrenceWithUntil"]) {
  requireText(owner, `export function ${symbol}`);
  requireText(ownerIndex, symbol);
  requireText(ownerTest, symbol);
  requireText(inspector, symbol);
  requireText(sources, `symbol: "${symbol}"`);
}
forbid(inspector, /as CalendarRecurrence\["freq"\]/);
forbid(inspector, /Math\.max\(1, Math\.floor\(Number\(event\.target\.value\)/);
forbid(inspector, /recurrence:\s*\{\s*\.\.\.selectedEvent\.recurrence!/);
forbid(inspector, /selectedEvent\.recurrence!/);
requireText(usage, "Editing\n`calendarRecurrenceWithFrequency`");
requireText(sources, 'sourcePath: "packages/json-document-editing/src/calendar-occurrence.ts"');
requireText(browserTest, "Calendar recurrence inspector applies canonical model transitions");

console.log("Calendar recurrence transition guard ok; Editing owner/tests, three Host handlers, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar recurrence transition 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 recurrence model 전환이 다시 생겼습니다: ${pattern}`);
}
