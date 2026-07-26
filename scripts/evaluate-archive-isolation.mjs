import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const expectedWorkspaces = ["packages/json-document", "apps/site"];
const rootPackage = json("package.json");
const kernelPackage = json("packages/json-document/package.json");
const failures = [];

if (JSON.stringify(rootPackage.workspaces) !== JSON.stringify(expectedWorkspaces)) {
  failures.push(`active workspaces must be ${expectedWorkspaces.join(", ")}`);
}

if (JSON.stringify(Object.keys(kernelPackage.exports ?? {})) !== JSON.stringify(["."])) {
  failures.push("the v2 package must expose only its root entrypoint");
}

for (const requiredPath of [
  "archive/v1/packages",
  "archive/v1/apps",
  "archive/v1/labs/extensions",
  "archive/v1/json-document/src/application/session",
  "archive/v1/json-document/src/application/react-document",
]) {
  if (!existsSync(join(root, requiredPath))) {
    failures.push(`missing archived 1.x boundary: ${requiredPath}`);
  }
}

const forbiddenImport =
  /@interactive-os\/json-document\/(?:session|react)\b|src\/application\/(?:session|react-document)\b/;
for (const activePath of [
  "packages/json-document/src",
  "apps/site/src",
  "config",
]) {
  for (const path of sourceFiles(activePath)) {
    if (forbiddenImport.test(read(path))) {
      failures.push(`archived API leaked into active source: ${path}`);
    }
  }
}

const publishWorkflow = read(".github/workflows/publish.yml");
if (
  /json-document-extensions-v|Publish extension|publish extension|packages\/grouping/.test(
    publishWorkflow,
  )
) {
  failures.push("the publish workflow still contains a 1.x extension release path");
}

if (failures.length > 0) {
  console.error(
    `v2 archive isolation failed:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "v2 archive isolation ok: 2 active workspaces, 1 publishable entrypoint",
  );
}

function json(path) {
  return JSON.parse(read(path));
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function sourceFiles(dir) {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?|json)$/.test(entry.name)
      ? [path]
      : [];
  });
}
