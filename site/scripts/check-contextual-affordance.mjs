import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-affordance/src/contextual.ts");
const ownerIndex = read("packages/json-document-affordance/src/index.ts");
const primitive = read("packages/json-document-ui-primitives-react/src/contextual-controls.tsx");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const usage = read("docs/public/affordance-contextual.md");
const routes = read("site/site-routes.json");

requireText(owner, "export function contextualAffordance");
requireText(ownerIndex, 'from "./contextual.js"');
requireText(primitive, 'from "@interactive-os/json-document-affordance"');
requireText(primitive, "contextualAffordance({");
requireText(host, "ContextualControls");
requireText(usage, 'from "@interactive-os/json-document-affordance"');
requireText(usage, 'from "@interactive-os/json-document-ui-primitives-react"');
requireText(routes, '"path": "/docs/affordance/contextual"');
forbid(host, /function\s+(?:contextualAffordance|resolveContextualPhase)\b/);

console.log("Contextual Affordance guard ok; owner, primitive, Calendar Host, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`Contextual Affordance 정본 연결이 없습니다: ${value}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 contextual lifecycle 우회 구현이 생겼습니다: ${pattern}`);
}
