import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export function readJson(path) {
  return JSON.parse(readFileSync(join(repositoryRoot, path), "utf8"));
}

const rootPackage = readJson("package.json");
export const libraryDirectories = rootPackage.workspaces.filter((directory) =>
  directory.startsWith("packages/"),
);
export const libraries = libraryDirectories.map((directory) => ({
  directory,
  manifest: readJson(`${directory}/package.json`),
  tsconfig: readJson(`${directory}/tsconfig.json`),
}));
export const libraryByName = new Map(libraries.map((library) => [library.manifest.name, library]));

export function internalDependencies(library) {
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

export function topologicalLibraries() {
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
