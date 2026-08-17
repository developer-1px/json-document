import { readFile } from "node:fs/promises";

const editor = await readFile(new URL("../src/editor.ts", import.meta.url), "utf8");
const responsibilities = [
  ["editor-validation", ["readRichTextDocument", "validateLocalOrFallback"]],
  ["selection-mapping", ["firstSelection", "mapSelectionByTextOrder", "mapSelectionByExistingIds"]],
  ["text-offset", ["validTextOffset", "previousScalarOffset", "nextScalarOffset"]],
];
const violations = [];

for (const [module, symbols] of responsibilities) {
  const source = await readFile(new URL(`../src/${module}.ts`, import.meta.url), "utf8");
  if (!editor.includes(`from "./${module}.js"`)) violations.push(`editor.ts must depend on ${module}.ts.`);
  for (const symbol of symbols) {
    if (!source.includes(`export function ${symbol}`)) violations.push(`${module}.ts must own ${symbol}.`);
    if (editor.includes(`function ${symbol}`)) violations.push(`editor.ts must not implement ${symbol}.`);
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Rich Text editor responsibility layout ok.");
}
