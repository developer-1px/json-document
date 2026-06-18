import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const [workspaceRoot, scriptName, ...options] = process.argv.slice(2);
const ifPresent = options.includes("--if-present");
const excluded = new Set(options.flatMap((option, index) => option === "--exclude" ? [options[index + 1]] : []));

if (workspaceRoot === undefined || scriptName === undefined) {
  console.error("usage: node scripts/run-workspace-scripts.mjs <workspace-root> <script> [--if-present] [--exclude <package-name-or-dir>]");
  process.exit(1);
}

const absoluteWorkspaceRoot = join(root, workspaceRoot);
if (!existsSync(absoluteWorkspaceRoot)) {
  console.error(`${workspaceRoot}: workspace root does not exist.`);
  process.exit(1);
}

const packages = readdirSync(absoluteWorkspaceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const packagePath = join(absoluteWorkspaceRoot, entry.name, "package.json");
    if (!existsSync(packagePath)) return null;
    const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
    return {
      dir: `${workspaceRoot}/${entry.name}`,
      name: pkg.name,
      hasScript: Object.hasOwn(pkg.scripts ?? {}, scriptName),
    };
  })
  .filter((pkg) => pkg !== null)
  .filter((pkg) => !excluded.has(pkg.name) && !excluded.has(pkg.dir))
  .sort((left, right) => left.dir.localeCompare(right.dir));

if (packages.length === 0) {
  console.error(`${workspaceRoot}: no workspace packages found.`);
  process.exit(1);
}

function writeOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function buildCorePackage() {
  const result = spawnSync("npm", ["run", "build", "-w", "@interactive-os/json-document"], {
    cwd: root,
    encoding: "utf8",
  });
  writeOutput(result);
  return result.status === 0;
}

function isCoreResolutionFailure(result) {
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return output.includes("Cannot find module '@interactive-os/json-document'")
    || (/TS2307/.test(output) && /(?:^|\.\.\/|\/)json-document\/dist\//.test(output));
}

function runPackageScript(pkg) {
  const args = ["run", scriptName, "-w", pkg.name];
  let retriedCoreResolution = false;

  while (true) {
    const result = spawnSync("npm", args, {
      cwd: root,
      encoding: "utf8",
    });
    if (result.status === 0) {
      writeOutput(result);
      return true;
    }

    if (!retriedCoreResolution && isCoreResolutionFailure(result)) {
      console.error(`$ npm run ${scriptName} -w ${pkg.name} could not resolve @interactive-os/json-document; rebuilding core package and retrying once.`);
      retriedCoreResolution = true;
      if (!buildCorePackage()) {
        writeOutput(result);
        return false;
      }
      continue;
    }

    writeOutput(result);
    return false;
  }
}

if (workspaceRoot === "packages" && !packages.some((pkg) => pkg.name === "@interactive-os/json-document")) {
  if (!buildCorePackage()) {
    process.exit(1);
  }
}

let failed = false;
for (const pkg of packages) {
  if (typeof pkg.name !== "string" || pkg.name.length === 0) {
    console.error(`${pkg.dir}: package name is required.`);
    failed = true;
    continue;
  }
  if (!pkg.hasScript) {
    if (ifPresent) continue;
    console.error(`${pkg.name}: missing "${scriptName}" script.`);
    failed = true;
    continue;
  }

  console.log(`$ npm run ${scriptName} -w ${pkg.name}`);
  if (!runPackageScript(pkg)) {
    failed = true;
  }
}

if (failed) process.exit(1);
