import {
  type JSONPatchValidationResult,
  type JSONValue,
} from "@interactive-os/json-document";

import { createCollaborationRuntime } from "@interactive-os/json-document-collaboration";
import {
  runJSONDocumentConformance,
  type JSONDocument,
  type JSONDocumentValidation,
  type JSONDocumentHarness,
} from "../../../../standards/json-document-v3/conformance/suites/json-document.js";
import { runPressureConformance } from "../../../../standards/json-document-v3/conformance/suites/pressure.js";

function createJSONDocument(
  validation: JSONDocumentValidation,
  initial: JSONValue,
): JSONDocument {
  const validate = validation === "task-list"
    ? taskListValidation
    : validation === "attempt-transform"
      ? attemptTransformValidation
      : undefined;
  return createCollaborationRuntime(initial, {
    actorId: "conformance",
    epochId: "document-conformance/v1",
    ruleset: {
      id: `document-conformance/${validation}`,
      digest: `document-conformance/${validation}/v1`,
    },
    ...(validate === undefined ? {} : { validate }),
  }).document;
}

function attemptTransformValidation(
  candidate: JSONValue,
): JSONPatchValidationResult {
  if (isRecord(candidate)) {
    Reflect.set(candidate, "title", "Implicit");
  }
  return { ok: true };
}

function taskListValidation(candidate: JSONValue): JSONPatchValidationResult {
  const valid = isRecord(candidate)
    && typeof candidate.title === "string"
    && Array.isArray(candidate.items)
    && candidate.items.every((item) => (
      isRecord(item)
      && typeof item.id === "string"
      && typeof item.done === "boolean"
    ))
    && isRecord(candidate.meta)
    && typeof candidate.meta.owner === "string";
  return valid
    ? { ok: true }
    : {
        ok: false,
        code: "schema_violation",
        reason: "candidate does not satisfy the task-list validation rule",
      };
}

function isRecord(
  value: JSONValue | undefined,
): value is { readonly [key: string]: JSONValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const harness: JSONDocumentHarness = {
  create: createJSONDocument,
};

runJSONDocumentConformance(harness);
runPressureConformance(harness);
