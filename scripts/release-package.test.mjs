import assert from "node:assert/strict";
import test from "node:test";

import { readJson } from "./workspace-graph.mjs";
import { releases, resolveRelease } from "./release-package.mjs";

const firstKit = [
  ["json-document-v3.0.0", "@interactive-os/json-document", "latest", "packages/json-document/package.json"],
  ["json-document-selection-v0.1.0-rc.0", "@interactive-os/json-document-selection", "next", "packages/json-document-selection/package.json"],
  ["json-document-editing-v0.1.0-rc.0", "@interactive-os/json-document-editing", "next", "packages/json-document-editing/package.json"],
  ["json-document-composer-v0.1.0-rc.0", "@interactive-os/json-document-composer", "next", "packages/json-document-composer/package.json"],
  ["json-document-composer-react-v0.1.0-rc.0", "@interactive-os/json-document-composer-react", "next", "packages/json-document-composer-react/package.json"],
  ["json-document-file-intake-v0.1.0-rc.0", "@interactive-os/json-document-file-intake", "next", "packages/json-document-file-intake/package.json"],
  ["json-document-rich-text-suggestion-v0.1.0-rc.0", "@interactive-os/json-document-rich-text-suggestion", "next", "packages/json-document-rich-text-suggestion/package.json"],
  ["json-document-rich-text-suggestion-react-v0.1.0-rc.0", "@interactive-os/json-document-rich-text-suggestion-react", "next", "packages/json-document-rich-text-suggestion-react/package.json"],
  ["json-document-rich-text-mention-v0.1.0-rc.0", "@interactive-os/json-document-rich-text-mention", "next", "packages/json-document-rich-text-mention/package.json"],
  ["json-document-rich-text-mention-react-v0.1.0-rc.0", "@interactive-os/json-document-rich-text-mention-react", "next", "packages/json-document-rich-text-mention-react/package.json"],
  ["json-document-web-v0.1.0-rc.0", "@interactive-os/json-document-web", "next", "packages/json-document-web/package.json"],
  ["json-document-react-v0.1.0-rc.0", "@interactive-os/json-document-react", "next", "packages/json-document-react/package.json"],
];

const databaseHand = [
  "json-document-database-v0.1.0-rc.0",
  "@interactive-os/json-document-database",
  "next",
  "packages/json-document-database/package.json",
];

test("첫 npm kit의 stable과 RC release stream을 구분한다", () => {
  for (const [tag, workspace, distTag, packageFile] of firstKit) {
    assert.deepEqual(resolveRelease(tag), {
      workspace,
      distTag,
      version: tag.slice(tag.lastIndexOf("-v") + 2),
      packageFile,
    });
  }
});

test("manifest version과 다른 tag를 거부한다", () => {
  assert.throws(() => resolveRelease("json-document-editing-v0.1.0-rc.9"), /does not match/);
});

test("Database Hand를 next release stream으로 해석한다", () => {
  const [tag, workspace, distTag, packageFile] = databaseHand;
  assert.deepEqual(resolveRelease(tag), { workspace, distTag, version: "0.1.0-rc.0", packageFile });
});

test("지원하지 않는 package tag를 거부한다", () => {
  assert.throws(() => resolveRelease("json-document-rich-text-v0.1.0-rc.0"), /unsupported release tag/);
});

test("기존 publish workflow의 모든 release 경로를 보존한다", () => {
  for (const release of releases) {
    const pkg = readJson(release.packageFile);
    const resolved = resolveRelease(`${release.prefix}${pkg.version}`);
    assert.equal(resolved.workspace, release.workspace);
    assert.equal(resolved.distTag, pkg.version.includes("-rc.") ? "next" : "latest");
  }
});
