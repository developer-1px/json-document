import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path) {
  return existsSync(join(root, path));
}

function markdownFiles(dir = ".") {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build" || entry.name === "coverage") {
      return [];
    }

    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && path.endsWith(".md") ? [path] : [];
  });
}

function officialExtensionNames() {
  return readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "@interactive-os/json-document")
    .map((entry) => {
      const pkg = JSON.parse(read(`packages/${entry.name}/package.json`));
      return pkg.name;
    })
    .filter((name) => typeof name === "string" && name.startsWith("@interactive-os/json-document-"))
    .sort();
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const publicDocs = {
  overview: read("docs/public/overview.md"),
  quickstart: read("docs/public/quickstart.md"),
  api: read("docs/public/api.md"),
  extensions: read("docs/public/extensions.md"),
  recipes: read("docs/public/recipes.md"),
};
const generatedDocs = {
  repoCatalog: JSON.parse(read("docs/generated/repo-catalog.json")),
  extensionsCatalog: read("docs/generated/extensions-catalog.md"),
  siteRepoCatalog: read("apps/site/src/generated/repo-catalog.ts"),
};
const migrationDocs = {
  docsReadme: read("docs/README.md"),
  coreStandard: read("docs/standard/core-standard.md"),
  v2Profile: read("docs/standard/v2-projection-profile.md"),
  clipboardReadme: read("packages/clipboard-web/README.md"),
  changelog: read("docs/changelog.md"),
};
const surfaces = {
  rootReadme: read("README.md"),
  readme: read("packages/json-document/README.md"),
  spec: read("docs/standard/json-document-spec.md"),
  foundationGate: read("docs/standard/foundation-gate.md"),
  contractPressure: read("docs/standard/contract-pressure-register.md"),
  resultContract: read("docs/standard/result-contract.md"),
  selectionContract: read("docs/standard/selection-contract.md"),
  schemaIntrospectionContract: read("docs/standard/schema-introspection-contract.md"),
  selfImprovement: read("docs/standard/self-improvement-loop-report.md"),
  llms: read("llms.txt"),
  ...publicDocs,
};
const siteRoutes = JSON.parse(read("apps/site/src/site-routes.json"));
const siteHome = read("apps/site/src/routes/Home.tsx");
const siteIndex = read("apps/site/index.html");
const siteManifest = JSON.parse(read("apps/site/public/site.webmanifest"));
const docsRoute = read("apps/site/src/routes/Docs.tsx");
const packageJson = JSON.parse(read("packages/json-document/package.json"));
const publicContract = JSON.parse(read("packages/json-document/public-contract.json"));
const officialExtensions = officialExtensionNames();
const generatedOfficialExtensions = generatedDocs.repoCatalog.officialExtensions.map((item) => item.name).sort();

for (const [name, source] of Object.entries({
  rootReadme: surfaces.rootReadme,
  readme: surfaces.readme,
  llms: surfaces.llms,
  ...publicDocs,
  siteHome,
})) {
  if (/@interactive-os\/json-document\/(?:session|react)\b/.test(source)) {
    fail(`${name}: removed v2 package entrypoint is still documented.`);
  }
}

for (const removedPath of [
  "docs/release/evaluation-loop.md",
  "docs/release/notes.md",
  "docs/adoption/api-usage-gaps.md",
  "docs/review/public-api-foundation-protocol.md",
  "docs/review/public-api-foundation-report.md",
  "docs/review/extension-package-doubt-audit.md",
  "docs/review/sibling-product-extension-map.md",
  "CHANGELOG.md",
  "packages/json-document/SPEC.md",
  "apps/site/src/docs/json-document-concepts.md",
  "apps/site/src/docs/json-document-tutorial.md",
  "apps/site/src/docs/json-document-api.md",
]) {
  if (exists(removedPath)) fail(`Removed history or duplicate doc still exists: ${removedPath}`);
}

for (const path of markdownFiles()) {
  const name = path.split("/").pop();
  if (!path.startsWith("docs/") && name !== "README.md") {
    fail(`Non-README markdown must live under docs/: ${path}`);
  }
}

for (const [name, source] of Object.entries(surfaces)) {
  for (const pattern of [
    /zod-crud/,
    /@json-document\//,
  ]) {
    if (name === "llms") continue;
    if (pattern.test(source)) fail(`${name}: stale package naming found: ${pattern}`);
  }

  for (const pattern of [
    /\{\s*at\s*:/,
    /JSONDocumentPasteMode|PasteMode/,
    /\bUseJSONDocumentOptions\b|\bUseSelectionOptions\b/,
    /\bPasteOptions\b|\bPasteTarget\b/,
    /\bSelectionAction\b/,
    /\bCopyOk\b|\bCopyError\b|\bCutOk\b|\bCutError\b|\bDuplicateOk\b|\bDuplicateError\b|\bPasteError\b|\bPasteDiscriminatorMismatch\b/,
  ]) {
    if (pattern.test(source)) fail(`${name}: stale public API wording found: ${pattern}`);
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
    if (source.includes(token)) fail(`${name}: public docs must not require internal source path ${token}.`);
  }
}

for (const [name, source] of Object.entries({
  readme: surfaces.readme,
  llms: surfaces.llms,
  overview: surfaces.overview,
  quickstart: surfaces.quickstart,
  api: surfaces.api,
  extensions: surfaces.extensions,
})) {
  for (const pattern of [
    /관리자 메모/,
    /docs:evaluate/,
    /release:check/,
    /prepublishOnly/,
    /evaluation-loop/,
    /public-api-foundation/,
    /api-usage-gaps/,
    /\d+\s*\/\s*100\s*(?:loops complete|루프 완료)/,
  ]) {
    if (pattern.test(source)) fail(`${name}: maintainer history leaked into external docs: ${pattern}`);
  }
}

for (const [name, source] of Object.entries({
  readme: surfaces.readme,
  llms: surfaces.llms,
  extensions: surfaces.extensions,
})) {
  for (const token of [
    "@interactive-os/json-document-record-index",
    "@interactive-os/json-document-selection-model",
    "@interactive-os/json-document-query-watch",
  ]) {
    if (source.includes(token)) fail(`${name}: unshipped extension listed as official: ${token}.`);
  }
}

for (const route of siteRoutes) {
  for (const token of [
    "record indexes",
    "selection models",
    "query watches",
  ]) {
    if (route.description?.includes(token)) fail(`site routes: stale extension description token ${token}.`);
  }
}

for (const extensionName of officialExtensions) {
  if (!generatedDocs.extensionsCatalog.includes(`\`${extensionName}\``)) {
    fail(`generated extension catalog: shipped official extension missing: ${extensionName}.`);
  }
  if (!generatedDocs.siteRepoCatalog.includes(`"name": "${extensionName}"`)) {
    fail(`site repo catalog: shipped official extension missing: ${extensionName}.`);
  }
  if (!surfaces.llms.includes(extensionName)) {
    fail(`llms: shipped official extension missing from LLM import list: ${extensionName}.`);
  }
}

if (JSON.stringify(officialExtensions) !== JSON.stringify(generatedOfficialExtensions)) {
  fail("generated repo catalog: official extension list does not match packages/*.");
}

if (
  generatedDocs.repoCatalog.totals.officialExtensions !== officialExtensions.length
  || generatedDocs.repoCatalog.totals.labExtensions < 1
  || generatedDocs.repoCatalog.packages.length < officialExtensions.length + 1
) {
  fail("generated repo catalog: package totals are inconsistent.");
}

const required = [
  ["overview", /## 배경/],
  ["overview", /## 핵심 개념/],
  ["overview", /검색: JSONPath -> Pointer\[\]/],
  ["overview", /## 자주 쓰는 작업/],
  ["overview", /## 이걸로 할 수 있는 것들/],
  ["quickstart", /튜토리얼: 작은 카드 편집기 만들기/],
  ["quickstart", /JSONPath는 변경 언어가 아닙니다/],
  ["quickstart", /Selection, clipboard, history, DOM lifecycle/],
  ["api", /## 작업별 진입점/],
  ["api", /ReadResult/],
  ["api", /Root document Pointer는 빈 문자열 `""`/],
  ["api", /function asPointer/],
  ["api", /applyPatch[\s\S]*외부 JSON 경계/],
  ["api", /## Host와 adapter/],
  ["extensions", /@interactive-os\/json-document-collection/],
  ["extensions", /@interactive-os\/json-document-clipboard-web/],
  ["extensions", /@interactive-os\/json-document-outline/],
  ["extensions", /labs\/extensions\/\*/],
  ["extensionsCatalog", /Generated extension catalog/],
  ["extensionsCatalog", /Official extensions: \d+/],
  ["extensionsCatalog", /Lab extensions: \d+/],
  ["extensions", /Rich editor host pattern/],
  ["extensions", /origin: "prosemirror"/],
  ["extensions", /## 오해 방지/],
  ["recipes", /## Kanban/],
  ["recipes", /## Grid Table/],
  ["recipes", /## Form Builder/],
  ["recipes", /## Import Review/],
  ["recipes", /## Slide Object Editor/],
  ["recipes", /## Diagram Whiteboard/],
  ["recipes", /## Block Docs/],
  ["recipes", /## Misread Guardrails/],
  ["recipes", /stable id에서 JSON Pointer/],
  ["recipes", /TSV\/CSV grid paste/],
  ["rootReadme", /## 문서 지도/],
  ["rootReadme", /docs\/public\/overview\.md/],
  ["rootReadme", /docs\/public\/api\.md/],
  ["rootReadme", /docs\/public\/recipes\.md/],
  ["rootReadme", /## 코드 지도/],
  ["rootReadme", /packages\/json-document/],
  ["rootReadme", /apps\/site/],
  ["rootReadme", /labs\/extensions/],
  ["rootReadme", /provider-neutral/],
  ["rootReadme", /docs\/standard\/v2-projection-profile\.md/],
  ["rootReadme", /selection, clipboard, history, framework lifecycle/],
  ["docsReadme", /## 규범 우선순위/],
  ["docsReadme", /현재 v2 portable root의 정본/],
  ["coreStandard", /1\.x Candidate Editing Session migration baseline/],
  ["v2Profile", /root entrypoint 하나와 20개 Kernel symbol/],
  ["v2Profile", /Acceptance callback[\s\S]*`canPatch`[\s\S]*`commit`/],
  ["clipboardReadme", /@interactive-os\/json-document\/session/],
  ["clipboardReadme", /six-member v2 Root\s+Projection adapter/],
  ["changelog", /2\.0\.0-rc\.0[\s\S]*exactly 8 runtime values/],
  ["readme", /npm install @interactive-os\/json-document@2\.0\.0-rc\.0/],
  ["readme", /provider-neutral/],
  ["readme", /## 공개 root/],
  ["readme", /패키지는 `\/session`이나 `\/react` subpath를\s*공개하지 않습니다/],
  ["readme", /순수 core/],
  ["readme", /직렬화/],
  ["llms", /2\.0\.0-rc\.0.*Candidate/],
  ["llms", /공개 Root는 정확히 다음 20개 symbol/],
  ["llms", /JSONPath는 검색 전용/],
  ["llms", /ReadResult/],
  ["llms", /`value`는 항상\s+`JSONValue`/],
  ["llms", /not_serializable/],
  ["llms", /Acceptance는 initial state와 commit candidate/],
  ["llms", /패키지는 root entrypoint만 공개한다/],
  ["llms", /Tree[\s\S]*제품\s+의도는 host/],
  ["llms", /docs\/standard\/v2-projection-profile\.md/],
  ["llms", /docs\/standard\/v2-public-surface\.json/],
  ["llms", /v2-signature-contract\.test-d\.ts/],
  ["llms", /v2-projection-standard-conformance\.test\.ts/],
  ["llms", /v2-protocol-standard-conformance\.test\.ts/],
  ["spec", /JSONPath는 검색 언어/],
  ["spec", /duplicate\(pointer, options\)/],
  ["spec", /public-contract\.json/],
  ["contractPressure", /## Guard Composition/],
  ["contractPressure", /PatchPlan.*아직 이르다/],
  ["contractPressure", /recipe note[\s\S]*lab convention[\s\S]*official extension[\s\S]*core primitive/],
  ["contractPressure", /stable id resolver/],
  ["contractPressure", /## Loop Gate/],
  ["foundationGate", /result\/error freeze[\s\S]*docs\/standard\/result-contract\.md/],
  ["foundationGate", /selection freeze[\s\S]*docs\/standard\/selection-contract\.md/],
  ["foundationGate", /schema introspection freeze[\s\S]*docs\/standard\/schema-introspection-contract\.md/],
  ["resultContract", /## JSONResult/],
  ["resultContract", /## JSONCapabilityResult/],
  ["resultContract", /CapabilityErrorCode/],
  ["resultContract", /violations\[\]\.path/],
  ["resultContract", /diagnostic text는 `reason`/],
  ["resultContract", /discriminator_mismatch/],
  ["resultContract", /preflight_failed/],
  ["resultContract", /empty_clipboard/],
  ["resultContract", /doc\.undo\(\).*doc\.redo\(\)[\s\S]*JSONCapabilityResult/],
  ["resultContract", /schema-slot[\s\S]*document-result/],
  ["selectionContract", /SelectionSnap/],
  ["selectionContract", /selectedPointers/],
  ["selectionContract", /selectionRanges/],
  ["selectionContract", /primaryIndex/],
  ["selectionContract", /selectionAfter/],
  ["selectionContract", /SelectionMode/],
  ["selectionContract", /SelectionTextEditErrorCode|Text edit 실패 code/],
  ["selectionContract", /DOM focus/],
  ["schemaIntrospectionContract", /SchemaKind/],
  ["schemaIntrospectionContract", /SchemaPathMode/],
  ["schemaIntrospectionContract", /schema-slot/],
  ["schemaIntrospectionContract", /document-result/],
  ["schemaIntrospectionContract", /SchemaDescription/],
  ["schemaIntrospectionContract", /jsonSchema/],
  ["schemaIntrospectionContract", /JSONCapabilityResult/],
  ["selfImprovement", /10회 루프 완료 기록/],
  ["selfImprovement", /Result\/error code freeze/],
  ["selfImprovement", /Selection semantics freeze/],
  ["selfImprovement", /Schema introspection freeze/],
  ["selfImprovement", /1\.0 전 Core 금지 목록/],
];

for (const [name, pattern] of required) {
  const source = surfaces[name] ?? generatedDocs[name] ?? migrationDocs[name];
  if (!pattern.test(source)) fail(`${name}: missing ${pattern}.`);
}

if (
  JSON.stringify(Object.keys(publicContract)) !== JSON.stringify(["root"])
  || publicContract.root.values.length !== 8
  || publicContract.root.types.length !== 12
  || !publicContract.root.values.includes("createJSONDocument")
) {
  fail("public contract: v2 root must be the only 20-symbol entrypoint.");
}

if (
  packageJson.homepage !== "https://developer-1px.github.io/json-document/"
  || packageJson.repository?.url !== "git+https://github.com/developer-1px/json-document.git"
  || packageJson.repository?.directory !== "packages/json-document"
  || packageJson.bugs?.url !== "https://github.com/developer-1px/json-document/issues"
) {
  fail("package metadata: missing official site, repository, or issue tracker URL.");
}

for (const route of [
  ["/docs", "json-document Docs - json-document"],
  ["/docs/tutorial", "Tutorial - json-document"],
  ["/docs/api", "json-document API - json-document"],
  ["/docs/extensions", "Extensions - json-document"],
  ["/docs/recipes", "Product Recipes - json-document"],
]) {
  if (!siteRoutes.some((item) => item.path === route[0] && item.title === route[1])) {
    fail(`site routes: missing ${route[0]} ${route[1]} metadata.`);
  }
}

for (const pattern of [
  /Provider-neutral JSON editing/,
  /six-member document projection/,
  /npm install @interactive-os\/json-document@2\.0\.0-rc\.0/,
  /Rich editing belongs to host adapters/,
]) {
  if (!pattern.test(siteHome)) fail(`site home: missing ${pattern}.`);
}
for (const pattern of [
  /Zod-guarded JSON editing/,
  /npm install @interactive-os\/json-document zod/,
]) {
  if (pattern.test(siteHome)) fail(`site home: stale v1 root wording found: ${pattern}.`);
}
const rootRoute = siteRoutes.find((route) => route.path === "/");
if (
  !rootRoute?.description.includes("Provider-neutral JSON editing protocol")
  || !rootRoute.description.includes("six-member headless document projection")
) {
  fail("site routes: root metadata must describe the v2 Kernel and Projection.");
}
if (
  siteIndex.split(rootRoute.description).length - 1 !== 3
  || siteManifest.description !== "Provider-neutral JSON editing protocol and headless document projection."
) {
  fail("site metadata: base HTML and manifest must describe the v2 Kernel and Projection.");
}

for (const pattern of [
  /\.\.\/\.\.\/\.\.\/\.\.\/docs\/public\/overview\.md\?raw/,
  /\.\.\/\.\.\/\.\.\/\.\.\/docs\/public\/quickstart\.md\?raw/,
  /\.\.\/\.\.\/\.\.\/\.\.\/docs\/public\/api\.md\?raw/,
  /\.\.\/\.\.\/\.\.\/\.\.\/docs\/public\/extensions\.md\?raw/,
  /\.\.\/\.\.\/\.\.\/\.\.\/docs\/public\/recipes\.md\?raw/,
  /\.\.\/\.\.\/\.\.\/\.\.\/docs\/generated\/extensions-catalog\.md\?raw/,
  /Documentation pages/,
  /On this page/,
]) {
  if (!pattern.test(docsRoute)) fail(`site docs route: missing ${pattern}.`);
}

console.log("docs evaluation ok");
