import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { apiReferenceCoverageErrors, apiReferencePackages } from "../docs/api-reference/packages.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes("--check");
const configPath = join(root, "tsconfig.build.json");
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const entrypoints = apiReferencePackages.flatMap(({ entrypoint, subpaths }) => [entrypoint, ...subpaths.map((subpath) => subpath.entrypoint)]).map((entrypoint) => join(root, entrypoint));
const sourcePaths = Object.fromEntries(apiReferencePackages.flatMap((descriptor) =>
  [descriptor, ...descriptor.subpaths].map(({ packageName, entrypoint }) => [packageName, [entrypoint]])));
const program = ts.createProgram([...new Set([...parsed.fileNames, ...entrypoints])], {
  ...parsed.options,
  baseUrl: root,
  paths: sourcePaths,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  noEmit: true,
});
const checker = program.getTypeChecker();
const manifests = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).workspaces
  .map((workspace) => JSON.parse(readFileSync(join(root, workspace, "package.json"), "utf8")));
const failures = apiReferenceCoverageErrors(manifests);
let exportCount = 0;
const siteRoutes = JSON.parse(readFileSync(join(root, "site/site-routes.json"), "utf8"));

function display(symbol, entry) {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaration = target.valueDeclaration ?? target.declarations?.[0] ?? entry;
  const declared = target.declarations?.find((candidate) =>
    ts.isInterfaceDeclaration(candidate)
    || ts.isTypeAliasDeclaration(candidate)
    || ts.isClassDeclaration(candidate)
    || ts.isEnumDeclaration(candidate),
  );
  if (declared !== undefined) return clean(declared.getText());
  const type = checker.getTypeOfSymbolAtLocation(target, declaration);
  const calls = type.getCallSignatures();
  if (calls.length > 0) {
    const signatures = clean(calls.map((signature) => `${symbol.name}${checker.signatureToString(signature, declaration)}`).join("\n"));
    if (/^[A-Z]/.test(symbol.name) && signatures.length > 1000) {
      return signatures.replace(/\):[\s\S]*$/, "): React.ReactElement");
    }
    return signatures;
  }
  if (target.flags & ts.SymbolFlags.Class) return `class ${symbol.name}`;
  if (target.flags & ts.SymbolFlags.Enum) return `enum ${symbol.name}`;
  return clean(`${target.flags & ts.SymbolFlags.Variable ? "const" : "export"} ${symbol.name}: ${checker.typeToString(type, declaration)}`);
}

function clean(signature) {
  return signature
    .replaceAll(root, "<repository>")
    .replace(/import\("<repository>\/node_modules\/@types\/react\/index"\)/g, "React")
    .replace(/import\("<repository>\/node_modules\/csstype\/index"\)/g, "CSS")
    .replace(/^export\s+/gm, "")
    .replace(/^declare\s+/gm, "")
    .trim();
}

for (const descriptor of apiReferencePackages) {
  const referencePath = `/docs/api/${descriptor.slug}`;
  const referenceRoutes = siteRoutes.filter((route) =>
    route.path === referencePath
    && route.navigationGroup === descriptor.navigationGroup
    && route.documentSource === `docs/api-reference/${descriptor.slug}.md`);
  if (referenceRoutes.length !== 1) failures.push(`${descriptor.packageName} owner reference route`);
  const entry = program.getSourceFile(join(root, descriptor.entrypoint));
  if (!entry) throw new Error(`public entrypoint를 찾을 수 없습니다: ${descriptor.entrypoint}`);
  const moduleSymbol = checker.getSymbolAtLocation(entry);
  const exports = checker.getExportsOfModule(moduleSymbol).filter((symbol) => symbol.name !== "default").sort((a, b) => a.name.localeCompare(b.name));
  exportCount += exports.length;
  const sections = exports.map((symbol) => [
    `## \`${symbol.name}\``,
    "",
    "```ts",
    display(symbol, entry),
    "```",
  ].join("\n"));
  for (const subpath of descriptor.subpaths) {
    const subpathEntry = program.getSourceFile(join(root, subpath.entrypoint));
    if (!subpathEntry) throw new Error(`public entrypoint를 찾을 수 없습니다: ${subpath.entrypoint}`);
    const subpathExports = checker.getExportsOfModule(checker.getSymbolAtLocation(subpathEntry))
      .filter((symbol) => !exports.some((rootExport) => rootExport === symbol))
      .sort((a, b) => a.name.localeCompare(b.name));
    exportCount += subpathExports.length;
    sections.push(`## \`${subpath.packageName}\`\n\n아래 API는 package root가 아닌 이 subpath에서 import합니다.`);
    sections.push(...subpathExports.map((symbol) => [
      `### \`${symbol.name}\``, "", "```ts", display(symbol, subpathEntry), "```",
    ].join("\n")));
  }
  const output = [
    `# ${descriptor.packageName} API`,
    "",
    `**탐색 분류:** ${descriptor.navigationGroup}`,
    "",
    `${descriptor.responsibility}의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.`,
    "",
    `> 이 문서는 \`${descriptor.entrypoint}\`에서 생성됩니다. API를 변경한 뒤 \`npm run docs:api\`를 실행하세요.`,
    "",
    ...sections,
    "",
  ].join("\n");
  const path = join(root, "docs/api-reference", `${descriptor.slug}.md`);
  let current = "";
  try { current = readFileSync(path, "utf8"); } catch {}
  if (check && current !== output) failures.push(descriptor.packageName);
  if (!check) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, output);
  }
}

if (failures.length > 0) {
  console.error(`API reference가 public export와 다릅니다: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`API reference ${check ? "coverage" : "generation"} ok; ${apiReferencePackages.length} packages, ${exportCount} exports.`);
}
