import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(siteRoot, "src");
const tokenDefinition = path.join(sourceRoot, "app/index.css");
const contentDataFiles = new Set([
  path.join(sourceRoot, "shared/demo-workbench/object-demo-document.ts"),
]);
const fixture = path.join(siteRoot, "scripts/fixtures/design-token-violation.tsx");

const forbiddenPresentationPatterns = [
  { name: "reference token direct consumption", pattern: /var\(--ref-[a-z0-9-]+\)/g },
  { name: "raw color", pattern: /#[0-9a-f]{3,8}\b|rgba?\((?!var\(--color-)[^)]*\)/gi },
  { name: "raw radius", pattern: /rounded-\[[^\]]+\]/g },
  { name: "raw shadow", pattern: /shadow-\[[^\]]+\]/g },
  { name: "raw typography", pattern: /(?:text|leading|tracking)-\[[^\]]+\]/g },
];
const legacyUtilities = /(?:^|[^a-z-])(?:bg-(?:paper(?:-warm)?|impact(?:-soft)?|ink(?:-strong)?)|text-(?:paper|ink(?:-strong)?|pencil(?:-light)?|sage|impact-ink)|border-(?:paper|ink(?:-strong)?|pencil(?:-light)?|impact)|(?:ring|outline|stroke|accent)-impact)(?=$|[^a-z-])/g;

export function designTokenViolations(source, file = "source", options = {}) {
  const violations = [];
  if (!options.allowContentColors) {
    for (const { name, pattern } of forbiddenPresentationPatterns) {
      for (const match of source.matchAll(pattern)) violations.push(`${file}: ${name}: ${match[0]}`);
    }
  } else {
    for (const match of source.matchAll(forbiddenPresentationPatterns[0].pattern)) {
      violations.push(`${file}: reference token direct consumption: ${match[0]}`);
    }
  }
  for (const match of source.matchAll(legacyUtilities)) violations.push(`${file}: legacy utility: ${match[0].trim()}`);
  return violations;
}

const fixtureViolations = designTokenViolations(fs.readFileSync(fixture, "utf8"), "violation fixture");
if (fixtureViolations.length !== 3) {
  throw new Error(`Design token guard did not reject its fixture completely (${fixtureViolations.length}/3).`);
}

const files = collect(sourceRoot).filter((file) => file !== tokenDefinition);
const violations = files.flatMap((file) => designTokenViolations(
  fs.readFileSync(file, "utf8"),
  path.relative(siteRoot, file),
  { allowContentColors: contentDataFiles.has(file) },
));

const tailwindConfig = fs.readFileSync(path.join(siteRoot, "tailwind.config.cjs"), "utf8");
for (const match of tailwindConfig.matchAll(/var\(--ref-[a-z0-9-]+\)/g)) {
  violations.push(`tailwind.config.cjs: reference token exposed: ${match[0]}`);
}

if (violations.length > 0) {
  console.error("Design token violations must use a semantic token or remain explicit content/layout data:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(`Design token guard ok; ${files.length} source files checked and violation fixture rejected.`);
}

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(entryPath);
    return /\.(?:css|tsx?|cjs)$/.test(entry.name) ? [entryPath] : [];
  });
}
