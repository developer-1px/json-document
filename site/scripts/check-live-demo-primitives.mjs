import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

const siteRoot = new URL("..", import.meta.url).pathname;
const sourceRoot = join(siteRoot, "src");
const registryPath = join(sourceRoot, "app/live-demo-registry.tsx");
const registry = readFileSync(registryPath, "utf8");
const liveDemoPaths = [...registry.matchAll(/^\s*"([^"]+)": demo\(/gm)].map((match) => match[1]);

if (liveDemoPaths.length !== 37) {
  throw new Error(`Live Demo 감사 집합이 37개에서 ${liveDemoPaths.length}개로 바뀌었습니다. 새 경로의 control 분류를 이 guard와 함께 갱신하세요.`);
}

const roots = [join(sourceRoot, "routes"), join(sourceRoot, "shared/demo-workbench"), join(sourceRoot, "shared/ui")];
const files = roots.flatMap(walk).filter((file) => extname(file) === ".tsx" && !file.includes("/routes/docs/"));
const findings = [];
const counts = { action: 0, icon: 0, toggle: 0, choice: 0, segmented: 0, tabs: 0, disclosure: 0, menu: 0, dragHandle: 0, resizeHandle: 0, controlHandle: 0 };

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/<button\b/g)) findings.push(`${relative(siteRoot, file)}:${lineOf(source, match.index)} raw <button>`);
  for (const match of source.matchAll(/<(?!button\b)[A-Za-z][^>]*\brole=["']button["']/g)) findings.push(`${relative(siteRoot, file)}:${lineOf(source, match.index)} non-button role=button`);
  for (const match of source.matchAll(/<ToggleButton\b[^>]*\brole=["']tab["']/g)) findings.push(`${relative(siteRoot, file)}:${lineOf(source, match.index)} tab을 ToggleButton으로 우회`);
  counts.action += matches(source, /<ActionButton\b/g);
  counts.icon += matches(source, /<IconButton\b/g);
  counts.toggle += matches(source, /<ToggleButton\b/g);
  counts.choice += matches(source, /<ChoiceChip\b/g);
  counts.segmented += matches(source, /<SegmentedControl\b/g);
  counts.tabs += matches(source, /<Tabs\b/g);
  counts.disclosure += matches(source, /<DisclosureButton\b/g);
  counts.menu += matches(source, /<(?:Menu|MenuItemButton)\b/g);
  counts.dragHandle += matches(source, /<DragHandle\b/g);
  counts.resizeHandle += matches(source, /<ResizeHandle\b/g);
  counts.controlHandle += matches(source, /<ControlHandle\b/g);
}

if (findings.length > 0) throw new Error(`Live Demo가 canonical UI Primitive를 우회합니다:\n${findings.join("\n")}`);

console.log(`Live Demo primitive audit ok; ${liveDemoPaths.length} paths; ${Object.entries(counts).map(([kind, count]) => `${kind}=${count}`).join(", ")}.`);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function matches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}
