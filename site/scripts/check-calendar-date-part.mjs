import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-editing/src/calendar-validation.ts");
const ownerIndex = read("packages/json-document-editing/src/index.ts");
const ownerTest = read("packages/json-document-editing/tests/calendar-validation.test.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const inspector = read("packages/json-document-calendar/src/calendar-event-inspector.tsx");
const usage = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function calendarDatePart");
requireText(ownerIndex, "calendarDatePart");
requireText(ownerTest, 'calendarDatePart("2026-05-25T23:30")');
requireCount(host, "calendarDatePart(", 2);
requireCount(inspector, "calendarDatePart(", 1);
forbid(host, /\.slice\(0,\s*10\)/);
requireText(usage, 'symbol: "calendarDatePart"');
requireText(usage, 'sourcePath: "packages/json-document-editing/src/calendar-validation.ts"');

console.log("Calendar date-part guard ok; Editing owner, public export, contract test, Usage, and three Host consumers checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar 날짜 부분 정본 연결이 없습니다: ${text}`);
}

function requireCount(source, text, expected) {
  const actual = source.split(text).length - 1;
  if (actual !== expected) throw new Error(`Calendar 날짜 부분 소비 수가 다릅니다: ${text}, expected=${expected}, actual=${actual}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 날짜 부분 문자열 자르기가 다시 생겼습니다: ${pattern}`);
}
