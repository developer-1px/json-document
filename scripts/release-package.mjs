import { appendFileSync } from "node:fs";
import { normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { readJson, repositoryRoot } from "./workspace-graph.mjs";

export const releases = [
  release("json-document-ajv", "packages/json-document-ajv/package.json", "@interactive-os/json-document-ajv"),
  release("json-document-react-hook-form", "packages/json-document-react-hook-form/package.json", "@interactive-os/json-document-react-hook-form"),
  release("json-document-react", "packages/json-document-react/package.json", "@interactive-os/json-document-react"),
  release("json-document-selection", "packages/json-document-selection/package.json", "@interactive-os/json-document-selection"),
  release("json-document-editing", "packages/json-document-editing/package.json", "@interactive-os/json-document-editing"),
  release("json-document-file-intake", "packages/json-document-file-intake/package.json", "@interactive-os/json-document-file-intake"),
  release("json-document-rich-text-mention", "packages/json-document-rich-text-mention/package.json", "@interactive-os/json-document-rich-text-mention"),
  release("json-document-rich-text-mention-react", "packages/json-document-rich-text-mention-react/package.json", "@interactive-os/json-document-rich-text-mention-react"),
  release("json-document-composer", "packages/json-document-composer/package.json", "@interactive-os/json-document-composer"),
  release("json-document-composer-react", "packages/json-document-composer-react/package.json", "@interactive-os/json-document-composer-react"),
  release("json-document-web", "packages/json-document-web/package.json", "@interactive-os/json-document-web"),
  release("json-document-contenteditable", "packages/json-document-contenteditable/package.json", "@interactive-os/json-document-contenteditable"),
  release("json-document-tanstack-table", "packages/json-document-tanstack-table/package.json", "@interactive-os/json-document-tanstack-table"),
  release("json-document-zod", "packages/json-document-zod/package.json", "@interactive-os/json-document-zod"),
  release("json-document-database", "packages/json-document-database/package.json", "@interactive-os/json-document-database"),
  release("json-document-contenteditable-collaboration", "packages/contenteditable-collaboration/package.json", "@interactive-os/json-document-contenteditable-collaboration"),
  release("json-document-collaboration", "packages/json-document-collaboration/package.json", "@interactive-os/json-document-collaboration"),
  release("json-document", "packages/json-document/package.json", "@interactive-os/json-document"),
];

function release(tagName, packageFile, workspace) {
  return { prefix: `${tagName}-v`, packageFile, workspace };
}

export function resolveRelease(releaseTag) {
  const candidate = releases.find(({ prefix }) => releaseTag.startsWith(prefix));
  if (candidate === undefined) throw new Error(`unsupported release tag ${releaseTag}`);

  const pkg = readJson(candidate.packageFile);
  const expectedTag = `${candidate.prefix}${pkg.version}`;
  if (releaseTag !== expectedTag) {
    throw new Error(`release tag ${releaseTag} does not match ${expectedTag}`);
  }

  const prerelease = /^\d+\.\d+\.\d+-rc\.\d+$/.test(pkg.version);
  const stable = /^\d+\.\d+\.\d+$/.test(pkg.version);
  if (!prerelease && !stable) {
    throw new Error(`package version is not a supported stable or rc version: ${pkg.version}`);
  }
  const distTag = prerelease ? "next" : "latest";
  if (pkg.publishConfig?.tag !== distTag) {
    throw new Error(`publishConfig.tag must be ${distTag} for ${pkg.version}`);
  }

  return {
    workspace: candidate.workspace,
    distTag,
    version: pkg.version,
    packageFile: candidate.packageFile,
  };
}

function main() {
  const releaseTag = process.env.RELEASE_TAG;
  if (releaseTag === undefined || releaseTag.length === 0) {
    console.error("RELEASE_TAG is required");
    process.exit(2);
  }
  const resolved = resolveRelease(releaseTag);
  const output = process.env.GITHUB_OUTPUT;
  if (output === undefined || output.length === 0) {
    console.log(JSON.stringify(resolved));
    return;
  }
  appendFileSync(output, `workspace=${resolved.workspace}\n`);
  appendFileSync(output, `dist_tag=${resolved.distTag}\n`);
}

const invokedPath = process.argv[1] === undefined ? "" : normalize(process.argv[1]);
const modulePath = normalize(fileURLToPath(import.meta.url));
if (invokedPath === modulePath || relative(repositoryRoot, invokedPath).split(sep).join("/") === "scripts/release-package.mjs") main();
