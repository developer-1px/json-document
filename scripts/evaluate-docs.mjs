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
const surfaces = {
  rootReadme: read("README.md"),
  packageReadme: read("packages/json-document/README.md"),
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

if (JSON.stringify(fileNames("docs/public")) !== JSON.stringify([
  "api.md",
  "overview.md",
  "quickstart.md",
])) {
  fail("docs/public: only the three active v2 guides may remain.");
}

if (JSON.stringify(fileNames("docs/standard")) !== JSON.stringify([
  "v2-projection-profile.md",
  "v2-public-surface.json",
])) {
  fail("docs/standard: only the v2 profile and machine-readable surface may remain active.");
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
  if (/@interactive-os\/json-document-[a-z0-9-]+\b/.test(source)) {
    fail(`${name}: archived json-document extension is still documented as current.`);
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
  ["rootReadme", surfaces.rootReadme, /## 문서 지도/],
  ["rootReadme", surfaces.rootReadme, /docs\/public\/overview\.md/],
  ["rootReadme", surfaces.rootReadme, /docs\/public\/api\.md/],
  ["rootReadme", surfaces.rootReadme, /## 코드 지도/],
  ["rootReadme", surfaces.rootReadme, /packages\/json-document/],
  ["rootReadme", surfaces.rootReadme, /@interactive-os\/editable/],
  ["overview", surfaces.overview, /## 배경/],
  ["overview", surfaces.overview, /## 핵심 개념/],
  ["overview", surfaces.overview, /검색: JSONPath -> Pointer\[\]/],
  ["overview", surfaces.overview, /## Host adapter와 companion/],
  ["overview", surfaces.overview, /@interactive-os\/editable/],
  ["quickstart", surfaces.quickstart, /튜토리얼: 작은 카드 편집기 만들기/],
  ["quickstart", surfaces.quickstart, /JSONPath는 변경 언어가 아닙니다/],
  ["quickstart", surfaces.quickstart, /Selection, clipboard, history, DOM lifecycle/],
  ["api", surfaces.api, /## 작업별 진입점/],
  ["api", surfaces.api, /ReadResult/],
  ["api", surfaces.api, /Root document Pointer는 빈 문자열 `""`/],
  ["api", surfaces.api, /function asPointer/],
  ["api", surfaces.api, /## Host와 adapter/],
  ["packageReadme", surfaces.packageReadme, /npm install @interactive-os\/json-document@2\.0\.0-rc\.0/],
  ["packageReadme", surfaces.packageReadme, /패키지는 `\/session`이나 `\/react` subpath를\s*공개하지 않습니다/],
  ["llms", surfaces.llms, /2\.0\.0-rc\.0.*Candidate/],
  ["llms", surfaces.llms, /공개 Root는 정확히 다음 20개 symbol/],
  ["llms", surfaces.llms, /## Host adapter와 companion/],
  ["llms", surfaces.llms, /@interactive-os\/editable/],
  ["profile", profile, /root entrypoint 하나와 20개 Kernel symbol/],
  ["profile", profile, /Acceptance callback[\s\S]*`canPatch`[\s\S]*`commit`/],
];

for (const [name, source, pattern] of required) {
  requirePattern(name, source, pattern);
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
const generatedExports = [...expectedPublicValues, ...expectedPublicTypes].sort();
if (
  generatedCatalog.schemaVersion !== 1
  || generatedCatalog.packages?.length !== 1
  || generatedCore?.path !== "packages/json-document"
  || generatedCore?.name !== "@interactive-os/json-document"
  || generatedCore?.status !== "core"
  || JSON.stringify(generatedCore?.publicExports) !== JSON.stringify(generatedExports)
  || generatedCore?.publicExportCount !== 20
  || generatedCatalog.officialExtensions !== undefined
  || generatedCatalog.labExtensions !== undefined
  || generatedCatalog.apps !== undefined
  || JSON.stringify(generatedCatalog.totals) !== JSON.stringify({
    packages: 1,
  })
) {
  fail("generated catalog: release scope must contain the v2 core package only.");
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
  /Provider-neutral JSON editing/,
  /six-member document projection/,
  /npm install @interactive-os\/json-document@2\.0\.0-rc\.0/,
  /Rich editing belongs to host adapters/,
]) {
  requirePattern("site home", siteHome, pattern);
}

console.log("docs evaluation ok");
