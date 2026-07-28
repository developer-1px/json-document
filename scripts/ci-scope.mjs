import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const base = option("--base") ?? process.env.CI_BASE_SHA ?? null;
const head = option("--head") ?? process.env.CI_HEAD_SHA ?? "HEAD";

const diff = changedFiles();
const all = diff.files === null;
const files = diff.files ?? [];

const rootDependency = [/^package(?:-lock)?\.json$/];
const ciWorkflow = [/^\.github\/workflows\/ci\.yml$/, /^scripts\/ci-scope\.mjs$/];
const coreRuntime = [
  /^packages\/json-document\/src\//,
  /^packages\/json-document\/dist\//,
  /^packages\/json-document\/tests\//,
  /^packages\/json-document\/(?:package\.json|public-contract\.json|tsconfig(?:\.test)?\.json|vitest\.config\.ts|eslint\.config\.js)$/,
];
const companionRuntime = [
  /^packages\/json-document-collaboration\//,
  /^packages\/contenteditable-collaboration\//,
];
const packageDocs = [
  /^docs\//,
  /^llms\.txt$/,
  /^packages\/[^/]+\/README\.md$/,
  /^apps\/site\/src\/generated\//,
  /^scripts\/(?:generate-docs|evaluate-docs)\.mjs$/,
];
const packageSmoke = [
  /^packages\/json-document\/README\.md$/,
  /^packages\/json-document\/tests\/smoke\//,
];
const packageTooling = [
  /^scripts\/(?:evaluate-archive-isolation|evaluate-standardization)\.mjs$/,
];
const siteRuntime = [
  /^apps\/site\//,
  /^config\//,
  /^docs\//,
  /^llms\.txt$/,
  /^packages\/[^/]+\/README\.md$/,
  /^scripts\/(?:generate-docs|evaluate-docs|evaluate-site|evaluate-site-http|evaluate-live-site)\.mjs$/,
];
const browserRuntime = [
  /^tests\/browser\//,
  /^playwright\.config\.ts$/,
  /^config\//,
  /^apps\/site\/(?:src\/(?!generated\/)|tests\/)/,
  /^apps\/site\/(?:package\.json|vite\.config\.ts|tsconfig(?:\.node)?\.json)$/,
];
const packageFull = matches([
  ...rootDependency,
  ...ciWorkflow,
  ...coreRuntime,
  ...companionRuntime,
  ...packageTooling,
]);
const packageDocsChanged = matches(packageDocs);
const packageSmokeChanged = matches(packageSmoke);
const packageAny = packageFull || packageDocsChanged || packageSmokeChanged;
const site = matches([
  ...ciWorkflow,
  ...siteRuntime,
]);
const browser = matches([
  ...ciWorkflow,
  ...coreRuntime,
  ...browserRuntime,
]);

const outputs = {
  package_full: packageFull,
  package_docs: packageDocsChanged,
  package_smoke: packageSmokeChanged,
  package_any: packageAny,
  site,
  browser,
};

console.log(`ci scope: ${diff.reason}`);
if (files.length > 0) {
  for (const file of files) console.log(`- ${file}`);
}
for (const [name, value] of Object.entries(outputs)) {
  console.log(`${name}=${value}`);
}

if (process.env.GITHUB_OUTPUT) {
  const content = Object.entries(outputs)
    .map(([name, value]) => `${name}=${value ? "true" : "false"}`)
    .join("\n");
  appendFileSync(process.env.GITHUB_OUTPUT, `${content}\n`);
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function changedFiles() {
  if (base === null || /^0+$/.test(base)) {
    return { files: null, reason: "missing diff base; running all scopes" };
  }

  const result = spawnSync("git", ["diff", "--name-only", base, head], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return { files: null, reason: `git diff failed for ${base}..${head}; running all scopes` };
  }

  return {
    files: result.stdout.split(/\r?\n/).filter((path) => path.length > 0),
    reason: `${base}..${head}`,
  };
}

function matches(patterns) {
  return all || files.some((file) => patterns.some((pattern) => pattern.test(file)));
}
