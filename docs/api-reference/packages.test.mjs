import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { apiReferenceCoverageErrors, apiReferencePackages } from "./packages.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const manifests = read("package.json").workspaces.map((workspace) => read(`${workspace}/package.json`));

test("every published TypeScript entrypoint has its owner reference", () => {
  assert.deepEqual(apiReferenceCoverageErrors(manifests), []);
});

test("detects the omitted collaboration text subpath even when every package root is registered", () => {
  const missingText = apiReferencePackages.map((entry) => ({
    ...entry,
    subpaths: entry.subpaths.filter((subpath) => !subpath.packageName.endsWith("/text")),
  }));
  assert.deepEqual(apiReferenceCoverageErrors(manifests, missingText), [
    "API reference missing: @interactive-os/json-document-collaboration/text",
  ]);
});

test("does not mistake CSS exports for TypeScript contracts and rejects stale entries", () => {
  const entry = { packageName: "example", subpaths: [] };
  const published = [{ name: "example", exports: { ".": { types: "./index.d.ts" }, "./styles.css": "./styles.css" } }];
  assert.deepEqual(apiReferenceCoverageErrors(published, [entry]), []);
  assert.deepEqual(apiReferenceCoverageErrors(published, [{ ...entry, subpaths: [{ packageName: "example/removed" }] }]), [
    "API reference is not public: example/removed",
  ]);
});
