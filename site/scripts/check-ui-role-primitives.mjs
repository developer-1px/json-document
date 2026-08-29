import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const index = read("packages/json-document-ui-primitives-react/src/index.ts");
const docs = read("docs/public/ui-primitives.md");
const catalog = read("site/src/routes/ui-primitives-catalog/UiPrimitivesCatalogRoute.tsx");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");
const databaseHands = [
  read("packages/json-document-database/src/database-hand.tsx"),
  read("packages/json-document-database/src/database-hands.tsx"),
];

const roles = ["Command", "Toggle", "Choice", "Check", "Field", "Search", "ValueInput", "Tabs", "Menu", "DisclosureButton", "Popover", "Dialog", "SelectableItem", "DragHandle", "ResizeHandle", "ControlHandle", "FileDropRegion"];
for (const role of roles) {
  requireText(index, role, `public role ${role}`);
  requireText(catalog, `<${role}`, `catalog Usage ${role}`);
  requireText(sources, `"${role}"`, `source registration ${role}`);
}

const retired = ["ActionButton", "IconButton", "ToggleButton", "ChoiceChip", "SegmentedControl", "Select", "MenuItemButton", "ProductToolbar"];
for (const name of retired) {
  if (new RegExp(`\\b${name}\\b`).test(index)) throw new Error(`외형/중복 public API가 복원됐습니다: ${name}`);
}

const displaced = ["CalendarGrid", "RangeCalendar", "DatePicker", "DateRangePicker", "HtmlDateField", "calendarCells", "calendarEventLabel", "formatFileSize"];
for (const name of displaced) {
  if (new RegExp(`\\b${name}\\b`).test(index)) throw new Error(`UI Primitive 범주 밖 책임이 복원됐습니다: ${name}`);
}

requireText(docs, "역할", "role-first contract");
for (const source of databaseHands) {
  if (/<button\b/.test(source)) throw new Error("Database Hands가 Command 정본을 우회합니다.");
}
console.log(`UI role primitive guard ok; roles=${roles.length}, retired=${retired.length}, displaced=${displaced.length}.`);

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`UI role primitive closure가 없습니다: ${label}`);
}
