import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(packageRoot, "src");
const layerOrder = ["application", "domain", "foundation"];
const layerRank = new Map(layerOrder.map((layer, index) => [layer, index]));
const allowedLayerSeams = new Map([
  [
    "application->domain",
    new Set([
      "domain/json-document/index.ts",
    ]),
  ],
  [
    "domain->foundation",
    new Set([
      "foundation/json/index.ts",
      "foundation/jsonpath/index.ts",
      "foundation/protocol/index.ts",
    ]),
  ],
]);
const failures = [];

for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!layerRank.has(entry.name)) {
    failures.push(`src/${entry.name}: first path segment must be a layer (${layerOrder.join(", ")})`);
  }
  if (!entry.isDirectory()) {
    failures.push(`src/${entry.name}: layer root entries must be directories`);
  }
}

for (const file of sourceFiles(sourceRoot)) {
  const source = readFileSync(file, "utf8");
  const fromLayer = relative(sourceRoot, file).split("/")[0];
  if (!layerRank.has(fromLayer)) continue;

  for (const specifier of moduleSpecifiers(source)) {
    const target = resolveLocalImport(file, specifier);
    if (target === null) continue;
    if (!existsSync(target)) {
      failures.push(`${relative(sourceRoot, file)} -> ${specifier}: local import does not resolve`);
      continue;
    }

    const toLayer = relative(sourceRoot, target).split("/")[0];
    if (!layerRank.has(toLayer)) {
      failures.push(`${relative(sourceRoot, file)} -> ${relative(sourceRoot, target)}: target is outside known layers`);
      continue;
    }

    if (fromLayer === toLayer) continue;

    const distance = layerRank.get(toLayer) - layerRank.get(fromLayer);
    if (distance !== 1) {
      failures.push(`${relative(sourceRoot, file)} -> ${relative(sourceRoot, target)}: layers must import only adjacent lower layers`);
      continue;
    }

    const seamKey = `${fromLayer}->${toLayer}`;
    const allowedSeams = allowedLayerSeams.get(seamKey);
    const targetPath = relative(sourceRoot, target);
    if (!allowedSeams?.has(targetPath)) {
      failures.push(`${relative(sourceRoot, file)} -> ${targetPath}: cross-layer imports must use an explicit ${toLayer} seam`);
    }
  }
}

if (failures.length > 0) {
  console.error(`json-document layer check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("json-document layer check ok");
}

function sourceFiles(dir) {
  return readdirSync(dir)
    .flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return path.endsWith(".ts") ? [path] : [];
    })
    .sort();
}

function moduleSpecifiers(source) {
  return [
    ...Array.from(source.matchAll(/\b(?:import|export)\s+(?:type\s+)?[^;"']*?\s+from\s+["']([^"']+)["']/g), (match) => match[1]),
    ...Array.from(source.matchAll(/\bimport\s+["']([^"']+)["']/g), (match) => match[1]),
  ];
}

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  let target = normalize(join(dirname(fromFile), specifier));
  if (target.endsWith(".js")) target = `${target.slice(0, -3)}.ts`;
  if (!target.endsWith(".ts")) target = `${target}.ts`;
  return target.startsWith(sourceRoot) ? target : null;
}
