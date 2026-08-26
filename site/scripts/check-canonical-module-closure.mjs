import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const repositoryRoot = new URL("../..", import.meta.url).pathname;
const siteSourceRoot = join(repositoryRoot, "site/src");
const registrySource = readFileSync(join(siteSourceRoot, "app/live-demo-registry.tsx"), "utf8");
const sourceRegistry = readFileSync(join(siteSourceRoot, "shared/demo-workbench/demo-sources.ts"), "utf8");
const databasePropertyConsumers = [
  "packages/json-document-database/src/database-hand.tsx",
  "packages/json-document-database/src/database-hands.tsx",
  "packages/json-document-zod/src/database-document.ts",
];
const annotationDemo = readSource("routes/annotation-demo/AnnotationDemoRoute.tsx");
if (!hasNamedImport(annotationDemo, "@interactive-os/json-document-annotation", "AnnotationHand")) {
  throw new Error("Annotation Demo must consume the canonical AnnotationHand");
}
for (const localResponsibility of ["createGestureSession", "projectWebClientPointToSVG", "function AnnotationShape", "function CommentComposer", "presentStructuredSnapshot"]) {
  if (annotationDemo.includes(localResponsibility)) throw new Error(`Annotation Demo owns displaced behavior: ${localResponsibility}`);
}
const entries = [...registrySource.matchAll(/^\s*"\/[^"]+"[^\n]+"(routes\/[^"]+)"\),?$/gm)].map((match) => match[1]);
const usages = [...sourceRegistry.matchAll(/packageName:\s*["']([^"']+)["'],\s*\n\s*symbol:\s*["']([^"']+)["'],\s*\n\s*sourcePath:\s*["']([^"']+)["']/g)].map((match) => ({
  packageName: match[1],
  symbol: match[2],
  sourcePath: match[3],
}));
for (const symbol of ["ActionButton", "ToggleButton", "IconButton", "SelectableItem", "DisclosureButton"]) {
  usages.push({ packageName: "@interactive-os/json-document-ui-primitives-react", symbol, sourcePath: "packages/json-document-ui-primitives-react/src/controls.tsx" });
}

const packageDirectories = readdirSync(join(repositoryRoot, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(repositoryRoot, "packages", entry.name, "package.json")))
  .map((entry) => `packages/${entry.name}`)
  .sort();
for (const directory of packageDirectories) {
  const manifest = JSON.parse(readFileSync(join(repositoryRoot, directory, "package.json"), "utf8"));
  if (Object.keys(manifest.exports ?? {}).length === 0) throw new Error(`${directory} has no public export`);
}
for (const path of databasePropertyConsumers) {
  const source = readSource(path);
  if (/property\.type === "number"\s*\?\s*Number\(/.test(source) || /(?:currentTarget\.)?value === "true"/.test(source)) {
    throw new Error(`${path} bypasses canonical Database property value conversion`);
  }
}

const visited = new Set();
const queue = [...entries];
while (queue.length > 0) {
  const path = queue.pop();
  if (visited.has(path)) continue;
  visited.add(path);
  const source = readSource(path);
  if (!path.startsWith("packages/")) {
    for (const match of source.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g)) {
      const resolved = resolveSiteSource(path, match[1]);
      if (resolved !== undefined && !isHostInfrastructure(resolved)) queue.push(resolved);
    }
  }
  for (const usage of usages) {
    if (hasNamedImport(source, usage.packageName, usage.symbol)) queue.push(usage.sourcePath);
  }
}

const linkedPackageDirectories = new Set([...visited]
  .filter((path) => path.startsWith("packages/"))
  .map((path) => path.split("/").slice(0, 2).join("/")));
const missingSources = packageDirectories.filter((directory) => !linkedPackageDirectories.has(directory));
if (missingSources.length > 0) throw new Error(`canonical source registration missing:\n${missingSources.join("\n")}`);

const apiReferences = readdirSync(join(repositoryRoot, "docs/api-reference")).filter((name) => name.endsWith(".md"));
if (apiReferences.length !== packageDirectories.length) {
  throw new Error(`API Reference denominator mismatch: packages=${packageDirectories.length}, references=${apiReferences.length}`);
}

console.log(`Canonical module closure ok; packages=${packageDirectories.length}; live demos=${entries.length}; linked package sources=${linkedPackageDirectories.size}.`);

function readSource(path) {
  return readFileSync(path.startsWith("packages/") ? join(repositoryRoot, path) : join(siteSourceRoot, path), "utf8");
}

function resolveSiteSource(importer, specifier) {
  const base = normalize(join(dirname(importer), specifier));
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
    .find((candidate) => existsSync(join(siteSourceRoot, candidate)) && statSync(join(siteSourceRoot, candidate)).isFile());
}

function isHostInfrastructure(path) {
  return path.startsWith("app/")
    || path.startsWith("shared/ui/")
    || path.startsWith("shared/demo-workbench/")
    || path.startsWith("shared/widget-binding/")
    || path === "routes/connectors/ConnectorDemoPage.tsx"
    || path === "routes/widgets/WidgetDemoFrame.tsx";
}

function hasNamedImport(source, packageName, symbol) {
  const escapedPackage = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imports = new RegExp(`import\\s*\\{([^{}]*)\\}\\s*from\\s*["']${escapedPackage}["']`, "g");
  for (const match of source.matchAll(imports)) {
    const imported = match[1].split(",").map((entry) => entry.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]);
    if (imported.includes(symbol)) return true;
  }
  return false;
}
