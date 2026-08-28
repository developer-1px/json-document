import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-ui-primitives-react/src/date-controls.tsx");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "shiftVisibleDate");
requireText(owner, 'period === "day"');
requireText(ownerIndex, "shiftVisibleDate");
requireText(host, "shiftVisibleDate(visibleDate, view, direction)");
requireText(host, "shiftVisibleDate(visibleDate, view, -1)");
requireText(host, "shiftVisibleDate(visibleDate, view, 1)");
forbid(host, /function shiftView/);

console.log("Calendar visible-date shift guard ok; UI Primitives owner and Host consumers checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar visible-date 이동 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 visible-date 이동 분기가 다시 생겼습니다: ${pattern}`);
}
