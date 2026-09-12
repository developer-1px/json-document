import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

/** Static source reachability, including type imports and re-exports; not runtime calls. */
export function sourceImportGraph(root, entrypoint, modules) {
  const byName = new Map(modules.map(module => [module.packageName, module]));
  const paths = Object.fromEntries(modules.flatMap(module => [module, ...module.subpaths]
    .map(entry => [entry.packageName, [entry.entrypoint]])));
  const options = { baseUrl: root, paths, moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true, jsx: ts.JsxEmit.ReactJSX };
  const queue = [[entrypoint]];
  const visited = new Set();
  const packages = new Map();
  const errors = [];
  while (queue.length) {
    const chain = queue.shift();
    const file = chain.at(-1);
    if (visited.has(file)) continue;
    visited.add(file);
    if (!existsSync(join(root, file))) { errors.push(`Missing source: ${file}`); continue; }
    const source = readFileSync(join(root, file), "utf8");
    for (const imported of ts.preProcessFile(source, true, true).importedFiles) {
      const specifier = imported.fileName;
      // Vite raw/url imports display source text; they do not consume its APIs.
      if (/[?](?:raw|url)(?:&|$)/.test(specifier)) continue;
      const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
      const owner = byName.get(packageName);
      if (owner) {
        const manifest = JSON.parse(readFileSync(join(root, owner.sourceDirectory, "package.json"), "utf8"));
        const key = specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;
        if (!Object.hasOwn(manifest.exports ?? {}, key)) errors.push(`Non-public import: ${file} -> ${specifier}`);
        if (!packages.has(packageName)) packages.set(packageName, [...chain, specifier]);
      }
      if (!owner && !specifier.startsWith(".")) continue;
      if (/\.(?:css|json|svg|png)(?:\?|$)/.test(specifier)) continue;
      const resolved = ts.resolveModuleName(specifier, resolve(root, file), options, ts.sys).resolvedModule?.resolvedFileName;
      if (!resolved) { errors.push(`Unresolved source import: ${file} -> ${specifier}`); continue; }
      const path = relative(root, resolved);
      if (path.startsWith("../") || path.includes("node_modules/")) continue;
      queue.push([...chain, path]);
    }
  }
  return { packages, errors };
}

export function moduleRegistrationErrors(root, modules, routes) {
  const errors = [];
  const workspaces = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).workspaces.filter(path => path.startsWith("packages/"));
  for (const directory of workspaces) {
    if (modules.filter(module => module.sourceDirectory === directory).length !== 1) errors.push(`Architecture owner denominator: ${directory}`);
  }
  for (const owner of modules) {
    if (!workspaces.includes(owner.sourceDirectory)) { errors.push(`Unknown package directory: ${owner.sourceDirectory}`); continue; }
    const manifest = JSON.parse(readFileSync(join(root, owner.sourceDirectory, "package.json"), "utf8"));
    if (manifest.name !== owner.packageName) errors.push(`Package name drift: ${owner.sourceDirectory}`);
    if (!owner.responsibility?.trim() || !owner.positions?.length || new Set(owner.positions).size !== owner.positions.length) errors.push(`Invalid responsibility: ${owner.packageName}`);
    const page = routes.filter(route => route.module?.packageName === owner.packageName);
    if (page.length !== 1 || page[0].documentSource !== owner.referencePath) errors.push(`API owner route drift: ${owner.packageName}`);
    if (owner.referencePath !== `${owner.sourceDirectory}/docs/api-reference.md` || !existsSync(join(root, owner.referencePath))) errors.push(`Package-owned reference missing: ${owner.packageName}`);
    const config = ts.readConfigFile(join(root, owner.sourceDirectory, "tsconfig.json"), ts.sys.readFile);
    const compiler = ts.parseJsonConfigFileContent(config.config, ts.sys, join(root, owner.sourceDirectory)).options;
    for (const entry of [owner, ...owner.subpaths]) {
      const subpath = entry.packageName === owner.packageName ? "." : `.${entry.packageName.slice(owner.packageName.length)}`;
      const target = manifest.exports?.[subpath];
      const types = typeTarget(target);
      const expectedSource = types && relative(root, resolve(compiler.rootDir, relative(compiler.outDir, resolve(root, owner.sourceDirectory, types)))).replace(/\.d\.ts$/, "");
      if (!entry.entrypoint.startsWith(`${owner.sourceDirectory}/`) || !existsSync(join(root, entry.entrypoint)) || !expectedSource || ![`${expectedSource}.ts`, `${expectedSource}.tsx`].includes(entry.entrypoint)) {
        errors.push(`Public export source drift: ${entry.packageName}`);
      }
    }
  }
  for (const app of routes.filter(route => route.modulePaths)) {
    const file = app.applicationSource && join(root, app.applicationSource);
    const declared = file && existsSync(file)
      ? /createFileRoute\(\s*["']([^"']+)["']/.exec(readFileSync(file, "utf8"))?.[1]?.replace(/^\/_page(?=\/)/, "")
      : undefined;
    if (declared !== app.path) errors.push(`Application route source drift: ${app.path}`);
  }
  return errors;
}

function typeTarget(target) {
  if (!target || typeof target !== "object") return undefined;
  return typeof target.types === "string" ? target.types : Object.values(target).map(typeTarget).find(Boolean);
}

export function applicationRelationErrors(route, graph, routes) {
  return (route.modulePaths ?? []).flatMap(path => {
    const owner = routes.find(page => page.path === path)?.module?.packageName;
    return owner && graph.packages.has(owner) ? [] : [`Application import evidence missing: ${route.path} -> ${path}`];
  });
}
