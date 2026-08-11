import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fileNames(path) {
  return readdirSync(join(root, path), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function filesUnder(path) {
  return readdirSync(join(root, path), { withFileTypes: true })
    .flatMap((entry) => {
      if (
        entry.isDirectory()
        && [".git", ".npm-cache", "node_modules", "dist", "build", "coverage"].includes(entry.name)
      ) {
        return [];
      }

      const child = path === "" ? entry.name : `${path}/${entry.name}`;
      return entry.isDirectory() ? filesUnder(child) : [child];
    });
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const publicDocs = {
  overview: read("docs/public/overview.md"),
  quickstart: read("docs/public/quickstart.md"),
  api: read("docs/public/api.md"),
};
const surfaces = {
  rootReadme: read("README.md"),
  docsReadme: read("docs/README.md"),
  packageReadme: read("packages/json-document/README.md"),
  collaborationReadme: read("packages/json-document-collaboration/README.md"),
  contenteditableCollaborationReadme: read(
    "packages/contenteditable-collaboration/README.md",
  ),
  llms: read("llms.txt"),
  ...publicDocs,
};
const publicSurface = readJson("docs/standard/v3-public-surface.json");
const publicContract = readJson("packages/json-document/public-contract.json");
const activeCompanionPackages = new Set([
  "@interactive-os/json-document-collaboration",
  "@interactive-os/json-document-contenteditable-collaboration",
]);

if (JSON.stringify(fileNames("docs/public")) !== JSON.stringify([
  "api.md",
  "overview.md",
  "quickstart.md",
])) {
  fail("docs/public: only the three active v3 guides may remain.");
}

if (JSON.stringify(fileNames("docs/standard")) !== JSON.stringify([
  "concept-and-naming-standard.md",
  "v3-json-document-profile.md",
  "v3-public-surface.json",
])) {
  fail("docs/standard: naming SSOT, v3 profile, and machine-readable surface must be the only active standards.");
}

const misplacedMarkdown = filesUnder("").filter((path) => {
  const name = path.split("/").at(-1);
  return path.endsWith(".md") && !path.startsWith("docs/") && name !== "README.md";
});
if (misplacedMarkdown.length > 0) {
  fail(`docs layout: non-README markdown must live under docs/: ${misplacedMarkdown.join(", ")}.`);
}

for (const [name, source] of Object.entries(surfaces)) {
  if (/@interactive-os\/json-document\/(?:session|react)\b/.test(source)) {
    fail(`${name}: removed package subpath is still documented.`);
  }
  for (
    const match of source.matchAll(
      /@interactive-os\/json-document-[a-z0-9-]+\b/g,
    )
  ) {
    if (!activeCompanionPackages.has(match[0])) {
      fail(
        `${name}: removed json-document extension is still documented as current: ${match[0]}.`,
      );
    }
  }
  if (/\blabs\/extensions\b/.test(source)) {
    fail(`${name}: removed lab path is still documented as current.`);
  }
}

for (const [name, source] of Object.entries(surfaces)) {
  for (const token of [
    "src/index.ts",
    "src/react.ts",
    "application/document",
    "domain/schema",
    "domain/selection",
    "domain/pointer",
    "foundation/patch",
    "foundation/json",
    "foundation/jsonpath",
    "foundation/pointer",
  ]) {
    if (source.includes(token)) {
      fail(`${name}: public docs must not require internal source path ${token}.`);
    }
  }
}

for (const [name, source] of Object.entries({
  packageReadme: surfaces.packageReadme,
  llms: surfaces.llms,
  ...publicDocs,
})) {
  for (const pattern of [
    /관리자 메모/,
    /docs:evaluate/,
    /release:check/,
    /prepublishOnly/,
    /evaluation-loop/,
    /public-api-foundation/,
    /api-usage-gaps/,
  ]) {
    if (pattern.test(source)) fail(`${name}: maintainer history leaked into public docs.`);
  }
}

if (
  JSON.stringify(Object.keys(publicContract)) !== JSON.stringify(["root"])
  || !Array.isArray(publicContract.root.values)
  || !Array.isArray(publicContract.root.types)
  || new Set(publicContract.root.values).size !== publicContract.root.values.length
  || new Set(publicContract.root.types).size !== publicContract.root.types.length
) {
  fail("public contract: root must be the only entrypoint with unique value and type symbols.");
}

for (const symbol of [
  ...publicContract.root.values,
  ...publicContract.root.types,
]) {
  if (!publicDocs.api.includes(symbol)) {
    fail(`public API docs: missing root symbol ${symbol}.`);
  }
}
for (const member of publicSurface.documentMembers) {
  if (!publicDocs.api.includes(member)) {
    fail(`public API docs: missing JSON Document member ${member}.`);
  }
}

console.log("docs evaluation ok");
