import {
  type JSONCapabilityResult,
  type JSONValue,
} from "@interactive-os/json-document";

import { createCollaborationRuntime } from "../src/index.js";
import {
  runProjectionConformance,
  type Projection,
  type ProjectionAcceptance,
  type ProjectionHarness,
} from "../../json-document/tests/conformance/v2/projection-suite.js";

function createProjection(
  acceptance: ProjectionAcceptance,
  initial: JSONValue,
): Projection {
  return createCollaborationRuntime(initial, {
    actorId: "conformance",
    epochId: "projection-conformance/v1",
    ruleset: {
      id: `projection-conformance/${acceptance}`,
      digest: `projection-conformance/${acceptance}/v1`,
    },
    ...(acceptance === "task-list"
      ? { accepts: taskListAcceptance }
      : {}),
  }).document;
}

function taskListAcceptance(candidate: JSONValue): JSONCapabilityResult {
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
        reason: "candidate does not satisfy the task-list acceptance rule",
      };
}

function isRecord(
  value: JSONValue | undefined,
): value is { readonly [key: string]: JSONValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const harness: ProjectionHarness = {
  create: createProjection,
};

runProjectionConformance(harness);
