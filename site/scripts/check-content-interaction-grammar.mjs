import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const affordance = read("packages/json-document-affordance/src/content-interaction.ts");
const affordanceIndex = read("packages/json-document-affordance/src/index.ts");
const projection = read("packages/json-document-ui-primitives-react/src/content-interaction.ts");
const primitiveIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const controls = read("packages/json-document-ui-primitives-react/src/controls.tsx");
const surfaces = read("packages/json-document-ui-primitives-react/src/surfaces.tsx");
const calendarTime = read("packages/json-document-calendar/src/calendar-time-grid.tsx");
const calendarMonth = read("packages/json-document-calendar/src/calendar-month-grid.tsx");
const database = read("packages/json-document-database/src/database-hand.tsx");
const board = read("site/src/routes/widgets/BoardWidgetRoute.tsx");
const canvas = read("site/src/routes/widgets/CanvasWidgetRoute.tsx");
const usage = read("docs/public/ui-primitives.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");

requireText(affordance, "export function contentInteractionAffordance");
requireText(affordanceIndex, 'from "./content-interaction.js"');
requireText(projection, "export function contentInteractionAttributes");
requireText(primitiveIndex, 'from "./content-interaction.js"');
requireText(controls, 'contentInteractionAttributes({ role: "content"');
requireText(surfaces, 'contentInteractionAttributes({ role: "content"');
requireText(calendarTime, 'role: "insertion"');
requireText(calendarMonth, 'role: "insertion"');
requireText(database, "<GridCell");
requireText(board, 'role: "drop-target"');
requireText(board, "dragging={activeCardId === card.id}");
requireText(canvas, "dragging={offset !== null}");
requireText(usage, "### Content interaction grammar");
requireText(sources, 'symbol: "contentInteractionAffordance"');
requireText(sources, 'symbol: "contentInteractionAttributes"');

forbid(read("site/src/routes/calendar-demo/calendar-demo-styles.ts"), /selectedSlot:[^\n]*(?:bg-|ring-)/);
forbid(read("site/src/routes/date-controls-demo/date-controls-demo-styles.ts"), /timeSelectedSlot:[^\n]*(?:bg-|ring-)/);
forbid(read("packages/json-document-database/styles.css"), /td\[data-selected=true\]/);

console.log("Content Interaction Grammar guard ok; owner, projection, Calendar, Board, Canvas, Database, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`Content Interaction Grammar 정본 연결이 없습니다: ${value}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`제품 로컬 content interaction 시각 문법이 다시 생겼습니다: ${pattern}`);
}
