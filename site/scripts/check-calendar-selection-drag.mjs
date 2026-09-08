import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const selection = read("packages/json-document-selection/src/range/materialized.ts");
const planner = read("packages/json-document-editing/src/calendar-selection-move.ts");
const editor = read("packages/json-document-editing/src/calendar.ts");
const hand = read("packages/json-document-calendar/src/use-calendar-hand.ts");
const binding = read("packages/json-document-calendar/src/use-calendar-pointer-interactions.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(selection, "resolveMaterializedSelectionDragSource");
requireText(planner, "planCalendarSelectionMove");
requireText(editor, 'readonly type: "selection.move"');
requireText(hand, "planCalendarSelectionMove");
requireText(binding, "createGestureSession<CalendarSelectionDragGesture>");
requireText(binding, "createWebPointerSession<TimeRelease>");
requireText(host, "useCalendarPointerInteractions");
requireText(sources, 'symbol: "resolveMaterializedSelectionDragSource"');
requireText(sources, 'symbol: "planCalendarSelectionMove"');
forbid(host, /planCalendarSelectionMove|createGestureSession|resolveMaterializedSelectionDragSource/);
forbid(host, /type:\s*["']selection\.move["']/);

console.log("Calendar Selection Drag guard ok; Selection, Editing, Gesture, Web binding, Host boundary, Usage sources checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar Selection Drag 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 Selection Drag 책임이 다시 생겼습니다: ${pattern}`);
}
