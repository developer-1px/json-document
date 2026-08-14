import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const profilePath = path.join(root, "profile.md");
const schemaPath = path.join(root, "schema.json");
const vectorPath = path.join(root, "conformance/vectors/rich-text.json");

const [profile, schemaSource, vectorSource] = await Promise.all([
  readFile(profilePath, "utf8"),
  readFile(schemaPath, "utf8"),
  readFile(vectorPath, "utf8"),
]);

const schema = JSON.parse(schemaSource);
const vectors = JSON.parse(vectorSource);
const requirementIds = [...profile.matchAll(/\| (JDRT1-[A-Z]+-[0-9]{3}) \|/g)]
  .map((match) => match[1]);
const MARK_RANKS = ["link", "strong", "emphasis", "underline", "strikethrough", "code"];

assert(requirementIds.length > 0, "profile must define normative requirements");
assert.equal(new Set(requirementIds).size, requirementIds.length, "requirement IDs must be unique");
assert.equal(vectors.formatVersion, 1, "unsupported vector formatVersion");
assert.equal(vectors.status, "draft", "RFC vectors must remain draft until implementation evidence exists");
assert.equal(vectors.profile, "standards/json-document-rich-text-v1/profile.md");
assert.equal(vectors.schema, "standards/json-document-rich-text-v1/schema.json");
assert(Array.isArray(vectors.cases) && vectors.cases.length > 0, "vectors must contain cases");

const caseIds = vectors.cases.map((entry) => entry.id);
assert.equal(new Set(caseIds).size, caseIds.length, "vector case IDs must be unique");

const knownRequirements = new Set(requirementIds);
const coveredRequirements = new Set();
for (const entry of vectors.cases) {
  assert(typeof entry.id === "string" && entry.id.length > 0, "vector case requires an id");
  assert(typeof entry.kind === "string" && entry.kind.length > 0, `${entry.id}: kind is required`);
  assert(Array.isArray(entry.requirements) && entry.requirements.length > 0, `${entry.id}: requirements are required`);
  for (const requirement of entry.requirements) {
    assert(knownRequirements.has(requirement), `${entry.id}: unknown requirement ${requirement}`);
    coveredRequirements.add(requirement);
  }
}

const uncovered = requirementIds.filter((requirement) => !coveredRequirements.has(requirement));
assert.deepEqual(uncovered, [], `uncovered requirements: ${uncovered.join(", ")}`);

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateSchema = ajv.compile(schema);
for (const entry of vectors.cases.filter((candidate) => candidate.kind === "schema")) {
  const schemaValid = validateSchema(entry.value);
  assert.equal(
    schemaValid,
    entry.expect.schemaValid,
    `${entry.id}: JSON Schema result mismatch: ${ajv.errorsText(validateSchema.errors)}`,
  );
  if (typeof entry.expect.semanticValid === "boolean") {
    assert.equal(
      semanticIssues(entry.value).length === 0,
      entry.expect.semanticValid,
      `${entry.id}: semantic validation result mismatch`,
    );
  }
}

const canonical = vectors.cases.find((entry) => entry.id === "canonical-document");
assert(canonical, "canonical-document vector is required");
assert.equal(validateSchema(canonical.value), true, ajv.errorsText(validateSchema.errors));

const duplicate = vectors.cases.find((entry) => entry.id === "duplicate-id-is-semantically-invalid");
assert(duplicate, "duplicate-id semantic vector is required");
assert.equal(validateSchema(duplicate.value), true, "duplicate IDs are a semantic, not structural, violation");
assert.equal(semanticIssues(duplicate.value).includes("duplicate-id"), true, "duplicate-id vector must contain a duplicate");

const normalization = vectors.cases.find((entry) => entry.id === "normalization-is-explicit-and-deterministic");
assert(normalization, "normalization vector is required");
assert.equal(validateSchema(normalization.expect.value), true, ajv.errorsText(validateSchema.errors));
assert.deepEqual(semanticIssues(normalization.expect.value), [], "normalized value must be canonical");

const rendering = vectors.cases.find((entry) => entry.id === "official-semantic-rendering");
assert(rendering, "official rendering vector is required");
assert.equal(validateSchema(rendering.value), true, ajv.errorsText(validateSchema.errors));

console.log(`json-document rich-text v1 RFC: ${requirementIds.length} requirements, ${vectors.cases.length} vectors`);

function semanticIssues(value) {
  const ids = new Set();
  const issues = [];
  visit(value);
  return issues;

  function visit(candidate) {
    if (candidate === null || typeof candidate !== "object") return;
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (typeof candidate.id === "string" && typeof candidate.type === "string") {
      if (ids.has(candidate.id)) {
        issues.push("duplicate-id");
      }
      ids.add(candidate.id);
    }
    if (candidate.type === "text" && Array.isArray(candidate.marks)) {
      const types = candidate.marks.map((mark) => mark.type);
      if (new Set(types).size !== types.length) issues.push("duplicate-mark");
      const ranks = types.map((type) => MARK_RANKS.indexOf(type));
      if (ranks.some((rank, index) => index > 0 && rank < ranks[index - 1])) issues.push("mark-order");
      if (types.includes("code") && types.length > 1) issues.push("code-mark-exclusive");
    }
    if (Array.isArray(candidate.content)) {
      for (let index = 1; index < candidate.content.length; index += 1) {
        const previous = candidate.content[index - 1];
        const current = candidate.content[index];
        if (
          previous?.type === "text"
          && current?.type === "text"
          && JSON.stringify(previous.marks) === JSON.stringify(current.marks)
        ) {
          issues.push("adjacent-equivalent-text");
        }
      }
    }
    for (const child of Object.values(candidate)) visit(child);
  }
}
