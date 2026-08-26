import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const apiReferenceCheck = spawnSync(process.execPath, ["scripts/generate-api-reference.mjs", "--check"], { cwd: root, encoding: "utf8" });
if (apiReferenceCheck.status !== 0) {
  process.stderr.write(apiReferenceCheck.stderr || apiReferenceCheck.stdout);
  process.exit(apiReferenceCheck.status ?? 1);
}

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
  officialHands: read("docs/public/official-hands.md"),
  api: read("docs/public/api.md"),
  adapters: read("docs/public/adapters.md"),
  adapterGridCell: read("docs/public/adapter-grid-cell.md"),
  adapterInteraction: read("docs/public/adapter-interaction.md"),
  affordance: read("docs/public/affordance.md"),
  uiPrimitives: read("docs/public/ui-primitives.md"),
  affordanceSelect: read("docs/public/affordance-select.md"),
  affordanceFold: read("docs/public/affordance-fold.md"),
  affordanceDrag: read("docs/public/affordance-drag.md"),
  affordanceHistory: read("docs/public/affordance-history.md"),
  affordanceFocus: read("docs/public/affordance-focus.md"),
  affordanceCaret: read("docs/public/affordance-caret.md"),
  affordanceTypeahead: read("docs/public/affordance-typeahead.md"),
  affordanceActivate: read("docs/public/affordance-activate.md"),
  affordanceCancel: read("docs/public/affordance-cancel.md"),
  affordanceDelete: read("docs/public/affordance-delete.md"),
  affordanceRename: read("docs/public/affordance-rename.md"),
  affordanceNudge: read("docs/public/affordance-nudge.md"),
  affordanceHover: read("docs/public/affordance-hover.md"),
  affordanceDoubleClick: read("docs/public/affordance-double-click.md"),
  affordanceTripleClick: read("docs/public/affordance-triple-click.md"),
  affordanceContextMenu: read("docs/public/affordance-context-menu.md"),
  affordanceMarquee: read("docs/public/affordance-marquee.md"),
  affordanceDrop: read("docs/public/affordance-drop.md"),
  affordanceCopyDrag: read("docs/public/affordance-copy-drag.md"),
  affordanceResize: read("docs/public/affordance-resize.md"),
  affordancePan: read("docs/public/affordance-pan.md"),
  affordanceScroll: read("docs/public/affordance-scroll.md"),
  affordanceZoom: read("docs/public/affordance-zoom.md"),
  affordanceSnap: read("docs/public/affordance-snap.md"),
  affordanceForbid: read("docs/public/affordance-forbid.md"),
  connectors: read("docs/public/connectors.md"),
  reactEditing: read("docs/public/react-editing.md"),
  collaboration: read("docs/public/collaboration.md"),
  collaborationReplica: read("docs/public/collaboration-replica.md"),
  collaborationHistory: read("docs/public/collaboration-history.md"),
  collaborationText: read("docs/public/collaboration-text.md"),
  collaborationLease: read("docs/public/collaboration-lease.md"),
  collaborationLifecycle: read("docs/public/collaboration-lifecycle.md"),
  hands: read("docs/public/hands.md"),
  order: read("docs/public/order.md"),
  object: read("docs/public/object.md"),
  tree: read("docs/public/tree.md"),
  database: read("docs/public/database.md"),
  composer: read("docs/public/composer.md"),
  mention: read("docs/public/mention.md"),
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
  databaseReadme: read("packages/json-document-database/README.md"),
  annotationReadme: read("packages/json-document-annotation/README.md"),
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
const rootPackage = readJson("package.json");
const implementationShape = read("standards/repository-implementation-shape.md");
const domEditingLifecycle = read("standards/dom-editing-lifecycle.md");
const activeCompanionPackages = new Set([
  "@interactive-os/json-document-editing",
  "@interactive-os/json-document-composer",
  "@interactive-os/json-document-composer-react",
  "@interactive-os/json-document-file-intake",
  "@interactive-os/json-document-rich-text-suggestion",
  "@interactive-os/json-document-rich-text-suggestion-react",
  "@interactive-os/json-document-rich-text-mention",
  "@interactive-os/json-document-rich-text-mention-react",
  "@interactive-os/json-document-selection",
  "@interactive-os/json-document-react",
  "@interactive-os/json-document-react-hook-form",
  "@interactive-os/json-document-ajv",
  "@interactive-os/json-document-affordance",
  "@interactive-os/json-document-ui-primitives-react",
  "@interactive-os/json-document-zod",
  "@interactive-os/json-document-database",
  "@interactive-os/json-document-annotation",
  "@interactive-os/json-document-tanstack-table",
  "@interactive-os/json-document-web",
  "@interactive-os/json-document-contenteditable",
  "@interactive-os/json-document-collaboration",
  "@interactive-os/json-document-contenteditable-collaboration",
]);

if (JSON.stringify(fileNames("docs/public")) !== JSON.stringify([
  "adapter-clipboard.md",
  "adapter-contenteditable.md",
  "adapter-grid-cell.md",
  "adapter-interaction.md",
  "adapter-keyboard.md",
  "adapters.md",
  "affordance-activate.md",
  "affordance-cancel.md",
  "affordance-caret.md",
  "affordance-context-menu.md",
  "affordance-copy-drag.md",
  "affordance-delete.md",
  "affordance-double-click.md",
  "affordance-drag.md",
  "affordance-drop.md",
  "affordance-focus.md",
  "affordance-fold.md",
  "affordance-forbid.md",
  "affordance-history.md",
  "affordance-hover.md",
  "affordance-marquee.md",
  "affordance-nudge.md",
  "affordance-pan.md",
  "affordance-rename.md",
  "affordance-resize.md",
  "affordance-scroll.md",
  "affordance-select.md",
  "affordance-snap.md",
  "affordance-triple-click.md",
  "affordance-typeahead.md",
  "affordance-zoom.md",
  "affordance.md",
  "api.md",
  "clipboard.md",
  "collaboration-history.md",
  "collaboration-lease.md",
  "collaboration-lifecycle.md",
  "collaboration-replica.md",
  "collaboration-text.md",
  "collaboration.md",
  "composer.md",
  "concepts.md",
  "connector-ajv.md",
  "connector-react-hook-form.md",
  "connector-react.md",
  "connector-tanstack-table.md",
  "connector-zod-validate.md",
  "connector-zod.md",
  "connectors.md",
  "database.md",
  "hands.md",
  "history.md",
  "intent-guide.md",
  "intent.md",
  "llms.txt",
  "mention.md",
  "object.md",
  "official-hands.md",
  "order.md",
  "overview.md",
  "react-editing.md",
  "selection.md",
  "topology.md",
  "tree.md",
  "ui-primitives.md",
])) {
  fail("docs/public: only the active v3 guides and llms.txt may remain.");
}

if (JSON.stringify(fileNames("standards")) !== JSON.stringify([
  "dom-editing-lifecycle.md",
  "repository-implementation-shape.md",
  "repository-naming.md",
])) {
  fail("standards: repository naming and implementation shape must be the only repository-wide standard files.");
}

for (const token of [
  "packages/json-document-contenteditable",
  "packages/contenteditable-collaboration",
  "packages/json-document-rich-text-web",
  "createContentEditableBinding",
  "createContentEditableAdapter",
  "createRichTextContentEditableBinding",
  "beforeinput",
  "compositionstart",
  "compositionend",
  "Chromium",
  "Firefox",
  "WebKit",
]) {
  if (!domEditingLifecycle.includes(token)) {
    fail(`DOM editing lifecycle: missing required mapping ${token}.`);
  }
}

for (const workspace of rootPackage.workspaces.filter((path) => path.startsWith("packages/"))) {
  if (!implementationShape.includes(`\`${workspace}\``)) {
    fail(`implementation shape: missing library workspace classification for ${workspace}.`);
  }
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
    && name !== "README.md"
    && name !== "AGENTS.md";
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
