import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import modules from "../architecture/modules.json" with { type: "json" };
import { siteRoutes, resolveSiteRoutes } from "../site/route-registry.mjs";
import { applicationRelationErrors, moduleRegistrationErrors, sourceImportGraph } from "./architecture-drift.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("actual workspace exports and references belong to their registered package", () => {
  assert.deepEqual(moduleRegistrationErrors(root, modules, siteRoutes), []);
});

test("rejects a missing owner, wrong package name, detached docs and a stale export source", () => {
  assert.ok(moduleRegistrationErrors(root, modules.slice(1), siteRoutes).some(error => error.includes("denominator")));
  for (const [change, message] of [
    [{ packageName: "wrong" }, "Package name drift"],
    [{ referencePath: "docs/public/architecture.md" }, "Package-owned reference"],
    [{ entrypoint: modules[1].entrypoint }, "Public export source drift"],
  ]) {
    const changed = [{ ...modules[0], ...change }, ...modules.slice(1)];
    assert.ok(moduleRegistrationErrors(root, changed, siteRoutes).some(error => error.includes(message)));
  }
});

test("application evidence starts at its actual route, not another product", () => {
  const applications = siteRoutes.filter(route => route.modulePaths);
  const changed = siteRoutes.map(route => route === applications[0] ? { ...route, applicationSource: applications[1].applicationSource } : route);
  assert.ok(moduleRegistrationErrors(root, modules, changed).some(error => error.includes("Application route source drift")));
});

test("site cannot redefine a module responsibility or navigation position", () => {
  const page = { path: "/api", module: { packageName: modules[0].packageName, usagePaths: ["/usage"] } };
  assert.equal(resolveSiteRoutes([page], modules)[0].navigationGroup, modules[0].positions[0]);
  assert.throws(() => resolveSiteRoutes([{ ...page, documentSource: "docs/public/architecture.md" }], modules), /duplicates architecture/);
  assert.throws(() => resolveSiteRoutes([{ ...page, navigationGroup: "Connector" }], modules), /duplicates architecture/);
  assert.throws(() => resolveSiteRoutes([{ ...page, module: { ...page.module, responsibility: "override" } }], modules), /duplicates architecture/);
  assert.throws(() => resolveSiteRoutes([{ ...page, module: { ...page.module, packageName: "missing" } }], modules), /Unknown architecture/);
});

test("consumer evidence follows local .js imports and cycles, excludes raw text, and rejects private subpaths", () => {
  const fixture = mkdtempSync(join(tmpdir(), "architecture-imports-"));
  const write = (path, source) => { mkdirSync(dirname(join(fixture, path)), { recursive: true }); writeFileSync(join(fixture, path), source); };
  try {
    const owners = ["used", "unused"].map(name => ({ packageName: `@test/${name}`, sourceDirectory: `packages/${name}`, entrypoint: `packages/${name}/src/index.ts`, subpaths: [] }));
    for (const owner of owners) {
      write(`${owner.sourceDirectory}/package.json`, JSON.stringify({ name: owner.packageName, exports: { ".": { types: "./dist/index.d.ts" } } }));
      write(owner.entrypoint, "export const value = 1;");
    }
    write("app.ts", 'import "./local.js"; import source from "./raw.ts?raw"; const example = "import x from \'@test/unused\'";');
    write("local.ts", 'export { value } from "@test/used"; import "./app.js";');
    write("raw.ts", 'import "@test/unused";');
    const graph = sourceImportGraph(fixture, "app.ts", owners);
    assert.deepEqual(graph.errors, []);
    assert.deepEqual([...graph.packages.keys()], ["@test/used"]);
    assert.deepEqual(graph.packages.get("@test/used"), ["app.ts", "local.ts", "@test/used"]);
    const routes = owners.map(owner => ({ path: `/${owner.packageName}`, module: owner }));
    assert.deepEqual(applicationRelationErrors({ path: "/app", modulePaths: ["/@test/used"] }, graph, routes), []);
    assert.match(applicationRelationErrors({ path: "/app", modulePaths: ["/@test/unused"] }, graph, routes)[0], /evidence missing/);
    write("app.ts", 'import "@test/used/private";');
    assert.ok(sourceImportGraph(fixture, "app.ts", owners).errors.some(error => error.includes("Non-public import")));
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
