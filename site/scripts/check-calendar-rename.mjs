import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-affordance/src/session.ts");
const hand = read("packages/json-document-calendar/src/use-calendar-hand.ts");
const binding = read("packages/json-document-calendar/src/use-calendar-rename-input.ts");
const inspector = read("packages/json-document-calendar/src/calendar-event-inspector.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "readonly onCancel?: (key: Key, draft: string) => void");
requireText(hand, "createRenameSession");
requireText(binding, "handleTitleRenameKey");
requireText(inspector, "useCalendarRenameInput");
requireText(host, "CalendarEventInspector");
forbid(host, /\b(?:naming|finishNaming|cancelNaming|commitTitle)\b/);
forbid(host, /titleRef\.current\?\.(?:focus|select)\(/);

console.log("Calendar Rename guard ok; Affordance owner, Calendar Hand/binding, and Host checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar Rename 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 Rename local lifecycle이 다시 생겼습니다: ${pattern}`);
}
