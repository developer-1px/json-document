import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["src/app", "src/routes"];
const violationFixture = path.join(siteRoot, "scripts/fixtures/ui-language-violation.tsx");
const visualPatterns = [
  /^(?:[a-z-]+:)*(?:accent-|bg-|border(?:-|$)|caret-|decoration-|divide-|fill-|font-|leading-|outline(?:-|$)|placeholder-|ring-|rounded|shadow|stroke-|text-(?:stone|white|black|red|amber|xs|sm|base|lg|xl|[2-9]xl|\[)|tracking-)/,
  /^(?:[a-z-]+:)*(?:aria-|data-|focus|focus-visible|disabled):/,
];

export function visualUtilityViolations(source, file = "source") {
  const violations = [];
  for (const match of source.matchAll(/(?:className\s*=\s*)?["'`]([^"'`]+)["'`]/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (visualPatterns.some((pattern) => pattern.test(token))) {
        violations.push(`${file}: ${token}`);
      }
    }
  }
  return violations;
}

export function statePositionViolations(source, file = "source") {
  return [...source.matchAll(/data-\[(?:focus|selected)=true\]:(?:absolute|fixed|relative|static|sticky)/g)]
    .map((match) => `${file}: ${match[0]}`);
}

const fixtureViolations = visualUtilityViolations(fs.readFileSync(violationFixture, "utf8"), "violation fixture");
if (fixtureViolations.length === 0) {
  throw new Error("UI language guard did not reject its violation fixture.");
}
const fixturePositionViolations = statePositionViolations(
  fs.readFileSync(violationFixture, "utf8"),
  "violation fixture",
);
if (fixturePositionViolations.length !== 1) {
  throw new Error("UI language guard did not reject state-owned positioning.");
}

const violations = sourceRoots.flatMap((root) => collect(path.join(siteRoot, root)))
  .flatMap((file) => visualUtilityViolations(fs.readFileSync(file, "utf8"), path.relative(siteRoot, file)));
const positionViolations = collectAllSources(path.join(siteRoot, "src"))
  .flatMap((file) => statePositionViolations(fs.readFileSync(file, "utf8"), path.relative(siteRoot, file)));

if (violations.length > 0 || positionViolations.length > 0) {
  console.error("UI language violations must move to src/shared/ui or an explicit route-owned *-styles.ts module:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  positionViolations.forEach((violation) => console.error(`- selection/focus styling must not own positioning: ${violation}`));
  process.exitCode = 1;
} else {
  console.log(`UI language guard ok; violation fixture rejected (${fixtureViolations.length + fixturePositionViolations.length} findings).`);
}

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(entryPath);
    if (entry.name.endsWith(".gen.ts") || entry.name.endsWith(".gen.tsx")) return [];
    if (entry.name.endsWith("-styles.ts")) return [];
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

function collectAllSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectAllSources(entryPath);
    if (entry.name.endsWith(".gen.ts") || entry.name.endsWith(".gen.tsx")) return [];
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}
