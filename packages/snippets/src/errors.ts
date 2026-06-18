import type {
  JSONCapabilityResult,
  JSONDocumentEditResult,
  JSONDocumentInsertTarget,
} from "@interactive-os/json-document";

import type {
  SnippetError,
} from "./types.js";

export function snippetNotFound(id: string): SnippetError {
  return {
    ok: false,
    code: "snippet_not_found",
    reason: `snippet not found: ${id}`,
    id,
  };
}

export function disabled(
  id: string,
  target: JSONDocumentInsertTarget,
  capability: Exclude<JSONCapabilityResult, { ok: true }>,
): SnippetError {
  const error: SnippetError = {
    ok: false,
    code: "disabled",
    reason: capability.reason ?? "snippet insert is disabled",
    id,
    target,
    capability,
  };
  if (capability.pointer !== undefined) error.pointer = capability.pointer;
  return error;
}

export function executionFailed(
  id: string,
  target: JSONDocumentInsertTarget,
  result: Exclude<JSONDocumentEditResult, { ok: true }>,
): SnippetError {
  return {
    ok: false,
    code: "execution_failed",
    reason: "snippet insert failed",
    id,
    target,
    result,
  };
}
