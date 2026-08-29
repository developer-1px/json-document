import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const shellOwner = read("packages/json-document-ui-primitives-react/src/product-shell.tsx");
const toolbarOwner = read("packages/json-document-ui-primitives-react/src/toolbar.tsx");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const usage = read("docs/public/ui-primitives.md");
const sources = read("site/src/shared/demo-workbench/demo-sources.ts");
const calendar = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");
const consumers = files("site/src/routes").map((path) => [path, read(path)]);
const databaseConsumers = files("packages/json-document-database/src").map((path) => [path, read(path)]);

for (const symbol of ["ProductShell", "ProductToolbar", "ProductCanvas", "ProductInspector"]) {
  requireText(shellOwner, `export function ${symbol}`);
  requireText(ownerIndex, symbol);
}
for (const symbol of ["Toolbar", "ToolbarGroup", "ToolbarLayout", "ToolbarRegion", "ToolbarSeparator", "ToolbarSpacer"]) {
  requireText(toolbarOwner, `export function ${symbol}`);
  requireText(ownerIndex, symbol);
}
requireText(sources, 'sourcePath: "packages/json-document-ui-primitives-react/src/product-shell.tsx"');
requireText(sources, 'sourcePath: "packages/json-document-ui-primitives-react/src/toolbar.tsx"');
requireText(usage, "<ProductShell");
requireText(usage, "/widgets/toolbar");
requireText(calendar, 'toolbarLabel="Calendar controls"');
requireText(calendar, 'aria-label="Calendar contextual actions"');
requireText(calendar, '<ToolbarRegion placement="center" label="Calendar view">');
requireText(usage, '<ToolbarRegion placement="center" label="View">');

const productShellConsumers = consumers.filter(([, source]) => source.includes("<ProductShell"));
if (productShellConsumers.length !== 13) {
  throw new Error(`ProductShell 소비자 분모가 달라졌습니다: expected=13 actual=${productShellConsumers.length}`);
}
for (const [path, source] of [...consumers, ...databaseConsumers]) {
  forbid(path, source, /\bProductApp\b/);
  forbid(path, source, /role=["']toolbar["']/);
}

console.log("Product shell/toolbar guard ok; owner, 13 shells, toolbar consumers, Calendar boundary, Usage, and source registration checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function files(path) {
  const absolute = resolve(root, path);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return files(child);
    return extname(entry.name) === ".tsx" ? [child] : [];
  });
}

function requireText(source, value) {
  if (!source.includes(value)) throw new Error(`Product shell/toolbar 정본 연결이 없습니다: ${value}`);
}

function forbid(path, source, pattern) {
  if (pattern.test(source)) throw new Error(`${path}에 정본 shell/toolbar 우회가 있습니다: ${pattern}`);
}
