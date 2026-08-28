import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-ui-primitives-react/src/controls.tsx");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const ownerTest = read("packages/json-document-ui-primitives-react/tests/primitives.test.tsx");
const dateControls = read("packages/json-document-ui-primitives-react/src/date-controls.tsx");
const calendar = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const selection = read("site/src/routes/editing-demos/SelectionDemoRoute.tsx");
const topology = read("site/src/routes/editing-demos/TopologyDemoRoute.tsx");
const artifact = read("site/src/routes/artifact-viewer/ArtifactViewerRoute.tsx");
const usage = read("docs/public/ui-primitives.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(owner, "SegmentedControlOption<Id extends string = string>");
requireText(owner, "SegmentedControl<Id extends string>");
requireText(owner, "ReadonlyArray<SegmentedControlOption<Id>>");
requireText(owner, "onValueChange: (value: Id) => void");
requireText(ownerIndex, "type SegmentedControlOption");
requireText(ownerTest, 'vi.fn<(value: "canvas" | "json") => void>()');
requireText(dateControls, "onValueChange={props.onGrainChange}");
requireText(calendar, "onValueChange={setView}");
requireText(calendar, "onValueChange={setScope}");
requireText(selection, "onValueChange={setMode}");
requireText(topology, "onValueChange={setOrder}");
requireText(artifact, "onValueChange={setActive}");
for (const consumer of [dateControls, calendar, selection, topology, artifact]) {
  forbid(consumer, /onValueChange=\{\(value\)[^\n]*\bas\b/);
}
requireText(usage, "option ID generic을 callback까지");
requireText(sources, '"SegmentedControl"');
requireText(sources, 'sourcePath: "packages/json-document-ui-primitives-react/src/controls.tsx"');

console.log("SegmentedControl ID guard ok; generic owner, six cast-free consumers, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`SegmentedControl ID 정본 연결이 없습니다: ${text}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`SegmentedControl consumer에 ID cast가 다시 생겼습니다: ${pattern}`);
}
