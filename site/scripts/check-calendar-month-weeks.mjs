import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-ui-primitives-react/src/date-values.ts");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "calendarMonthWeeks");
requireText(ownerIndex, "calendarMonthWeeks");
requireText(host, "calendarMonthWeeks(visibleDate)");
forbid(host, /function monthWeeks/);
forbid(host, /index \+= 7/);

console.log("Calendar month weeks guard ok; UI Primitives owner, public export, and Host consumer checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar 월간 주 행 projection 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 월간 주 행 projection이 다시 생겼습니다: ${pattern}`);
}
