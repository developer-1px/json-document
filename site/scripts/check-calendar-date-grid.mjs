import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-calendar/src/date-grid.tsx");
const ownerIndex = read("packages/json-document-calendar/src/index.ts");
const ownerTest = read("packages/json-document-calendar/tests/date-controls.test.tsx");
const controls = read("packages/json-document-calendar/src/date-controls.tsx");
const navigator = read("site/src/routes/calendar-demo/calendar-demo-navigator.tsx");
const usage = read("site/src/routes/date-controls-demo/DateControlsDemoRoute.tsx");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "export function DateGrid");
requireText(ownerIndex, "DateGrid");
requireText(ownerTest, '<DateGrid');
requireText(controls, '<DateGrid');
requireText(navigator, '<DateGrid');
requireText(usage, '<DateGrid');
requireText(sources, 'symbol: "DateGrid"');
requireText(sources, 'sourcePath: "packages/json-document-calendar/src/date-grid.tsx"');
forbid(navigator, /<div\s+role=["']grid["']/);
forbid(navigator, /cells\.map\s*\(/);

console.log("Calendar DateGrid guard ok; public owner, tests, controls, Demo consumer, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`DateGrid 정본 연결이 없습니다: ${value}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Demo에 날짜 grid 재구현이 다시 생겼습니다: ${pattern}`);
}
