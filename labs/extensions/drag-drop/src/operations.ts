import type { JSONDocument, JSONDocumentMoveTarget, JSONDocumentPasteTarget } from "@interactive-os/json-document/session";
import { applyPayload, canDrop, insertOptions, readCopyPayload } from "./plan.js";
import type { DragDropInput, DragDropPerformError, DragDropPerformResult } from "./types.js";

export function performDrop<TDocument>(
  doc: JSONDocument<TDocument>,
  input: DragDropInput,
): DragDropPerformResult {
  const plan = canDrop(doc, input);
  if (!plan.ok) return plan;
  if (!plan.capability.ok) {
    const error: DragDropPerformError = {
      ok: false,
      code: "disabled",
      reason: plan.capability.reason ?? "drop is disabled",
      capability: plan.capability,
    };
    if (plan.capability.pointer !== undefined) error.pointer = plan.capability.pointer;
    return error;
  }

  const result = performPlannedDrop(doc, input, plan.target);
  if (isFailure(result)) {
    return {
      ok: false,
      code: "execution_failed",
      reason: typeof result.reason === "string"
        ? result.reason
        : typeof result.message === "string"
          ? result.message
          : "drop execution failed",
      result,
    };
  }

  return {
    ok: true,
    kind: input.source.kind,
    target: plan.target,
    result,
  };
}

function performPlannedDrop<TDocument>(
  doc: JSONDocument<TDocument>,
  input: DragDropInput,
  target: JSONDocumentMoveTarget | JSONDocumentPasteTarget,
): unknown {
  switch (input.source.kind) {
    case "move":
      return doc.move(input.source.pointer, target as JSONDocumentMoveTarget);
    case "copy": {
      const payload = readCopyPayload(doc, input.source.pointer);
      return payload.ok
        ? applyPayload(doc, target as JSONDocumentPasteTarget, payload.value, insertOptions(input.source))
        : payload.capability;
    }
    case "payload":
      return applyPayload(doc, target as JSONDocumentPasteTarget, input.source.value, insertOptions(input.source));
  }
}

function isFailure(value: unknown): value is { ok: false; reason?: string; message?: string } {
  return typeof value === "object"
    && value !== null
    && "ok" in value
    && (value as { ok?: unknown }).ok === false;
}
