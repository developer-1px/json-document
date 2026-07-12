import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const labRoot = "labs/extensions";
const officialRoot = "packages";
const verify = process.argv.includes("--verify");
const verifyChanged = process.argv.includes("--changed");
const fullVerificationPathPatterns = [
  /^package(?:-lock)?\.json$/,
  /^packages\/json-document\/src\//,
  /^packages\/json-document\/dist\//,
  /^packages\/json-document\/(?:package\.json|public-contract\.json|tsconfig\.json)$/,
  /^packages\/(?!json-document\/)[^/]+\/(?:src|tests)\//,
  /^packages\/(?!json-document\/)[^/]+\/(?:package\.json|tsconfig(?:\.test)?\.json|vitest\.config\.ts|eslint\.config\.js)$/,
  /^scripts\/evaluate-extension-lab\.mjs$/,
];
const retiredLabNames = new Set([
  "annotations",
  "comments",
  "document-outline",
  "drop-intent",
  "field-draft",
  "form-draft",
  "outline",
  "patch-preview",
  "pointer-bookmarks",
  "proposed-changes",
  "protected-ranges",
  "snippets",
  "suggestions",
  "text-search",
  "search-replace",
]);

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function packages() {
  const absoluteRoot = join(root, labRoot);
  if (!existsSync(absoluteRoot)) return [];
  return readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${labRoot}/${entry.name}`)
    .filter((dir) => existsSync(join(root, dir, "package.json")))
    .sort();
}

function files(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return files(path);
    return entry.isFile() && path.endsWith(".ts") ? [path] : [];
  });
}

function importedSpecifiers(source) {
  const specifiers = new Set();
  for (const pattern of [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']/g,
  ]) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return specifiers;
}

function formatCommand(command, args, cwd = root) {
  const relativeCwd = cwd === root ? "." : cwd.slice(root.length).replace(/^\//, "");
  return `$ ${command} ${args.join(" ")}  # cwd=${relativeCwd}`;
}

function buildCorePackage() {
  const result = spawnSync("npm", ["run", "build", "-w", "@interactive-os/json-document"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("@interactive-os/json-document build failed before lab verification.");
  }
}

function buildOfficialDependencies(targets) {
  const dependencies = new Set(
    targets.flatMap((target) => target.officialDependencies),
  );
  for (const dependency of dependencies) {
    const result = spawnSync("npm", ["run", "build", "-w", dependency], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error(`${dependency} build failed before lab verification.`);
    }
  }
}

function isCoreResolutionFailure(output) {
  return output.includes("Cannot find module '@interactive-os/json-document'")
    || (/TS2307/.test(output) && /(?:^|\.\.\/|\/)json-document\/dist\//.test(output));
}

function run(command, args, cwd = root, options = {}) {
  const label = formatCommand(command, args, cwd);
  console.log(label);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      if (options.retryCoreResolution === true && isCoreResolutionFailure(output)) {
        try {
          console.error(`${label} could not resolve @interactive-os/json-document; rebuilding core package and retrying once.`);
          buildCorePackage();
          run(command, args, cwd, { ...options, retryCoreResolution: false }).then(resolve, reject);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }
      reject(new Error(`${label} failed with exit code ${code}\n${output}`));
    });
  });
}

function verifyConcurrency() {
  const configured = Number(process.env.LAB_EXTENSIONS_VERIFY_CONCURRENCY);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return Math.min(4, Math.max(1, availableParallelism()));
}

function gitChangedFiles() {
  const base = option("--base") ?? process.env.LAB_EXTENSIONS_BASE ?? null;
  const head = option("--head") ?? process.env.LAB_EXTENSIONS_HEAD ?? "HEAD";
  if (base === null || /^0+$/.test(base)) {
    return { files: null, reason: "missing diff base" };
  }

  const result = spawnSync("git", ["diff", "--name-only", base, head], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    return { files: null, reason: `git diff failed for ${base}..${head}` };
  }

  return {
    files: result.stdout.split(/\r?\n/).filter((path) => path.length > 0),
    reason: `${base}..${head}`,
  };
}

function labDirFromPath(path) {
  const parts = path.split("/");
  if (parts[0] !== "labs" || parts[1] !== "extensions" || parts[2] === undefined) return null;
  return `${labRoot}/${parts[2]}`;
}

function verificationSelection(labs, labDependencies) {
  if (!verifyChanged) {
    return { dirs: new Set(labs), reason: "full verification requested" };
  }

  const { files: changedFiles, reason } = gitChangedFiles();
  if (changedFiles === null) {
    return { dirs: new Set(labs), reason: `${reason}; falling back to full verification` };
  }
  if (changedFiles.some((path) => fullVerificationPathPatterns.some((pattern) => pattern.test(path)))) {
    return { dirs: new Set(labs), reason: `${reason}; shared lab dependency changed` };
  }

  const availableLabs = new Set(labs);
  const selectedLabs = new Set();
  for (const file of changedFiles) {
    const labDir = labDirFromPath(file);
    if (labDir !== null && availableLabs.has(labDir)) {
      selectedLabs.add(labDir);
    }
  }
  const reverseDependencies = new Map(labs.map((dir) => [dir, new Set()]));
  for (const [dir, dependencies] of labDependencies) {
    for (const dependency of dependencies) {
      reverseDependencies.get(dependency)?.add(dir);
    }
  }

  const withDependents = transitiveLabClosure(selectedLabs, reverseDependencies);
  const withDependencies = transitiveLabClosure(withDependents, labDependencies);
  return { dirs: withDependencies, reason };
}

function transitiveLabClosure(initial, edges) {
  const selected = new Set(initial);
  const pending = [...initial];
  while (pending.length > 0) {
    const dir = pending.pop();
    for (const related of edges.get(dir) ?? []) {
      if (selected.has(related)) continue;
      selected.add(related);
      pending.push(related);
    }
  }
  return selected;
}

function findLabDependencyCycle(labs, labDependencies) {
  const complete = new Set();
  const visiting = new Set();
  const path = [];

  function visit(dir) {
    if (complete.has(dir)) return null;
    if (visiting.has(dir)) {
      const start = path.indexOf(dir);
      return [...path.slice(start), dir];
    }

    visiting.add(dir);
    path.push(dir);
    for (const dependency of labDependencies.get(dir) ?? []) {
      const cycle = visit(dependency);
      if (cycle !== null) return cycle;
    }
    path.pop();
    visiting.delete(dir);
    complete.add(dir);
    return null;
  }

  for (const dir of labs) {
    const cycle = visit(dir);
    if (cycle !== null) return cycle;
  }
  return null;
}

async function verifyPackage({ dir, name }) {
  const packageRoot = join(root, dir);
  await run("npx", ["--no-install", "tsc", "-p", "tsconfig.test.json", "--noEmit"], packageRoot, { retryCoreResolution: true });
  await run("npx", ["--no-install", "vitest", "run", "--config", "vitest.config.ts"], packageRoot);
  rmSync(join(packageRoot, "dist"), { recursive: true, force: true });
  await run("npx", ["--no-install", "tsc", "-p", "tsconfig.json"], packageRoot, { retryCoreResolution: true });
  await run("node", ["--input-type=module", "--eval", `await import(${JSON.stringify(name)});`], packageRoot);
  console.log(`[ok] ${name}`);
}

async function verifyPackages(targets, levelLabel) {
  const concurrency = Math.min(verifyConcurrency(), targets.length);
  console.log(`extension lab verify ${levelLabel} concurrency: ${concurrency}`);

  let cursor = 0;
  const failures = [];
  async function worker() {
    while (cursor < targets.length) {
      const target = targets[cursor];
      cursor += 1;
      try {
        await verifyPackage(target);
      } catch (error) {
        failures.push(error);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  for (const failure of failures) {
    fail(failure.message);
  }
  return failures.length === 0;
}

function verificationLevels(targets) {
  const targetByDir = new Map(targets.map((target) => [target.dir, target]));
  const unresolved = new Map();
  const dependents = new Map(targets.map((target) => [target.dir, new Set()]));

  for (const target of targets) {
    const dependencies = target.labDependencies.filter((dir) => targetByDir.has(dir));
    unresolved.set(target.dir, dependencies.length);
    for (const dependency of dependencies) {
      dependents.get(dependency)?.add(target.dir);
    }
  }

  let ready = targets
    .filter((target) => unresolved.get(target.dir) === 0)
    .sort((left, right) => left.dir.localeCompare(right.dir));
  const levels = [];
  let scheduled = 0;

  while (ready.length > 0) {
    const level = ready;
    levels.push(level);
    scheduled += level.length;
    const next = [];
    for (const target of level) {
      for (const dependentDir of dependents.get(target.dir) ?? []) {
        const remaining = (unresolved.get(dependentDir) ?? 0) - 1;
        unresolved.set(dependentDir, remaining);
        if (remaining === 0) next.push(targetByDir.get(dependentDir));
      }
    }
    ready = next
      .filter((target) => target !== undefined)
      .sort((left, right) => left.dir.localeCompare(right.dir));
  }

  if (scheduled !== targets.length) {
    throw new Error("extension lab dependency cycle prevented verification scheduling.");
  }
  return levels;
}

const labs = packages();
if (labs.length === 0) {
  fail("extension lab: no lab packages found.");
}
const officialPackageNames = new Set(officialPackages().map((pkg) => pkg.name));
const labPackages = labs.map((dir) => ({
  dir,
  pkg: JSON.parse(read(`${dir}/package.json`)),
}));
const labPackageByDir = new Map(labPackages.map((target) => [target.dir, target]));
const labPackageByName = new Map();
for (const target of labPackages) {
  if (typeof target.pkg.name !== "string") continue;
  const existing = labPackageByName.get(target.pkg.name);
  if (existing !== undefined) {
    fail(`${target.pkg.name}: lab package name is duplicated by ${existing.dir} and ${target.dir}.`);
    continue;
  }
  labPackageByName.set(target.pkg.name, target);
}

const labDependencies = new Map(labPackages.map(({ dir, pkg }) => [
  dir,
  new Set(
    Object.keys(pkg.dependencies ?? {})
      .map((name) => labPackageByName.get(name)?.dir)
      .filter((dependencyDir) => dependencyDir !== undefined),
  ),
]));
const dependencyCycle = findLabDependencyCycle(labs, labDependencies);
if (dependencyCycle !== null) {
  const names = dependencyCycle.map((dir) => labPackageByDir.get(dir)?.pkg.name ?? dir);
  fail(`extension lab dependency cycle: ${names.join(" -> ")}`);
}

const selectedVerification = verify
  ? verificationSelection(labs, labDependencies)
  : { dirs: new Set(), reason: "check only" };
const verificationTargets = [];

for (const { dir, pkg } of labPackages) {
  const label = pkg.name ?? dir;
  const folderName = dir.slice(dir.lastIndexOf("/") + 1);
  const packageName = typeof pkg.name === "string" && pkg.name.startsWith("@interactive-os/json-document-")
    ? pkg.name.slice("@interactive-os/json-document-".length)
    : null;

  if (!pkg.name?.startsWith("@interactive-os/json-document-")) {
    fail(`${label}: package name must stay under @json-document.`);
  }
  if (packageName !== folderName) {
    fail(`${label}: package name must match its lab folder (${folderName}).`);
  }
  if (retiredLabNames.has(folderName) || (packageName !== null && retiredLabNames.has(packageName))) {
    fail(`${label}: retired implementation-shaped lab name must not be reintroduced.`);
  }
  if (typeof pkg.name === "string" && officialPackageNames.has(pkg.name)) {
    fail(`${label}: lab package name collides with an official package. Retire the lab or choose a distinct experimental concept name.`);
  }
  if (pkg.private !== true) {
    fail(`${label}: lab packages must be private until promoted.`);
  }
  if (pkg.peerDependencies?.["@interactive-os/json-document"] !== "^1.0.0") {
    fail(`${label}: json-document must stay a peer dependency.`);
  }
  if (pkg.dependencies?.["@interactive-os/json-document"]) {
    fail(`${label}: json-document must not be a runtime dependency.`);
  }
  for (const dependencyName of Object.keys(pkg.dependencies ?? {})) {
    const dependency = labPackageByName.get(dependencyName);
    if (dependency === undefined) continue;
    if (dependency.pkg.private !== true) {
      fail(`${label}: lab runtime dependency must target another private lab (${dependencyName}).`);
    }
    if (pkg.dependencies[dependencyName] !== dependency.pkg.version) {
      fail(`${label}: lab runtime dependency must use the target lab version ${dependency.pkg.version} (${dependencyName}).`);
    }
  }
  if (pkg.sideEffects !== false) {
    fail(`${label}: sideEffects must be false.`);
  }
  if (!existsSync(join(root, dir, "README.md"))) {
    fail(`${label}: README.md is required for lab review.`);
  }
  const readme = read(`${dir}/README.md`);
  for (const [section, pattern] of [
    ["Scope", /^## Scope\b/m],
    ["Non-goals", /^## Non-goals\b/m],
    ["Friction report", /^## Friction report\b/m],
  ]) {
    if (!pattern.test(readme)) {
      fail(`${label}: README.md must include a ${section} section.`);
    }
  }

  for (const sourcePath of files(`${dir}/src`)) {
    const source = read(sourcePath);
    for (const specifier of importedSpecifiers(source)) {
      if (specifier === "@interactive-os/json-document") continue;
      const labDependency = labPackageByName.get(specifier);
      if (labDependency !== undefined) {
        if (labDependency.pkg.private !== true) {
          fail(`${sourcePath}: lab source imports must target another private lab (${specifier}).`);
        } else if (pkg.dependencies?.[specifier] !== labDependency.pkg.version) {
          fail(`${sourcePath}: lab imports must be declared in dependencies at target version ${labDependency.pkg.version} (${specifier}).`);
        }
        continue;
      }
      if (officialPackageNames.has(specifier)) {
        if (pkg.peerDependencies?.[specifier] === undefined) {
          fail(`${sourcePath}: official extension imports must be declared as peer dependencies (${specifier}).`);
        }
        continue;
      }
      if (specifier.startsWith(".")) continue;
      fail(`${sourcePath}: lab source may import only json-document, declared official extensions, or declared private lab dependencies (${specifier}).`);
    }
    if (/src\/application|src\/domain|src\/foundation|\.\.\/json-document\/src/.test(source)) {
      fail(`${sourcePath}: lab source must not import json-document internals.`);
    }
    if (/doc\.use\s*\(/.test(source)) {
      fail(`${sourcePath}: lab extension must compose functions, not register plugins.`);
    }
  }

  if (verify && selectedVerification.dirs.has(dir)) {
    verificationTargets.push({
      dir,
      name: pkg.name,
      officialDependencies: Object.keys(pkg.peerDependencies ?? {})
        .filter((dependency) => officialPackageNames.has(dependency)),
      labDependencies: [...(labDependencies.get(dir) ?? [])],
    });
  }
}

if (verify && process.exitCode !== 1) {
  console.log(`extension lab verify scope: ${verificationTargets.length}/${labs.length} package(s); ${selectedVerification.reason}`);
  if (verificationTargets.length > 0) {
    buildCorePackage();
    buildOfficialDependencies(verificationTargets);
    const levels = verificationLevels(verificationTargets);
    console.log(`extension lab dependency levels: ${levels.length}`);
    for (let index = 0; index < levels.length; index += 1) {
      const levelOk = await verifyPackages(levels[index], `level ${index + 1}/${levels.length}`);
      if (!levelOk) break;
    }
  }
}

console.log(`extension lab evaluation ok: ${labs.length} package(s) checked${verify ? `, ${verificationTargets.length} verified` : ""}`);

function officialPackages() {
  const absoluteRoot = join(root, officialRoot);
  if (!existsSync(absoluteRoot)) return [];
  return readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "@interactive-os/json-document")
    .filter((entry) => existsSync(join(absoluteRoot, entry.name, "package.json")))
    .map((entry) => JSON.parse(read(`${officialRoot}/${entry.name}/package.json`)))
    .filter((pkg) => typeof pkg.name === "string" && pkg.name.startsWith("@interactive-os/json-document-"));
}
