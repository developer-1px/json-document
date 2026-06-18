import { type JSONCapabilityResult, type JSONDocument, type JSONDocumentInsertOptions, type JSONDocumentInsertTarget, type JSONDocumentMoveTarget, type JSONDocumentPasteTarget, type Pointer, type ReadResult } from "@interactive-os/json-document";
import type { DragDropError, DragDropInput, DragDropPlanResult, DragDropSource, DragDropTarget } from "./types.js";

export function canDrop<TDocument>(
  doc: JSONDocument<TDocument>,
  input: DragDropInput,
): DragDropPlanResult {
  if (input.source.kind === "move") {
    const target = moveTarget(input.target);
    if (!target.ok) return target;
    return {
      ok: true,
      kind: "move",
      target: target.target,
      capability: doc.canMove(input.source.pointer, target.target),
    };
  }

  const target = payloadTarget(input.target);
  if (!target.ok) return target;
  if (input.source.kind === "copy") {
    const payload = readCopyPayload(doc, input.source.pointer);
    return {
      ok: true,
      kind: "copy",
      target: target.target,
      capability: payload.ok
        ? canApplyPayload(doc, target.target, payload.value, insertOptions(input.source))
        : payload.capability,
    };
  }

  return {
    ok: true,
    kind: "payload",
    target: target.target,
    capability: canApplyPayload(doc, target.target, input.source.value, insertOptions(input.source)),
  };
}

function moveTarget(target: DragDropTarget): { ok: true; target: JSONDocumentMoveTarget } | DragDropError {
  if (typeof target === "string") return { ok: true, target };
  if ("into" in target || "before" in target || "after" in target) return { ok: true, target };
  return {
    ok: false,
    code: "unsupported_target",
    reason: "move drops do not support replace targets",
    pointer: target.replace,
  };
}

function payloadTarget(target: DragDropTarget): { ok: true; target: JSONDocumentPasteTarget } | DragDropError {
  if (typeof target === "string") return { ok: true, target };
  if ("into" in target) return { ok: true, target: target.into };
  if ("before" in target) return { ok: true, target: { before: target.before } };
  if ("after" in target) return { ok: true, target: { after: target.after } };
  return { ok: true, target: { replace: target.replace } };
}

export function insertOptions(
  source: Extract<DragDropSource, { kind: "copy" | "payload" }>,
): JSONDocumentInsertOptions | undefined {
  return source.options;
}

export function readCopyPayload<TDocument>(
  doc: JSONDocument<TDocument>,
  pointer: Pointer,
): { ok: true; value: unknown } | { ok: false; capability: JSONCapabilityResult } {
  const result = doc.at(pointer);
  if (result.ok) return { ok: true, value: result.value };
  return { ok: false, capability: readFailureCapability(result) };
}

function readFailureCapability(result: Extract<ReadResult, { ok: false }>): JSONCapabilityResult {
  const capability: JSONCapabilityResult = {
    ok: false,
    code: result.code,
    pointer: result.pointer,
  };
  if (result.reason !== undefined) capability.reason = result.reason;
  return capability;
}

function canApplyPayload<TDocument>(
  doc: JSONDocument<TDocument>,
  target: JSONDocumentPasteTarget,
  payload: unknown,
  options?: JSONDocumentInsertOptions,
): JSONCapabilityResult {
  return isReplaceTarget(target)
    ? doc.canReplace(target.replace, payload)
    : doc.canInsert(target as JSONDocumentInsertTarget, payload, options);
}

export function applyPayload<TDocument>(
  doc: JSONDocument<TDocument>,
  target: JSONDocumentPasteTarget,
  payload: unknown,
  options?: JSONDocumentInsertOptions,
): unknown {
  return isReplaceTarget(target)
    ? doc.replace(target.replace, payload)
    : doc.insert(target as JSONDocumentInsertTarget, payload, options);
}

function isReplaceTarget(target: JSONDocumentPasteTarget): target is { replace: Pointer } {
  return typeof target === "object" && target !== null && "replace" in target;
}
