import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(siteRoot, "..");
const packagesRoot = path.join(repositoryRoot, "packages");
const sourceRoots = [
  ...fs.readdirSync(packagesRoot).map((name) => path.join(packagesRoot, name, "src")),
  path.join(siteRoot, "src"),
];
const glyphs = "＋−↶↷×▥⧉✂▣⌫▦◉⇤◌✓♩↥⇄⌕↕↻↙↗←→↑↓";
const glyphPattern = `[${glyphs}]`;

export function canonicalIconViolations(source, file = "source") {
  const violations = [];
  const patterns = [
    [new RegExp(`<Command\\b[\\s\\S]*?<\\/Command>`, "g"), "Command character glyph"],
    [new RegExp(`\\b(?:icon|trigger)=["']${glyphPattern}["']`, "g"), "character icon prop"],
    [new RegExp(`aria-hidden=["']true["'][^>]*>\\s*${glyphPattern}`, "g"), "aria-hidden character glyph"],
    [/function\s+\w*Icon\b[\s\S]*?<svg\b/g, "consumer-local SVG icon"],
  ];
  for (const [pattern, label] of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (new RegExp(glyphPattern).test(match[0]) || label === "consumer-local SVG icon") {
        violations.push(`${file}: ${label}`);
      }
    }
  }
  return violations;
}

const fixture = '<Command label="Undo">↶</Command>\nfunction CopyIcon() { return <svg />; }';
if (canonicalIconViolations(fixture, "violation fixture").length !== 2) {
  throw new Error("Canonical icon guard did not reject its violation fixture.");
}

const violations = sourceRoots.flatMap(collect)
  .flatMap((file) => canonicalIconViolations(fs.readFileSync(file, "utf8"), path.relative(repositoryRoot, file)));

if (violations.length > 0) {
  console.error("Static UI icons must consume lucide-react; character glyphs and consumer-local SVG icons are not canonical:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log("Canonical icon guard ok; all static UI icon consumers use the Lucide source.");
}

function collect(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.name === "node_modules" || entry.name === "dist") return [];
    if (entry.isDirectory()) return collect(entryPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : [];
  });
}
