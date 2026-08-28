import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-ui-primitives-react/src/calendar-event-label.ts");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "calendarEventLabel");
requireText(owner, "calendarTimeLabel(event.start)");
forbid(owner, /json-document-editing/);
requireText(ownerIndex, "calendarEventLabel");
requireCount(host, "calendarEventLabel(", 2);
forbid(host, /function monthEventLabel/);

console.log("Calendar event label guard ok; structural UI Primitives owner and two Host consumers checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar event label 정본 연결이 없습니다: ${text}`);
}

function requireCount(source, text, expected) {
  const actual = source.split(text).length - 1;
  if (actual !== expected) throw new Error(`Calendar event label 소비 수가 다릅니다: ${text}, expected=${expected}, actual=${actual}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar event label 경계 위반이 생겼습니다: ${pattern}`);
}
