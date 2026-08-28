import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);

const sources = {
  owner: read("packages/json-document-affordance/src/interaction-handle.ts"),
  react: read("packages/json-document-ui-primitives-react/src/surfaces.tsx"),
  calendar: read("packages/json-document-calendar/src/use-calendar-pointer-interactions.ts"),
  canvas: read("site/src/routes/canvas-demo/CanvasDemoRoute.tsx"),
  database: read("packages/json-document-database/src/database-hand.tsx"),
  annotation: read("site/src/routes/annotation-demo/AnnotationDemoRoute.tsx"),
};

requireText("owner", sources.owner, "createInteractionHandleSession");
for (const symbol of ["useInteractionHandle", "DragHandle", "ResizeHandle", "ControlHandle"]) {
  requireText("react", sources.react, symbol);
}
for (const consumer of ["canvas", "database", "annotation"]) {
  requireText(consumer, sources[consumer], "useInteractionHandle");
}

forbid("calendar", sources.calendar, /window\.addEventListener\(["']pointerup["']/);
forbid("database", sources.database, /onMouseDown=|setPointerCapture\(|window\.addEventListener\(["']mouseup["']/);
forbid("canvas", sources.canvas, /function handleResizePointer(?:Down|Move)/);
forbid("annotation", sources.annotation, /function handleResizePointerDown/);

console.log("InteractionHandle canonical guard ok; owner, React binding, Calendar, Canvas, Database, and Annotation checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(owner, source, text) {
  if (!source.includes(text)) throw new Error(`${owner}가 정본 ${text}를 소비하거나 제공하지 않습니다.`);
}

function forbid(owner, source, pattern) {
  if (pattern.test(source)) throw new Error(`${owner}에 InteractionHandle local lifecycle 우회가 다시 생겼습니다: ${pattern}`);
}
