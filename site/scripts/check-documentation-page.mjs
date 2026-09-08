import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const docsRoot = join(root, "site/src/routes/docs");
const canonicalOwner = "DocumentationPage.tsx";
const consumers = ["DocsRoute.tsx", "ConceptsRoute.tsx", "DocumentTypeCandidateRoute.tsx"];

for (const name of readdirSync(docsRoot).filter((entry) => entry.endsWith(".tsx"))) {
  const source = readFileSync(join(docsRoot, name), "utf8");
  if (name !== canonicalOwner && name !== "MarkdownViewer.tsx" && /(?:MarkdownViewer|markdownHeadings)/.test(source)) {
    throw new Error(`${name} bypasses the canonical DocumentationPage composition`);
  }
}

const owner = readFileSync(join(docsRoot, canonicalOwner), "utf8");
for (const contract of ["PageFrame", "PageHeader", "MarkdownViewer", "markdownHeadings", "Documentation sections", "On this page", "max-w-3xl"]) {
  if (!owner.includes(contract)) throw new Error(`DocumentationPage is missing canonical contract: ${contract}`);
}
for (const consumer of consumers) {
  const source = readFileSync(join(docsRoot, consumer), "utf8");
  if (!source.includes('from "./DocumentationPage"') || !source.includes("<DocumentationPage")) {
    throw new Error(`${consumer} does not consume the canonical DocumentationPage`);
  }
}

console.log(`DocumentationPage guard ok; owner=1; consumers=${consumers.length}; local bypasses=0.`);
