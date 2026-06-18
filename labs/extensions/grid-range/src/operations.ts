import type { JSONChangeMetadata, JSONDocument, JSONDocumentCommitOptions, JSONResult } from "@interactive-os/json-document";
import { canFillGridRange, canPasteGridRange } from "./plan.js";
import type { GridRangeError, GridRangeFillInput, GridRangeOptions, GridRangePasteInput, GridRangeResolvedCell, GridRangeResult } from "./types.js";

export function pasteGridRange<TDocument>(
  doc: JSONDocument<TDocument>,
  input: GridRangePasteInput,
  options: GridRangeOptions = {},
  metadata?: JSONChangeMetadata,
): GridRangeResult {
  const change = canPasteGridRange(doc, input, options);
  if (!change.ok) return change;
  if (!change.changed) return change;

  const patched = doc.commit(change.operations, gridCommitOptions(metadata, change.selectionAfter));
  if (!patched.ok) return patchError(patched);
  return change;
}

export function fillGridRange<TDocument>(
  doc: JSONDocument<TDocument>,
  input: GridRangeFillInput,
  options: GridRangeOptions = {},
  metadata?: JSONChangeMetadata,
): GridRangeResult {
  const change = canFillGridRange(doc, input, options);
  if (!change.ok) return change;
  if (!change.changed) return change;

  const patched = doc.commit(change.operations, gridCommitOptions(metadata, change.selectionAfter));
  if (!patched.ok) return patchError(patched);
  return change;
}

function gridCommitOptions(
  metadata: JSONChangeMetadata | undefined,
  selectionAfter: ReadonlyArray<GridRangeResolvedCell>,
): JSONDocumentCommitOptions {
  const options: JSONDocumentCommitOptions = {
    selectionAfter: selectionAfter.map((cell) => cell.pointer),
  };
  if (metadata?.label !== undefined) options.label = metadata.label;
  if (metadata?.origin !== undefined) options.origin = metadata.origin;
  if (metadata?.mergeKey !== undefined) options.mergeKey = metadata.mergeKey;
  return options;
}

function patchError(patch: Extract<JSONResult, { ok: false }>): GridRangeError {
  return {
    ok: false,
    code: "patch_failed",
    reason: patch.reason ?? "grid-range patch failed",
    patch,
    ...(patch.pointer === undefined ? {} : { pointer: patch.pointer }),
  };
}
