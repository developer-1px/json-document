import { readFileSync } from "node:fs";

const root = new URL("../..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const affordance = read("packages/json-document-affordance/src/anchored-floating-position.ts");
const web = read("packages/json-document-web/src/anchored-floating-position.ts");
const react = read("packages/json-document-react/src/use-anchored-floating-position.ts");
const calendar = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const styles = read("site/src/routes/calendar-demo/calendar-demo-styles.ts");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(affordance, "computeAnchoredFloatingPosition");
requireText(affordance, 'readonly type: "preferred"');
requireText(affordance, 'readonly type: "locked"');
requireText(web, "createWebAnchoredFloatingPositionPorts");
requireText(react, "useAnchoredFloatingPosition");
requireText(calendar, "useAnchoredFloatingPosition");
requireText(calendar, 'data-calendar-event-anchor={isPrimary(item.event) ? "primary" : undefined}');
requireText(calendar, "eventDetailsPosition.floatingRef");
requireText(sources, 'symbol: "useAnchoredFloatingPosition"');
requireText(sources, 'symbol: "computeAnchoredFloatingPosition"');
requireText(sources, 'symbol: "createWebAnchoredFloatingPositionPorts"');

if (calendar.includes("getBoundingClientRect")) {
  throw new Error("Calendar Host bypasses the canonical Web anchored floating measurement");
}
if (/inspector:\s*"[^"]*(?:right-2|top-12)/.test(styles)) {
  throw new Error("Calendar details retain consumer-local fixed placement");
}

console.log("Anchored floating position ownership and Calendar consumption verified.");

function requireText(source, expected) {
  if (!source.includes(expected)) throw new Error(`Missing canonical anchored floating evidence: ${expected}`);
}
