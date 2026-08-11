import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workspace = await mkdtemp(join(tmpdir(), "json-document-v3-package-"));
const npmCache = join(workspace, ".npm-cache");
const npmEnv = {
  ...process.env,
  npm_config_cache: npmCache,
  npm_config_package_lock: "false",
};
const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const publicContract = JSON.parse(
  await readFile(join(packageRoot, "public-contract.json"), "utf8"),
);
const rootValueExports = publicContract.root.values;
const rootTypeExports = publicContract.root.types;
const rootExports = [...rootValueExports, ...rootTypeExports];
const removedSubpaths = [
  "@interactive-os/json-document/session",
  "@interactive-os/json-document/react",
  "@interactive-os/json-document/patch",
  "@interactive-os/json-document/pointer",
  "@interactive-os/json-document/selection",
  "@interactive-os/json-document/text-surface",
  "@interactive-os/json-document/schema",
  "@interactive-os/json-document/clipboard",
];

function run(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      env: npmEnv,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stdout = Buffer.isBuffer(error.stdout)
      ? error.stdout.toString("utf8")
      : String(error.stdout ?? "");
    const stderr = Buffer.isBuffer(error.stderr)
      ? error.stderr.toString("utf8")
      : String(error.stderr ?? "");
    throw new Error(
      [
        `Command failed: ${[command, ...args].join(" ")}`,
        `cwd: ${cwd}`,
        stdout.trim() && `stdout:\n${stdout.trim()}`,
        stderr.trim() && `stderr:\n${stderr.trim()}`,
      ].filter(Boolean).join("\n\n"),
      { cause: error },
    );
  }
}

function expectImportFailure(specifier) {
  try {
    run(
      "node",
      ["--input-type=module", "--eval", `await import(${JSON.stringify(specifier)})`],
      workspace,
    );
  } catch (error) {
    if (String(error).includes("ERR_PACKAGE_PATH_NOT_EXPORTED")) return;
    throw error;
  }
  throw new Error(`Private package path unexpectedly resolved: ${specifier}`);
}

async function filesUnder(root, base = root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...await filesUnder(path, base));
    } else if (entry.isFile()) {
      result.push(relative(base, path));
    }
  }
  return result.sort();
}

function moduleSpecifiers(source) {
  return [
    ...source.matchAll(/\b(?:import|export)\s+(?:type\s+)?[^;"']*?\s+from\s+["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s+["']([^"']+)["']/g),
  ].map((match) => match[1]);
}

function declarationExportNames(source) {
  const names = [];
  for (const match of source.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) {
    names.push(
      ...match[1]
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const normalized = part.replace(/^type\s+/, "");
          return normalized.match(/\s+as\s+([A-Za-z_$][\w$]*)$/)?.[1]
            ?? normalized.split(/\s+/)[0];
        }),
    );
  }
  return [...new Set(names)].sort();
}

try {
  if (Object.keys(packageJson.exports).join(",") !== ".") {
    throw new Error("The published package must expose only the root entrypoint.");
  }
  if (packageJson.peerDependencies !== undefined) {
    throw new Error("The v3 kernel must not publish peer dependencies.");
  }
  if (packageJson.peerDependenciesMeta !== undefined) {
    throw new Error("The v3 kernel must not publish peer dependency metadata.");
  }
  if (packageJson.dependencies !== undefined) {
    throw new Error("The v3 kernel must not publish runtime dependencies.");
  }
  if (rootValueExports.length !== 8 || rootTypeExports.length !== 13) {
    throw new Error("The root contract must contain exactly 8 values and 13 types.");
  }

  const packResult = JSON.parse(run(
    "npm",
    ["pack", "--json", "--pack-destination", workspace],
    packageRoot,
  ))[0];
  const tarball = isAbsolute(packResult.filename)
    ? packResult.filename
    : join(workspace, packResult.filename);
  if (!existsSync(tarball)) throw new Error(`Tarball missing: ${tarball}`);
  if (packResult.name !== packageJson.name || packResult.version !== packageJson.version) {
    throw new Error("Packed identity does not match package.json.");
  }
  if (packResult.entryCount !== packResult.files.length) {
    throw new Error("Packed file count does not match npm metadata.");
  }
  if (packResult.bundled.length !== 0) {
    throw new Error("The v3 kernel must not bundle dependencies.");
  }

  const packedFiles = packResult.files.map((file) => file.path);
  const allowedRoots = new Set([...packageJson.files, "package.json"]);
  for (const file of packedFiles) {
    if (!allowedRoots.has(file.split("/")[0])) {
      throw new Error(`Unexpected packed file: ${file}`);
    }
    if (
      file.includes("node_modules/")
      || file.endsWith(".map")
      || (file.endsWith(".ts") && !file.endsWith(".d.ts"))
    ) {
      throw new Error(`Development artifact was packed: ${file}`);
    }
  }
  for (const required of ["README.md", "LICENSE", "public-contract.json", "package.json"]) {
    if (!packedFiles.includes(required)) throw new Error(`Packed file missing: ${required}`);
  }

  await writeFile(
    join(workspace, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        "@interactive-os/json-document": `file:${tarball}`,
      },
    }, null, 2),
  );
  run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock"],
    workspace,
  );

  const installedRoot = join(
    workspace,
    "node_modules",
    "@interactive-os",
    "json-document",
  );
  const installedPackage = JSON.parse(
    await readFile(join(installedRoot, "package.json"), "utf8"),
  );
  if (Object.keys(installedPackage.exports).join(",") !== ".") {
    throw new Error("Installed package exposed a non-root entrypoint.");
  }
  if (
    installedPackage.dependencies !== undefined
    || installedPackage.peerDependencies !== undefined
    || installedPackage.peerDependenciesMeta !== undefined
  ) {
    throw new Error("Installed package contains runtime or peer dependencies.");
  }

  const distRoot = join(installedRoot, "dist");
  const distFiles = await filesUnder(distRoot);
  for (const file of distFiles) {
    if (
      file.startsWith("application/session/")
      || file.startsWith("application/react-document/")
      || /^domain\/(?:clipboard|document|editing|schema|selection|text-surface)\//.test(file)
      || file === "foundation/patch/schema.js"
      || file === "foundation/patch/schema.d.ts"
      || file === "foundation/patch/schema-contract.d.ts"
    ) {
      throw new Error(`Removed implementation leaked into dist: ${file}`);
    }
    const source = await readFile(join(distRoot, file), "utf8");
    for (const specifier of moduleSpecifiers(source)) {
      if (!specifier.startsWith(".")) {
        throw new Error(`External dependency leaked into dist: ${file} -> ${specifier}`);
      }
    }
  }

  const rootDeclaration = await readFile(
    join(installedRoot, packageJson.exports["."].types),
    "utf8",
  );
  const declaredExports = declarationExportNames(rootDeclaration);
  if (JSON.stringify(declaredExports) !== JSON.stringify([...rootExports].sort())) {
    throw new Error(
      `Root declarations drifted:\nexpected ${[...rootExports].sort().join(", ")}\nactual ${declaredExports.join(", ")}`,
    );
  }

  await writeFile(
    join(workspace, "runtime-smoke.mjs"),
    [
      'import * as api from "@interactive-os/json-document";',
      `const expected = ${JSON.stringify([...rootValueExports].sort())};`,
      'const actual = Object.keys(api).sort();',
      'if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`runtime exports: ${actual}`);',
      'const document = api.createJSONDocument({ title: "draft", tags: [] });',
      'if (JSON.stringify(Object.keys(document).sort()) !== JSON.stringify(["at", "commit", "query", "subscribe", "validatePatch", "value"])) throw new Error("document surface drifted");',
      'const changes = [];',
      'document.subscribe((change) => changes.push(change));',
      'const result = document.commit([{ op: "add", path: "/tags/-", value: "v3" }]);',
      'if (!result.ok || document.value.tags[0] !== "v3" || changes.length !== 1) throw new Error("commit failed");',
      'const patched = api.applyPatch(document.value, [{ op: "replace", path: "/title", value: "stable" }]);',
      'if (!patched.ok || patched.value.title !== "stable") throw new Error("pure patch failed");',
    ].join("\n"),
  );
  run("node", ["runtime-smoke.mjs"], workspace);

  for (const subpath of removedSubpaths) expectImportFailure(subpath);
  const rootImportTarget = packageJson.exports["."].import.replace(/^\.\//, "");
  expectImportFailure(`@interactive-os/json-document/${rootImportTarget}`);
  expectImportFailure("@interactive-os/json-document/package.json");

  await writeFile(
    join(workspace, "type-smoke.ts"),
    [
      `import { ${rootValueExports.join(", ")} } from "@interactive-os/json-document";`,
      `import type { ${rootTypeExports.join(", ")} } from "@interactive-os/json-document";`,
      'const document: JSONDocument = createJSONDocument({ text: "a" });',
      'type Members = keyof JSONDocument;',
      'const members: Members[] = ["value", "at", "query", "validatePatch", "commit", "subscribe"];',
      'const operation: JSONPatchOperation = { op: "replace", path: "/text", value: "b" };',
      'const metadata: JSONChangeMetadata = { source: "type-smoke" };',
      'const result: JSONDocumentCommitResult = document.commit([operation], { metadata });',
      'const pure: JSONPatchResult = applyPatch(document.value, [operation]);',
      'const pointer: Pointer = appendSegment(buildPointer(["text"]), 0);',
      'const values: JSONValue[] = [document.value, pointer, null];',
      'void [members, result, pure, values, parsePointer, tryParsePointer, parentPointer, trackPointer];',
      'type Remaining = JSONAppliedChange | JSONPatchValidationResult | JSONDocumentOptions | JSONPatchValidationResult | JSONDocumentCommitOptions | QueryResult | ReadResult;',
      'declare const remaining: Remaining;',
      'void remaining;',
    ].join("\n"),
  );
  const typeScriptBin = resolve(
    packageRoot,
    "..",
    "..",
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  run(
    "node",
    [
      typeScriptBin,
      "--noEmit",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--strict",
      "--exactOptionalPropertyTypes",
      "--noUncheckedIndexedAccess",
      "type-smoke.ts",
    ],
    workspace,
  );

  console.log(
    `json-document package smoke ok: ${packResult.entryCount} files, `
      + `${(packResult.size / 1000).toFixed(1)} kB packed, `
      + `${(packResult.unpackedSize / 1000).toFixed(1)} kB unpacked`,
  );
} finally {
  await rm(workspace, { force: true, recursive: true });
}
