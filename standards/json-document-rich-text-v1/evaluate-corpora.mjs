import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const [model, browser, performance] = await Promise.all([
  readJson("corpora/model.json"),
  readJson("corpora/browser.json"),
  readJson("corpora/performance.json"),
]);

assert.equal(model.suite, "model");
assert.equal(browser.suite, "browser");
assert.equal(performance.suite, "performance");
assert.notEqual(model.suite, browser.suite);
assert.notEqual(browser.suite, performance.suite);

assert(Array.isArray(model.cases) && model.cases.length > 0, "model corpus requires cases");
const modelIds = model.cases.map((entry) => entry.id);
assert.equal(new Set(modelIds).size, modelIds.length, "model case IDs must be unique");
for (const entry of model.cases) {
  assert(typeof entry.id === "string" && entry.id.length > 0, "model case requires id");
  assert(typeof entry.source?.url === "string" && entry.source.url.startsWith("http"), `${entry.id}: source.url is required`);
  assert(typeof entry.source?.meaning === "string" && entry.source.meaning.length > 0, `${entry.id}: source.meaning is required`);
  assert(entry.initial?.type === "doc", `${entry.id}: initial canonical JSON is required`);
  assert(entry.selection?.kind === "range", `${entry.id}: initial selection is required`);
  assert(Array.isArray(entry.intents) && entry.intents.length > 0, `${entry.id}: intents are required`);
  assert(entry.expect && typeof entry.expect === "object", `${entry.id}: expect is required`);
}

const requiredModel = [
  "repeated-character-insert",
  "repeated-space-insert",
  "consecutive-enter-empty-split",
  "repeated-backspace",
  "repeated-forward-delete",
  "text-boundary-join",
  "noncollapsed-same-node-replace",
  "cross-node-selection-remove",
  "mark-toggle-and-block-type",
  "hard-break-and-child-point",
  "unicode-scalar-and-korean-insert",
  "plain-paste-and-cut",
];
for (const id of requiredModel) {
  assert(modelIds.includes(id), `model corpus missing required case ${id}`);
}

assert.deepEqual(browser.matrix, ["chromium", "firefox", "webkit"]);
const requiredDefectFamilies = [
  "composition", "selection", "deletion", "atom-void", "placeholder-managed-break",
  "clipboard", "unexpected-dom-mutation", "focus-shadow-root", "android-soft-keyboard",
];
assert.deepEqual(browser.defectFamilies.map((entry) => entry.id), requiredDefectFamilies);
for (const family of browser.defectFamilies) {
  assert(["verified", "synthetic", "unavailable", "unverified"].includes(family.status), `${family.id}: valid status is required`);
  assert(typeof family.observation === "string" && family.observation.length > 0, `${family.id}: observation is required`);
  assert(typeof family.invariant === "string" && family.invariant.length > 0, `${family.id}: invariant is required`);
  assert(typeof family.revisitWhen === "string" && family.revisitWhen.length > 0, `${family.id}: revisitWhen is required`);
}
assert(Array.isArray(browser.cases) && browser.cases.length > 0, "browser corpus requires cases");
const browserIds = browser.cases.map((entry) => entry.id);
assert.equal(new Set(browserIds).size, browserIds.length, "browser case IDs must be unique");
for (const entry of browser.cases) {
  assert(typeof entry.source?.url === "string" && entry.source.url.startsWith("http"), `${entry.id}: source.url is required`);
  assert(Array.isArray(entry.browsers), `${entry.id}: browsers are required`);
  if (entry.requiresNativeInput) {
    assert(entry.skip && typeof entry.skip === "object", `${entry.id}: native input cases must record skip reasons`);
  }
}

assert.deepEqual(performance.fixtures, [100, 1000, 10000]);
assert(performance.stages.includes("intent-transform"));
assert(performance.stages.includes("json-patch-commit"));
assert(performance.workloads.includes("text-insert-middle"));
assert.equal(performance.interactionBudget.fixtureSize, 10000);
assert(typeof performance.interactionBudget.p95Ms === "number");

console.log(`json-document rich-text corpora: model ${model.cases.length}, browser ${browser.cases.length}, performance fixtures ${performance.fixtures.join("/")}`);

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}
