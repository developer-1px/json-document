import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes("--check");
const catalog = createReleaseCatalog();

const outputs = [
  ["docs/generated/repo-catalog.json", `${JSON.stringify(catalog, null, 2)}\n`],
];

const stale = [];

for (const [path, next] of outputs) {
  const absolute = join(root, path);
  const current = existsSync(absolute) ? readFileSync(absolute, "utf8") : null;

  if (check) {
    if (current !== next) stale.push(path);
    continue;
  }

  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, next);
}

if (stale.length > 0) {
  console.error([
    "Generated docs are stale. Run npm run docs:generate.",
    ...stale.map((path) => `- ${path}`),
  ].join("\n"));
  process.exitCode = 1;
} else if (check) {
  console.log("generated docs ok");
} else {
  console.log("generated docs updated");
}

function createReleaseCatalog() {
  const rootPackage = readJson("package.json");
  const core = packageDoc("packages/json-document");

  return {
    schemaVersion: 1,
    repo: {
      name: rootPackage.name,
      private: rootPackage.private === true,
      summary: summaryFromReadme(read("README.md")),
    },
    packages: [core],
    totals: {
      packages: 1,
    },
  };
}

function packageDoc(path) {
  const pkg = readJson(`${path}/package.json`);
  const source = read(`${path}/src/application/document/index.ts`);
  const publicExports = extractExports(source);

  return {
    path,
    name: stringValue(pkg.name),
    status: "core",
    private: pkg.private === true,
    publishable: pkg.private !== true,
    version: stringValue(pkg.version),
    description: stringValue(pkg.description),
    license: stringValue(pkg.license),
    summary: summaryFromReadme(read(`${path}/README.md`)) ?? stringValue(pkg.description),
    publicExports,
    publicExportCount: publicExports.length,
    keywords: Array.isArray(pkg.keywords)
      ? pkg.keywords.filter((item) => typeof item === "string").sort()
      : [],
  };
}

function readJson(path) {
  return JSON.parse(read(path));
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function stringValue(value) {
  return typeof value === "string" ? value : null;
}

function summaryFromReadme(readme) {
  return readme
    .split(/\n\n+/)
    .map((block) => block.trim())
    .find((block) =>
      block
      && !block.startsWith("#")
      && !block.startsWith("```")
      && !block.startsWith("|")
      && !block.startsWith("- "),
    ) ?? null;
}

function extractExports(source) {
  const names = new Set();

  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([\s\S]*?)\}/g)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }

  return [...names].sort();
}
