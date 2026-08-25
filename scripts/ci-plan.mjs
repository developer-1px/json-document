import { execFileSync } from "node:child_process";
import { normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  internalDependencies,
  libraries,
  repositoryRoot,
} from "./workspace-graph.mjs";

const alwaysFull = new Set([
  ".github/workflows/ci.yml",
  "package-lock.json",
  "package.json",
  "scripts/ci-plan.mjs",
  "scripts/workspace-tasks.mjs",
  "tsconfig.build.json",
]);

const packageBrowserSpecs = new Map([
  ["@interactive-os/json-document-composer", ["site/tests/browser/composer-demo.spec.ts"]],
  ["@interactive-os/json-document", ["site/tests/browser"]],
  ["@interactive-os/json-document-affordance", ["site/tests/browser/widgets.spec.ts"]],
  ["@interactive-os/json-document-ajv", ["site/tests/browser/connectors/ajv.spec.ts"]],
  ["@interactive-os/json-document-contenteditable", ["site/tests/browser/adapters/contenteditable.spec.ts"]],
  ["@interactive-os/json-document-database", ["site/tests/browser/database-demo.spec.ts"]],
  ["@interactive-os/json-document-editing", [
    "site/tests/browser/editing-demos.spec.ts",
    "site/tests/browser/editor-slice-demos.spec.ts",
  ]],
  ["@interactive-os/json-document-react", ["site/tests/browser/connectors/react.spec.ts"]],
  ["@interactive-os/json-document-react-hook-form", ["site/tests/browser/connectors/react-hook-form.spec.ts"]],
  ["@interactive-os/json-document-rich-text", [
    "site/tests/browser/rich-text-corpus.spec.ts",
    "site/tests/browser/rich-text-demo.spec.ts",
  ]],
  ["@interactive-os/json-document-rich-text-react", ["site/tests/browser/rich-text-demo.spec.ts"]],
  ["@interactive-os/json-document-rich-text-web", ["site/tests/browser/rich-text-demo.spec.ts"]],
  ["@interactive-os/json-document-selection", [
    "site/tests/browser/editing-demos.spec.ts",
    "site/tests/browser/editor-slice-demos.spec.ts",
  ]],
  ["@interactive-os/json-document-tanstack-table", ["site/tests/browser/connectors/tanstack-table.spec.ts"]],
  ["@interactive-os/json-document-web", [
    "site/tests/browser/adapters/clipboard.spec.ts",
    "site/tests/browser/adapters/keyboard.spec.ts",
  ]],
  ["@interactive-os/json-document-zod", ["site/tests/browser/connectors/zod.spec.ts"]],
]);

const routeBrowserSpecs = new Map([
  ["adapters/clipboard", ["site/tests/browser/adapters/clipboard.spec.ts"]],
  ["adapters/contenteditable", ["site/tests/browser/adapters/contenteditable.spec.ts"]],
  ["adapters/keyboard", ["site/tests/browser/adapters/keyboard.spec.ts"]],
  ["artifact-viewer", ["site/tests/browser/artifact-viewer.spec.ts"]],
  ["connectors/ajv", ["site/tests/browser/connectors/ajv.spec.ts"]],
  ["connectors/react", ["site/tests/browser/connectors/react.spec.ts"]],
  ["connectors/react-hook-form", ["site/tests/browser/connectors/react-hook-form.spec.ts"]],
  ["connectors/tanstack-table", ["site/tests/browser/connectors/tanstack-table.spec.ts"]],
  ["connectors/zod", ["site/tests/browser/connectors/zod.spec.ts"]],
  ["database-demo", ["site/tests/browser/database-demo.spec.ts"]],
  ["document-demo", ["site/tests/browser/document-demo.spec.ts"]],
  ["editing-demos", ["site/tests/browser/editing-demos.spec.ts"]],
  ["rich-text-demo", ["site/tests/browser/rich-text-demo.spec.ts"]],
  ["sheet-demo", ["site/tests/browser/sheet-demo.spec.ts"]],
  ["widgets", ["site/tests/browser/widgets.spec.ts"]],
]);
const editorSliceRoutes = new Set(["canvas-demo", "kanban-demo", "object-demo", "order-demo", "tree-demo"]);
const firstKitWorkspaces = new Set([
  "@interactive-os/json-document",
  "@interactive-os/json-document-selection",
  "@interactive-os/json-document-editing",
  "@interactive-os/json-document-web",
  "@interactive-os/json-document-react",
  "@interactive-os/json-document-zod",
  "@interactive-os/json-document-database",
]);

function internalDependencyNames(library) {
  return internalDependencies(library).map(({ manifest }) => manifest.name);
}

function affectedLibraries(directNames) {
  const affected = new Set(directNames);
  let changed = true;
  while (changed) {
    changed = false;
    for (const library of libraries) {
      if (affected.has(library.manifest.name)) continue;
      if (internalDependencyNames(library).some((name) => affected.has(name))) {
        affected.add(library.manifest.name);
        changed = true;
      }
    }
  }
  return libraries
    .map(({ manifest }) => manifest.name)
    .filter((name) => affected.has(name));
}

function packageForPath(path) {
  return libraries.find(({ directory }) => path === directory || path.startsWith(`${directory}/`));
}

function addAll(target, values) {
  for (const value of values) target.add(value);
}

function routeSpecs(path) {
  const prefix = "site/src/routes/";
  const rest = path.slice(prefix.length);
  const route = [...routeBrowserSpecs.keys()]
    .sort((left, right) => right.length - left.length)
    .find((candidate) => rest === candidate || rest.startsWith(`${candidate}/`));
  if (route !== undefined) return routeBrowserSpecs.get(route);
  const firstSegment = rest.split("/")[0];
  if (editorSliceRoutes.has(firstSegment)) return ["site/tests/browser/editor-slice-demos.spec.ts"];
  if (firstSegment === "docs") return ["site/tests/browser/live-demo-docs.spec.ts"];
  if (firstSegment === "home" || firstSegment === "showcase") return ["site/tests/browser/site-shell.spec.ts"];
  return undefined;
}

export function createPlan(changedFiles, { full = false } = {}) {
  if (full) return fullPlan("main 또는 명시적 전체 검사");

  const directPackages = new Set();
  const browserSpecs = new Set(["site/tests/browser/site-shell.spec.ts"]);
  let docs = false;
  let site = false;
  let standards = false;
  let forceFull = false;
  let forceFullBrowser = false;
  const reasons = [];

  for (const rawPath of changedFiles) {
    const path = rawPath.replaceAll("\\\\", "/").replace(/^\.\//, "");
    if (path.length === 0) continue;
    if (alwaysFull.has(path) || path.startsWith(".github/") || path.startsWith("scripts/")) {
      forceFull = true;
      reasons.push(`공통 기반 변경: ${path}`);
      continue;
    }

    const library = packageForPath(path);
    if (library !== undefined) {
      directPackages.add(library.manifest.name);
      continue;
    }

    if (path.startsWith("docs/")) {
      docs = true;
      site = true;
      browserSpecs.add("site/tests/browser/live-demo-docs.spec.ts");
      continue;
    }
    if (path.startsWith("standards/")) {
      standards = true;
      continue;
    }
    if (path.startsWith("site/tests/browser/") && path.endsWith(".spec.ts")) {
      site = true;
      browserSpecs.add(path);
      continue;
    }
    if (path.startsWith("site/tests/browser/")) {
      site = true;
      forceFullBrowser = true;
      continue;
    }
    if (path.startsWith("site/src/routes/")) {
      site = true;
      const specs = routeSpecs(path);
      if (specs === undefined) {
        forceFullBrowser = true;
      } else addAll(browserSpecs, specs);
      continue;
    }
    if (path.startsWith("site/")) {
      site = true;
      if (!path.startsWith("site/tests/unit/") && !path.startsWith("site/scripts/")) {
        forceFullBrowser = true;
      }
      continue;
    }
    if (path === ".gitignore" || path.endsWith(".md")) {
      docs = true;
      continue;
    }

    forceFull = true;
    reasons.push(`분류되지 않은 변경: ${path}`);
  }

  if (forceFull) return fullPlan(reasons.join("; "));

  const packageWorkspaces = affectedLibraries(directPackages);
  for (const workspace of packageWorkspaces) {
    const specs = packageBrowserSpecs.get(workspace);
    if (specs !== undefined) addAll(browserSpecs, specs);
  }
  if (packageWorkspaces.includes("@interactive-os/json-document")) forceFullBrowser = true;
  if (packageWorkspaces.some((workspace) =>
    workspace === "@interactive-os/json-document" || workspace.includes("rich-text"),
  )) standards = true;

  return {
    full: false,
    packageWorkspaces,
    browserSpecs: forceFullBrowser ? ["site/tests/browser"] : [...browserSpecs].sort(),
    docs,
    site,
    standards,
    externalKit: packageWorkspaces.some((workspace) => firstKitWorkspaces.has(workspace)),
    reason: "변경 영향도에 따른 선택 검사",
  };
}

function fullPlan(reason) {
  return {
    full: true,
    packageWorkspaces: libraries.map(({ manifest }) => manifest.name),
    browserSpecs: ["site/tests/browser"],
    docs: true,
    site: true,
    standards: true,
    externalKit: true,
    reason,
  };
}

function changedFiles(base, head) {
  return execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", `${base}...${head}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
}

function emitGitHubOutput(plan) {
  const output = {
    full: String(plan.full),
    package_required: String(plan.packageWorkspaces.length > 0 || plan.docs || plan.standards),
    package_workspaces: JSON.stringify(plan.packageWorkspaces),
    browser_specs: JSON.stringify(plan.browserSpecs),
    docs: String(plan.docs),
    site: String(plan.site),
    standards: String(plan.standards),
    external_kit: String(plan.externalKit),
    reason: plan.reason,
  };
  for (const [name, value] of Object.entries(output)) console.log(`${name}=${value}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--full") {
    emitGitHubOutput(createPlan([], { full: true }));
    return;
  }
  const baseIndex = args.indexOf("--base");
  const headIndex = args.indexOf("--head");
  if (baseIndex === -1 || headIndex === -1 || args[baseIndex + 1] === undefined || args[headIndex + 1] === undefined) {
    console.error("usage: node scripts/ci-plan.mjs --full | --base <commit> --head <commit>");
    process.exit(2);
  }
  emitGitHubOutput(createPlan(changedFiles(args[baseIndex + 1], args[headIndex + 1])));
}

const invokedPath = process.argv[1] === undefined ? "" : normalize(process.argv[1]);
const modulePath = normalize(fileURLToPath(import.meta.url));
if (invokedPath === modulePath || relative(repositoryRoot, invokedPath).split(sep).join("/") === "scripts/ci-plan.mjs") main();
