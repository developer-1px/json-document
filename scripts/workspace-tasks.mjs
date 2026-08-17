import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(path) {
  return JSON.parse(readFileSync(join(repositoryRoot, path), "utf8"));
}

const rootPackage = readJson("package.json");
const libraryDirectories = rootPackage.workspaces.filter((directory) =>
  directory.startsWith("packages/"),
);
const libraries = libraryDirectories.map((directory) => ({
  directory,
  manifest: readJson(`${directory}/package.json`),
  tsconfig: readJson(`${directory}/tsconfig.json`),
}));
const libraryByName = new Map(libraries.map((library) => [library.manifest.name, library]));

function internalDependencies(library) {
  const manifest = library.manifest;
  const names = Object.keys({
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
  });
  return names.flatMap((name) => {
    const dependency = libraryByName.get(name);
    return dependency === undefined ? [] : [dependency];
  });
}

function topologicalLibraries() {
  const result = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(library) {
    const name = library.manifest.name;
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`workspace dependency cycle: ${name}`);
    visiting.add(name);
    for (const dependency of internalDependencies(library)) visit(dependency);
    visiting.delete(name);
    visited.add(name);
    result.push(library);
  }
  for (const library of libraries) visit(library);
  return result;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runCaptured(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: process.env,
    encoding: "utf8",
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function runOptionalScript(script) {
  for (const library of topologicalLibraries()) {
    if (library.manifest.scripts?.[script] === undefined) {
      console.log(`[workspace:${script}] skip ${library.manifest.name}: no script`);
      continue;
    }
    console.log(`[workspace:${script}] ${library.manifest.name}`);
    run("npm", ["run", script, "--workspace", library.manifest.name]);
  }
}

function packLibraries() {
  run("npm", ["run", "build"]);
  for (const library of topologicalLibraries()) {
    if (library.manifest.private === true) {
      console.log(`[workspace:pack] skip ${library.manifest.name}: private`);
      continue;
    }
    console.log(`[workspace:pack] ${library.manifest.name}`);
    const output = runCaptured("npm", [
      "pack",
      "--workspace",
      library.manifest.name,
      "--dry-run",
      "--json",
      "--cache",
      "./.npm-cache",
    ]);
    const packed = JSON.parse(output)[0];
    if (packed.files.some(({ path }) => path.endsWith(".tsbuildinfo"))) {
      throw new Error(`${library.manifest.name}: TypeScript build metadata leaked into package`);
    }
    console.log(`[workspace:pack] ok ${packed.name}: ${packed.entryCount} files`);
  }
}

function buildDependencies() {
  const currentDirectory = normalize(process.cwd());
  const library = libraries.find(({ directory }) =>
    currentDirectory === normalize(join(repositoryRoot, directory)),
  );
  if (library === undefined) throw new Error("build-dependencies must run from a library workspace");
  const dependencies = new Set(internalDependencies(library).map(({ manifest }) => manifest.name));
  const configs = topologicalLibraries()
    .filter(({ manifest }) => dependencies.has(manifest.name))
    .map(({ directory }) => `${directory}/tsconfig.json`);
  if (configs.length === 0) return;
  run("npm", ["exec", "tsc", "--", "-b", ...configs]);
}

function checkWorkspaceContract() {
  const solution = readJson("tsconfig.build.json");
  const solutionDirectories = solution.references.map(({ path }) => normalize(path.replace(/^\.\//, "")));
  if (JSON.stringify(solutionDirectories) !== JSON.stringify(libraryDirectories)) {
    throw new Error("tsconfig.build.json references must match library workspaces");
  }
  for (const library of libraries) {
    if (library.manifest.private === true) throw new Error(`library workspace must be publishable: ${library.directory}`);
    for (const script of ["build", "verify"]) {
      if (library.manifest.scripts?.[script] === undefined) throw new Error(`${library.directory}: missing ${script} script`);
    }
    const manifest = library.manifest;
    const expected = internalDependencies(library)
      .filter(({ manifest: dependency }) =>
        manifest.dependencies?.[dependency.name] !== undefined ||
        manifest.optionalDependencies?.[dependency.name] !== undefined ||
        manifest.peerDependencies?.[dependency.name] !== undefined)
      .map(({ directory }) => directory)
      .sort();
    const actual = (library.tsconfig.references ?? [])
      .map(({ path }) => normalize(join(library.directory, path)))
      .sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${library.directory}: project references do not match runtime dependencies`);
    }
  }
  console.log(`workspace task contract ok: ${libraries.length} libraries`);
}

const command = process.argv[2];
if (command === "check") checkWorkspaceContract();
else if (command === "verify") runOptionalScript("verify");
else if (command === "pack") packLibraries();
else if (command === "build-dependencies") buildDependencies();
else if (command === "list") console.log(topologicalLibraries().map(({ manifest }) => manifest.name).join("\n"));
else {
  console.error("usage: node scripts/workspace-tasks.mjs <build-dependencies|check|list|verify|pack>");
  process.exit(2);
}
