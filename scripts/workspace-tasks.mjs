import { spawn, spawnSync } from "node:child_process";
import { availableParallelism } from "node:os";
import { join, normalize } from "node:path";

import {
  internalDependencies,
  libraries,
  libraryDirectories,
  readJson,
  repositoryRoot,
  topologicalLibraries,
} from "./workspace-graph.mjs";

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
  const requested = new Set(process.argv.slice(3));
  for (const library of topologicalLibraries()) {
    if (requested.size > 0 && !requested.has(library.manifest.name)) continue;
    if (library.manifest.scripts?.[script] === undefined) {
      console.log(`[workspace:${script}] skip ${library.manifest.name}: no script`);
      continue;
    }
    console.log(`[workspace:${script}] ${library.manifest.name}`);
    run("npm", ["run", script, "--workspace", library.manifest.name]);
  }
}

// Whole-workspace verification: one parallel build, parallel test type checks, one vitest run.
async function verifyAll() {
  for (const library of libraries) {
    if (library.manifest.scripts?.["layers:check"] !== undefined) run("npm", ["run", "layers:check", "--workspace", library.manifest.name]);
  }
  run("npm", ["run", "build"]);
  const tsc = join(repositoryRoot, "node_modules/.bin/tsc");
  const checks = libraries.flatMap((library) => (library.manifest.scripts?.typecheck ?? "")
    .split("&&").map((command) => command.trim()).filter(Boolean)
    .map((command) => {
      const [binary, ...args] = command.split(/\s+/);
      if (binary !== "tsc") throw new Error(`${library.directory}: typecheck must only run tsc: ${command}`);
      return { library, args };
    }));
  const failures = [];
  const queue = [...checks];
  await Promise.all(Array.from({ length: availableParallelism() }, async () => {
    for (let check = queue.shift(); check !== undefined; check = queue.shift()) {
      const output = await new Promise((resolve) => {
        const child = spawn(tsc, check.args, { cwd: join(repositoryRoot, check.library.directory), env: process.env });
        let text = "";
        child.stdout.on("data", (chunk) => { text += chunk; });
        child.stderr.on("data", (chunk) => { text += chunk; });
        child.on("close", (status) => resolve({ status, text }));
      });
      if (output.status !== 0) failures.push(`[workspace:typecheck] ${check.library.manifest.name}: tsc ${check.args.join(" ")}\n${output.text}`);
    }
  }));
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(failure));
    process.exit(1);
  }
  console.log(`[workspace:typecheck] ok: ${checks.length} configs`);
  run("npm", ["exec", "vitest", "--", "run", "--config", "vitest.config.ts", "--project", "!site"]);
  for (const library of libraries) {
    if (library.manifest.scripts?.["smoke:package"] !== undefined) run("npm", ["run", "smoke:package", "--workspace", library.manifest.name]);
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
else if (command === "verify") process.argv.length > 3 ? runOptionalScript("verify") : await verifyAll();
else if (command === "pack") packLibraries();
else if (command === "build-dependencies") buildDependencies();
else if (command === "list") console.log(topologicalLibraries().map(({ manifest }) => manifest.name).join("\n"));
else {
  console.error("usage: node scripts/workspace-tasks.mjs <build-dependencies|check|list|verify [workspace...]|pack>");
  process.exit(2);
}
