import { readFile } from "node:fs/promises";

const domainsWithValidation = ["order", "object", "tree", "sheet", "database", "kanban"];
const violations = [];

for (const domain of domainsWithValidation) {
  const [editor, validation] = await Promise.all([
    readFile(new URL(`../src/${domain}.ts`, import.meta.url), "utf8"),
    readFile(new URL(`../src/${domain}-validation.ts`, import.meta.url), "utf8"),
  ]);
  const assertion = `assert${domain[0].toUpperCase()}${domain.slice(1)}Document`;
  if (!editor.includes(`from "./${domain}-validation.js"`)) violations.push(`${domain}.ts must depend on its validation responsibility.`);
  if (editor.includes(`function ${assertion}`)) violations.push(`${domain}.ts must not own document validation.`);
  if (!validation.includes(`export function ${assertion}`)) violations.push(`${domain}-validation.ts must own ${assertion}.`);
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Editing responsibility layout ok.");
}
