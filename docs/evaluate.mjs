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
        && [".git", ".npm-cache", "node_modules", "dist", "build", "coverage", "test-results"].includes(entry.name)
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
  concepts: read("docs/public/concepts.md"),
  selection: read("docs/public/selection.md"),
  history: read("docs/public/history.md"),
  clipboard: read("docs/public/clipboard.md"),
  topology: read("docs/public/topology.md"),
  intent: read("docs/public/intent.md"),
  intentGuide: read("docs/public/intent-guide.md"),
  quickstart: read("docs/public/quickstart.md"),
  api: read("docs/public/api.md"),
  adapters: read("docs/public/adapters.md"),
  connectors: read("docs/public/connectors.md"),
  collaboration: read("docs/public/collaboration.md"),
  collaborationReplica: read("docs/public/collaboration-replica.md"),
  collaborationHistory: read("docs/public/collaboration-history.md"),
  collaborationText: read("docs/public/collaboration-text.md"),
  collaborationLease: read("docs/public/collaboration-lease.md"),
  collaborationLifecycle: read("docs/public/collaboration-lifecycle.md"),
  editors: read("docs/public/editors.md"),
  order: read("docs/public/order.md"),
  object: read("docs/public/object.md"),
  tree: read("docs/public/tree.md"),
};
const surfaces = {
  rootReadme: read("README.md"),
  docsReadme: read("docs/README.md"),
  packageReadme: read("packages/json-document/README.md"),
  editingReadme: read("packages/json-document-editing/README.md"),
  selectionReadme: read("packages/json-document-selection/README.md"),
  reactReadme: read("packages/json-document-react/README.md"),
  reactHookFormReadme: read("packages/json-document-react-hook-form/README.md"),
  ajvReadme: read("packages/json-document-ajv/README.md"),
  zodReadme: read("packages/json-document-zod/README.md"),
  tanstackTableReadme: read("packages/json-document-tanstack-table/README.md"),
  webReadme: read("packages/json-document-web/README.md"),
  contenteditableReadme: read("packages/json-document-contenteditable/README.md"),
  collaborationReadme: read("packages/json-document-collaboration/README.md"),
  contenteditableCollaborationReadme: read(
    "packages/contenteditable-collaboration/README.md",
  ),
  llms: read("docs/public/llms.txt"),
  ...publicDocs,
};
const publicSurface = readJson("standards/json-document-v3/public-surface.json");
const publicContract = readJson("packages/json-document/public-contract.json");
const activeCompanionPackages = new Set([
  "@interactive-os/json-document-editing",
  "@interactive-os/json-document-selection",
  "@interactive-os/json-document-react",
  "@interactive-os/json-document-react-hook-form",
  "@interactive-os/json-document-ajv",
  "@interactive-os/json-document-zod",
  "@interactive-os/json-document-tanstack-table",
  "@interactive-os/json-document-web",
  "@interactive-os/json-document-contenteditable",
  "@interactive-os/json-document-collaboration",
  "@interactive-os/json-document-contenteditable-collaboration",
]);

if (JSON.stringify(fileNames("docs/public")) !== JSON.stringify([
  "adapters.md",
  "api.md",
  "clipboard.md",
  "collaboration-history.md",
  "collaboration-lease.md",
  "collaboration-lifecycle.md",
  "collaboration-replica.md",
  "collaboration-text.md",
  "collaboration.md",
  "concepts.md",
  "connectors.md",
  "editors.md",
  "history.md",
  "intent-guide.md",
  "intent.md",
  "llms.txt",
  "object.md",
  "order.md",
  "overview.md",
  "quickstart.md",
  "selection.md",
  "topology.md",
  "tree.md",
])) {
  fail("docs/public: only the active v3 guides and llms.txt may remain.");
}

if (JSON.stringify(fileNames("standards")) !== JSON.stringify([
  "repository-naming.md",
])) {
  fail("standards: repository naming must be the only repository-wide standard file.");
}

if (JSON.stringify(fileNames("standards/json-document-v3")) !== JSON.stringify([
  "evaluate.mjs",
  "profile.md",
  "public-surface.json",
])) {
  fail("standards/json-document-v3: evaluator, profile, and machine-readable surface must be the only standard root files.");
}

const misplacedMarkdown = filesUnder("").filter((path) => {
  const name = path.split("/").at(-1);
  return path.endsWith(".md")
    && !path.startsWith("docs/")
    && !path.startsWith("standards/")
    && name !== "README.md";
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
    if (
      !activeCompanionPackages.has(match[0])
    ) {
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
