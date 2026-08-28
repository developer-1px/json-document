import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-affordance/src/viewport-position.ts");
const web = read("packages/json-document-web/src/viewport-position.ts");
const calendar = read("packages/json-document-calendar/src/use-calendar-viewport-position.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "user-interaction");
requireText(web, "observeUserInteraction");
requireText(calendar, "createViewportPositionSession");
requireText(calendar, "createWebViewportPositionPorts");
requireText(host, "useCalendarViewportPosition");
forbid(host, /\.scrollTop\s*=/);
forbid(host, /new ResizeObserver\(/);
forbid(host, /addEventListener\(["'](?:wheel|pointerdown)["']/);

console.log("Calendar Viewport Position guard ok; Affordance owner, Web binding, Calendar binding, and Host checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Viewport Position 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 Viewport Position local lifecycle이 다시 생겼습니다: ${pattern}`);
}
