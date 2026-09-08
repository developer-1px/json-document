import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/date-values.ts");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const navigator = read("site/src/routes/calendar-demo/calendar-demo-navigator.tsx");

requireText(owner, "visiblePeriodLabel");
requireText(owner, 'period === "day"');
requireText(ownerIndex, "visiblePeriodLabel");
requireText(host, "visiblePeriodLabel(view, visibleDate");
requireText(host, 'visiblePeriodLabel("month", monthStart)');
requireText(navigator, 'visiblePeriodLabel("month", railDate)');
forbid(host, /function periodLabel/);
forbid(host, /date\.slice\(0, 4\)/);
forbid(host, /\.slice\(0,\s*7\)/);
forbid(navigator, /\.slice\(0,\s*7\)/);

console.log("Calendar period label guard ok; Calendar owner and every Calendar Host consumer checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar 기간 label 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 기간 label projection이 다시 생겼습니다: ${pattern}`);
}
