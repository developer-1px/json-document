import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { apiReferencePackages } from "../docs/api-reference/packages.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes("--check");
const configPath = join(root, "tsconfig.build.json");
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const entrypoints = apiReferencePackages.map(({ entrypoint }) => join(root, entrypoint));
const sourcePaths = Object.fromEntries(apiReferencePackages.map(({ packageName, entrypoint }) => [packageName, [entrypoint]]));
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
const failures = [];
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
  const ownerRoutes = siteRoutes.filter((route) => route.path === referencePath && route.navigationGroup === descriptor.owner);
  if (ownerRoutes.length !== 1) failures.push(`${descriptor.packageName} owner route`);
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
  const output = [
    `# ${descriptor.packageName} API`,
    "",
    `**Owner:** ${descriptor.owner}`,
    "",
    `${descriptor.responsibility}의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.`,
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
