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

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requirePattern(name, source, pattern) {
  if (!pattern.test(source)) fail(`${name}: missing ${pattern}.`);
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
const profile = read("docs/standard/v2-projection-profile.md");
const publicSurface = readJson("docs/standard/v2-public-surface.json");
const publicContract = readJson("packages/json-document/public-contract.json");
const packageJson = readJson("packages/json-document/package.json");
const generatedCatalog = readJson("docs/generated/repo-catalog.json");
const siteRoutes = readJson("apps/site/src/site-routes.json");
const siteHome = read("apps/site/src/routes/Home.tsx");
const docsRoute = read("apps/site/src/routes/Docs.tsx");

const expectedPublicValues = [
  "appendSegment",
  "applyPatch",
  "buildPointer",
  "createJSONDocument",
  "parentPointer",
  "parsePointer",
  "trackPointer",
  "tryParsePointer",
];
const expectedPublicTypes = [
  "JSONAppliedChange",
  "JSONCapabilityResult",
  "JSONChangeMetadata",
  "JSONDocument",
  "JSONDocumentCommitOptions",
  "JSONDocumentCommitResult",
  "JSONPatchOperation",
  "JSONPatchResult",
  "JSONValue",
  "Pointer",
  "QueryResult",
  "ReadResult",
];
const activeCompanionPackages = new Set([
  "@interactive-os/json-document-collaboration",
  "@interactive-os/json-document-contenteditable-collaboration",
]);

if (JSON.stringify(fileNames("docs/public")) !== JSON.stringify([
  "api.md",
  "overview.md",
  "quickstart.md",
])) {
  fail("docs/public: only the three active v2 guides may remain.");
}

if (JSON.stringify(fileNames("docs/standard")) !== JSON.stringify([
  "concept-and-naming-standard.md",
  "v2-projection-profile.md",
  "v2-public-surface.json",
])) {
  fail("docs/standard: naming SSOT, v2 profile, and machine-readable surface must be the only active standards.");
}

if (JSON.stringify(fileNames("docs/generated")) !== JSON.stringify([
  "repo-catalog.json",
])) {
  fail("docs/generated: unexpected generated artifact.");
}

for (const path of [
  "archive/v1/docs/changelog.md",
  "archive/v1/docs/public/extensions.md",
  "archive/v1/docs/public/recipes.md",
  "archive/v1/docs/research/de-facto-editing-feature-taxonomy.md",
  "archive/v1/docs/standard/conformance-profile.md",
  "archive/v1/docs/standard/contract-pressure-register.md",
  "archive/v1/docs/standard/core-standard.md",
  "archive/v1/docs/standard/extension-delegation-standard.md",
  "archive/v1/docs/standard/foundation-gate.md",
  "archive/v1/docs/standard/json-document-spec.md",
  "archive/v1/docs/standard/public-api-layering.md",
  "archive/v1/docs/standard/result-contract.md",
  "archive/v1/docs/standard/schema-introspection-contract.md",
  "archive/v1/docs/standard/selection-contract.md",
  "archive/v1/docs/standard/self-improvement-loop-report.md",
]) {
  if (!exists(path)) fail(`archive: missing preserved v1 document ${path}.`);
}

for (const path of [
  "docs/public/extensions.md",
  "docs/public/recipes.md",
  "docs/research",
  "docs/standard/conformance-profile.md",
  "docs/standard/core-standard.md",
  "docs/standard/json-document-spec.md",
  "apps/site/src/generated/repo-catalog.ts",
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
        `${name}: archived json-document extension is still documented as current: ${match[0]}.`,
      );
    }
  }
  if (/\blabs\/extensions\b/.test(source)) {
    fail(`${name}: archived lab path is still documented as current.`);
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
  ["packageReadme", surfaces.packageReadme, /npm install @interactive-os\/json-document@2\.0\.0/],
  ["packageReadme", surfaces.packageReadme, /패키지는 `\/session`이나 `\/react` subpath를\s*공개하지 않습니다/],
  ["collaborationReadme", surfaces.collaborationReadme, /same six-member\s+`JSONDocument` API/],
  ["collaborationReadme", surfaces.collaborationReadme, /Concept and Naming Standard/],
  ["collaborationReadme", surfaces.collaborationReadme, /contains no transport, presence,\s*storage, DOM, React, or server dependency/],
  ["contenteditableCollaborationReadme", surfaces.contenteditableCollaborationReadme, /IME-safe native-input DOM lease/],
  ["contenteditableCollaborationReadme", surfaces.contenteditableCollaborationReadme, /Concept and Naming Standard/],
  ["contenteditableCollaborationReadme", surfaces.contenteditableCollaborationReadme, /does not activate or depend on the archived 1\.x DOM adapters/],
  ["llms", surfaces.llms, /2\.0\.0.*Stable/],
  ["llms", surfaces.llms, /공개 Root는 정확히 다음 20개 symbol/],
  ["llms", surfaces.llms, /## Host adapter와 companion/],
  ["llms", surfaces.llms, /@interactive-os\/json-document-collaboration/],
  ["llms", surfaces.llms, /@interactive-os\/json-document-contenteditable-collaboration/],
  ["llms", surfaces.llms, /@interactive-os\/editable/],
  ["profile", profile, /root entrypoint 하나와 20개 Kernel symbol/],
  ["profile", profile, /Acceptance callback[\s\S]*`canPatch`[\s\S]*`commit`/],
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
  ["namingStandard", namingStandard, /## 현재 이름 평가/],
  ["namingStandard", namingStandard, /## v2 compatibility map/],
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

for (const packageEntry of generatedCatalog.packages ?? []) {
  for (const publicExport of packageEntry.publicExports ?? []) {
    if (!namingStandard.includes(`\`${publicExport}\``)) {
      fail(
        `naming standard: ${packageEntry.name} public export is unclassified: ${publicExport}.`,
      );
    }
  }
}

if (
  JSON.stringify(Object.keys(publicContract)) !== JSON.stringify(["root"])
  || JSON.stringify(publicContract.root.values) !== JSON.stringify(expectedPublicValues)
  || JSON.stringify(publicContract.root.types) !== JSON.stringify(expectedPublicTypes)
) {
  fail("public contract: v2 root must be the only exact 20-symbol entrypoint.");
}

if (
  JSON.stringify(publicSurface.binding?.values) !== JSON.stringify(expectedPublicValues)
  || JSON.stringify(publicSurface.binding?.types) !== JSON.stringify(expectedPublicTypes)
) {
  fail("v2 machine surface: package contract and standard manifest disagree.");
}

if (
  JSON.stringify(Object.keys(packageJson.exports ?? {})) !== JSON.stringify(["."])
  || packageJson.peerDependencies !== undefined
  || packageJson.homepage !== "https://developer-1px.github.io/json-document/"
  || packageJson.repository?.directory !== "packages/json-document"
) {
  fail("package metadata: v2 must ship one dependency-free root entrypoint.");
}

const generatedCore = generatedCatalog.packages?.[0];
const generatedCollaboration = generatedCatalog.packages?.[1];
const generatedContenteditableCollaboration = generatedCatalog.packages?.[2];
const generatedExports = [...expectedPublicValues, ...expectedPublicTypes].sort();
if (
  generatedCatalog.schemaVersion !== 1
  || generatedCatalog.packages?.length !== 3
  || generatedCore?.path !== "packages/json-document"
  || generatedCore?.name !== "@interactive-os/json-document"
  || generatedCore?.status !== "core"
  || JSON.stringify(generatedCore?.entrypoints) !== JSON.stringify(["."])
  || JSON.stringify(generatedCore?.publicExports) !== JSON.stringify(generatedExports)
  || generatedCore?.publicExportCount !== 20
  || generatedCollaboration?.path !== "packages/json-document-collaboration"
  || generatedCollaboration?.name
    !== "@interactive-os/json-document-collaboration"
  || generatedCollaboration?.status !== "companion"
  || JSON.stringify(generatedCollaboration?.entrypoints)
    !== JSON.stringify([".", "./history", "./text"])
  || generatedCollaboration?.publicExportCount !== 40
  || generatedContenteditableCollaboration?.path
    !== "packages/contenteditable-collaboration"
  || generatedContenteditableCollaboration?.name
    !== "@interactive-os/json-document-contenteditable-collaboration"
  || generatedContenteditableCollaboration?.status !== "companion"
  || JSON.stringify(generatedContenteditableCollaboration?.entrypoints)
    !== JSON.stringify(["."])
  || generatedContenteditableCollaboration?.publicExportCount !== 7
  || generatedCatalog.officialExtensions !== undefined
  || generatedCatalog.labExtensions !== undefined
  || generatedCatalog.apps !== undefined
  || JSON.stringify(generatedCatalog.totals) !== JSON.stringify({
    packages: 3,
    core: 1,
    companions: 2,
  })
) {
  fail("generated catalog: active scope must contain one v2 Core and two exact companions.");
}

const expectedRoutePaths = ["/", "/docs", "/docs/tutorial", "/docs/api"];
if (
  JSON.stringify(siteRoutes.map((route) => route.path)) !== JSON.stringify(expectedRoutePaths)
  || siteRoutes.some((route) => route.group !== "Start")
) {
  fail("site routes: the public site must expose only the v2 core routes.");
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
  /docs\/generated/,
  /\/docs\/extensions/,
  /\/docs\/recipes/,
]) {
  if (pattern.test(docsRoute)) fail(`site docs route: archived surface remains: ${pattern}.`);
}

for (const pattern of [
  /Implementation-neutral JSON editing/,
  /six-member JSON Document/,
  /npm install @interactive-os\/json-document@2\.0\.0/,
  /Rich editing belongs to host adapters/,
]) {
  requirePattern("site home", siteHome, pattern);
}

console.log("docs evaluation ok");
