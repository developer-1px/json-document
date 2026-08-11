import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function exists(path) {
  return existsSync(join(root, path));
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
      const child = `${path}/${entry.name}`;
      return entry.isDirectory() ? filesUnder(child) : [child];
    });
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requirePattern(name, source, pattern) {
  if (!pattern.test(source)) fail(`${name}: missing ${pattern}.`);
}

function exportNames(source) {
  const names = new Set();

  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([\s\S]*?)\}/g)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }

  return [...names].sort();
}

const publicDocs = {
  overview: read("docs/public/overview.md"),
  quickstart: read("docs/public/quickstart.md"),
  api: read("docs/public/api.md"),
};
const docsReadme = read("docs/README.md");
const namingStandard = read("docs/standard/concept-and-naming-standard.md");
const surfaces = {
  rootReadme: read("README.md"),
  docsReadme,
  packageReadme: read("packages/json-document/README.md"),
  collaborationReadme: read("packages/json-document-collaboration/README.md"),
  contenteditableCollaborationReadme: read(
    "packages/contenteditable-collaboration/README.md",
  ),
  llms: read("llms.txt"),
  ...publicDocs,
};
const profile = read("docs/standard/v3-json-document-profile.md");
const publicContract = readJson("packages/json-document/public-contract.json");
const rootPackageJson = readJson("package.json");
const corePackageJson = readJson("packages/json-document/package.json");
const collaborationPackageJson = readJson(
  "packages/json-document-collaboration/package.json",
);
const contenteditablePackageJson = readJson(
  "packages/contenteditable-collaboration/package.json",
);
const coreExports = exportNames(
  read("packages/json-document/src/application/document/index.ts"),
);
const collaborationExports = exportNames(
  read("packages/json-document-collaboration/src/index.ts"),
);
const contenteditableExports = exportNames(
  read("packages/contenteditable-collaboration/src/index.ts"),
);
const siteRoutes = readJson("apps/site/src/site-routes.json");
const siteHome = read("apps/site/src/routes/Home.tsx");
const docsRoute = read("apps/site/src/routes/Docs.tsx");
const namingImplementation = {
  coreDocument: read("packages/json-document/src/domain/json-document/create.ts"),
  coreContract: read(
    "packages/json-document/src/application/document/contract.ts",
  ),
  collaborationTypes: read(
    "packages/json-document-collaboration/src/types.ts",
  ),
  collaborationRuntime: read(
    "packages/json-document-collaboration/src/create.ts",
  ),
  historyEntrypoint: read(
    "packages/json-document-collaboration/src/history-index.ts",
  ),
  textEntrypoint: read(
    "packages/json-document-collaboration/src/text-index.ts",
  ),
  contenteditableTypes: read(
    "packages/contenteditable-collaboration/src/types.ts",
  ),
  contenteditableEntrypoint: read(
    "packages/contenteditable-collaboration/src/index.ts",
  ),
};

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

for (const path of [
  "docs/public/extensions.md",
  "docs/public/recipes.md",
  "docs/research",
  "docs/standard/conformance-profile.md",
  "docs/standard/core-standard.md",
  "docs/standard/json-document-spec.md",
]) {
  if (exists(path)) fail(`core-only docs: legacy surface still active at ${path}.`);
}

for (const [name, source] of Object.entries({
  ...surfaces,
  siteHome,
  docsRoute,
})) {
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

const required = [
  ["rootReadme", surfaces.rootReadme, /docs\/standard\/concept-and-naming-standard\.md/],
  ["rootReadme", surfaces.rootReadme, /## 문서 지도/],
  ["rootReadme", surfaces.rootReadme, /docs\/public\/overview\.md/],
  ["rootReadme", surfaces.rootReadme, /docs\/public\/api\.md/],
  ["rootReadme", surfaces.rootReadme, /## 코드 지도/],
  ["rootReadme", surfaces.rootReadme, /packages\/json-document/],
  ["rootReadme", surfaces.rootReadme, /packages\/json-document-collaboration/],
  ["rootReadme", surfaces.rootReadme, /packages\/contenteditable-collaboration/],
  ["rootReadme", surfaces.rootReadme, /@interactive-os\/editable/],
  ["overview", surfaces.overview, /## 배경/],
  ["overview", surfaces.overview, /## 핵심 개념/],
  ["overview", surfaces.overview, /Concept and Naming Standard/],
  ["overview", surfaces.overview, /검색: JSONPath -> Pointer\[\]/],
  ["overview", surfaces.overview, /## Host adapter와 companion/],
  ["overview", surfaces.overview, /@interactive-os\/json-document-collaboration/],
  ["overview", surfaces.overview, /@interactive-os\/json-document-contenteditable-collaboration/],
  ["overview", surfaces.overview, /@interactive-os\/editable/],
  ["quickstart", surfaces.quickstart, /튜토리얼: 작은 카드 편집기 만들기/],
  ["quickstart", surfaces.quickstart, /JSONPath는 변경 언어가 아닙니다/],
  ["quickstart", surfaces.quickstart, /Selection, clipboard, history, DOM lifecycle/],
  ["api", surfaces.api, /## 작업별 진입점/],
  ["api", surfaces.api, /ReadResult/],
  ["api", surfaces.api, /Root document Pointer는 빈 문자열 `""`/],
  ["api", surfaces.api, /function asPointer/],
  ["api", surfaces.api, /## Host와 adapter/],
  ["packageReadme", surfaces.packageReadme, /npm install @interactive-os\/json-document@3\.0\.0/],
  ["packageReadme", surfaces.packageReadme, /패키지는 `\/session`이나 `\/react` subpath를\s*공개하지 않습니다/],
  ["collaborationReadme", surfaces.collaborationReadme, /same six-member\s+`JSONDocument` API/],
  ["collaborationReadme", surfaces.collaborationReadme, /Concept and Naming Standard/],
  ["collaborationReadme", surfaces.collaborationReadme, /contains no transport, presence,\s*storage, DOM, React, or server dependency/],
  ["contenteditableCollaborationReadme", surfaces.contenteditableCollaborationReadme, /IME-safe native-input DOM lease/],
  ["contenteditableCollaborationReadme", surfaces.contenteditableCollaborationReadme, /Concept and Naming Standard/],
  ["llms", surfaces.llms, /v3 표준 상태는 Stable/],
  ["llms", surfaces.llms, /release version은 `3\.0\.0`/],
  ["llms", surfaces.llms, /공개 Root는 정확히 다음 21개 symbol/],
  ["llms", surfaces.llms, /## Host adapter와 companion/],
  ["llms", surfaces.llms, /@interactive-os\/json-document-collaboration/],
  ["llms", surfaces.llms, /@interactive-os\/json-document-contenteditable-collaboration/],
  ["llms", surfaces.llms, /@interactive-os\/editable/],
  ["profile", profile, /root entrypoint 하나와 21개 symbol/],
  ["profile", profile, /Validation callback[\s\S]*`validatePatch`[\s\S]*`commit`/],
  ["profile", profile, /Concept and Naming Standard/],
  ["docsReadme", docsReadme, /concept-and-naming-standard\.md/],
  ["namingStandard", namingStandard, /상태: Canonical/],
  ["namingStandard", namingStandard, /## 이름 권위/],
  ["namingStandard", namingStandard, /## 개념 경계/],
  ["namingStandard", namingStandard, /## 접두어와 casing/],
  ["namingStandard", namingStandard, /## 접미어/],
  ["namingStandard", namingStandard, /## Operation과 Change/],
  ["namingStandard", namingStandard, /## 함수 동사/],
  ["namingStandard", namingStandard, /## Boolean/],
  ["namingStandard", namingStandard, /## Collection과 축약/],
  ["namingStandard", namingStandard, /## 파일과 경로/],
  ["namingStandard", namingStandard, /## 현재 이름 평가/],
  ["namingStandard", namingStandard, /## Protocol vocabulary boundary/],
  ["namingStandard", namingStandard, /## 새 concept admission/],
  ["namingStandard", namingStandard, /runtime logic, protocol semantics 또는 wire behavior/],
];

for (const [name, source, pattern] of required) {
  requirePattern(name, source, pattern);
}

for (const [name, source] of Object.entries({
  rootReadme: surfaces.rootReadme,
  overview: surfaces.overview,
  packageReadme: surfaces.packageReadme,
  siteHome,
})) {
  for (const deprecatedConcept of [
    "Pure Protocol",
    "Document Projection",
    "document projection",
    "local provider",
    "collaboration provider",
    "DOM publication lease",
  ]) {
    if (source.includes(deprecatedConcept)) {
      fail(`${name}: deprecated canonical concept remains: ${deprecatedConcept}.`);
    }
  }
}

for (const term of [
  "JSON value",
  "JSON Pointer",
  "JSONPath",
  "JSON Patch",
  "JSON Document",
  "patch validation",
  "change notification",
  "collaboration engine",
  "replica status",
  "checkpoint",
  "compaction",
  "selective undo",
  "text splice",
  "DOM adapter",
  "native-input DOM lease",
]) {
  if (!namingStandard.includes(term)) {
    fail(`naming standard: missing canonical term ${term}.`);
  }
}

for (const restrictedSuffix of [
  "Control",
  "Manager",
  "Helper",
  "Util",
  "Common",
  "Misc",
  "Data",
  "Info",
]) {
  if (!namingStandard.includes(restrictedSuffix)) {
    fail(`naming standard: missing restricted suffix ${restrictedSuffix}.`);
  }
}

for (const [path, forbiddenName] of [
  ["packages/json-document/src/domain/projection/index.ts", "projection path"],
  ["packages/json-document/src/domain/json-document", null],
]) {
  if (forbiddenName === null && !exists(path)) {
    fail(`naming implementation: missing canonical path ${path}.`);
  }
  if (forbiddenName !== null && exists(path)) {
    fail(`naming implementation: deprecated ${forbiddenName} remains at ${path}.`);
  }
}

for (const path of filesUnder("packages")) {
  const name = path.split("/").at(-1);
  if (
    path.includes("/src/")
    && name?.endsWith(".ts")
    && /[a-z][A-Z]/.test(name)
  ) {
    fail(`naming implementation: module filename must be kebab-case: ${path}.`);
  }
}

const forbiddenLegacyIdentifiers = [
  "JSONCapabilityResult",
  "canPatch",
  "accepts",
  "CollaborationControl",
  "CollaborationSnapshot",
  "CollaborationAcceptance",
  "CollaborationHistory",
  "CollaborationText",
  "CollaborationContentEditable",
  "projectionChanged",
  "nextAccepts",
  "discardedHistoryControls",
];
for (const path of filesUnder("packages")) {
  if (!path.includes("/src/") || !path.endsWith(".ts")) continue;
  const source = read(path);
  for (const identifier of forbiddenLegacyIdentifiers) {
    if (source.includes(identifier)) {
      fail(`naming implementation: legacy identifier remains in ${path}: ${identifier}.`);
    }
  }
}

for (const [name, source] of Object.entries(namingImplementation)) {
  for (const forbiddenInternal of [
    "createProjection",
    "publicationQueue",
    "enqueuePublication",
    "acceptCandidate",
    "evaluatingAcceptance",
  ]) {
    if (source.includes(forbiddenInternal)) {
      fail(`${name}: deprecated internal identifier remains: ${forbiddenInternal}.`);
    }
  }
}

for (const [name, source, pattern] of [
  ["core contract", namingImplementation.coreContract, /JSONPatchValidationResult/],
  ["core contract", namingImplementation.coreContract, /validatePatch/],
  ["collaboration types", namingImplementation.collaborationTypes, /CollaborationReplica/],
  ["collaboration types", namingImplementation.collaborationTypes, /ReplicaStatus/],
  ["collaboration runtime", namingImplementation.collaborationRuntime, /replica:/],
  ["history entrypoint", namingImplementation.historyEntrypoint, /createHistoryRuntime/],
  ["text entrypoint", namingImplementation.textEntrypoint, /createTextRuntime/],
  ["contenteditable types", namingImplementation.contenteditableTypes, /TextDOMAdapter/],
  ["contenteditable entrypoint", namingImplementation.contenteditableEntrypoint, /createContentEditableAdapter/],
]) {
  requirePattern(name, source, pattern);
}

for (const packageEntry of [
  { name: corePackageJson.name, publicExports: coreExports },
  { name: collaborationPackageJson.name, publicExports: collaborationExports },
  { name: contenteditablePackageJson.name, publicExports: contenteditableExports },
]) {
  for (const publicExport of packageEntry.publicExports) {
    if (!namingStandard.includes(`\`${publicExport}\``)) {
      fail(
        `naming standard: ${packageEntry.name} public export is unclassified: ${publicExport}.`,
      );
    }
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

if (
  JSON.stringify(rootPackageJson.workspaces) !== JSON.stringify([
    "packages/json-document",
    "packages/json-document-collaboration",
    "packages/contenteditable-collaboration",
    "apps/site",
  ])
  || corePackageJson.name !== "@interactive-os/json-document"
  || JSON.stringify(Object.keys(corePackageJson.exports ?? {}))
    !== JSON.stringify(["."])
  || corePackageJson.peerDependencies !== undefined
  || corePackageJson.homepage !== "https://developer-1px.github.io/json-document/"
  || corePackageJson.repository?.directory !== "packages/json-document"
) {
  fail("package metadata: active workspaces and the dependency-free v3 Core drifted.");
}

const expectedCoreExports = [
  ...publicContract.root.values,
  ...publicContract.root.types,
].sort();
if (
  JSON.stringify(coreExports) !== JSON.stringify(expectedCoreExports)
  || collaborationPackageJson.name
    !== "@interactive-os/json-document-collaboration"
  || JSON.stringify(Object.keys(collaborationPackageJson.exports ?? {}))
    !== JSON.stringify([".", "./history", "./text"])
  || collaborationPackageJson.peerDependencies?.["@interactive-os/json-document"]
    !== "^3.0.0"
  || collaborationExports.length !== 40
  || contenteditablePackageJson.name
    !== "@interactive-os/json-document-contenteditable-collaboration"
  || JSON.stringify(Object.keys(contenteditablePackageJson.exports ?? {}))
    !== JSON.stringify(["."])
  || contenteditablePackageJson.peerDependencies?.["@interactive-os/json-document"]
    !== "^3.0.0"
  || contenteditablePackageJson.peerDependencies?.[
    "@interactive-os/json-document-collaboration"
  ] !== "^0.2.0-rc.1"
  || contenteditableExports.length !== 7
) {
  fail("package surfaces: active scope must contain one v3 Core and two exact companions.");
}

if (
  siteRoutes.length === 0
  || new Set(siteRoutes.map((route) => route.path)).size !== siteRoutes.length
  || siteRoutes.some((route) => !route.path.startsWith("/"))
  || siteRoutes.some((route) => route.group !== "Start")
) {
  fail("site routes: the route contract must contain unique absolute Start routes.");
}

for (const pattern of [
  /docs\/public\/overview\.md\?raw/,
  /docs\/public\/quickstart\.md\?raw/,
  /docs\/public\/api\.md\?raw/,
  /Documentation pages/,
  /On this page/,
]) {
  requirePattern("site docs route", docsRoute, pattern);
}

for (const pattern of [
  /docs\/public\/extensions\.md/,
  /docs\/public\/recipes\.md/,
  /\/docs\/extensions/,
  /\/docs\/recipes/,
]) {
  if (pattern.test(docsRoute)) fail(`site docs route: removed surface remains: ${pattern}.`);
}

for (const pattern of [
  /Implementation-neutral JSON editing/,
  /six-member JSON Document/,
  /Rich editing belongs to host adapters/,
]) {
  requirePattern("site home", siteHome, pattern);
}

console.log("docs evaluation ok");
