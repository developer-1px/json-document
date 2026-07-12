import {
  parentPointer,
  trackPointer,
  type JSONPatchOperation,
  type Pointer,
  type SelectionPoint,
} from "@interactive-os/json-document";

import {
  isArrayAtEither,
  pointerRelation,
} from "./pointer.js";
import {
  selectionPointPath,
  withSelectionPointPath,
} from "./selection.js";
import type {
  RebaseConflict,
  RebaseDiagnostic,
} from "./types.js";

export interface ConcurrentStep {
  readonly operation: JSONPatchOperation;
  readonly batchIndex: number;
  readonly operationIndex: number;
  readonly before: unknown;
  readonly after: unknown;
}

export type TransformOperationsResult =
  | {
      ok: true;
      operations: JSONPatchOperation[];
      diagnostics: RebaseDiagnostic[];
    }
  | {
      ok: false;
      reason: string;
      conflict: RebaseConflict;
    };

export function transformLocalOperations(
  operations: ReadonlyArray<JSONPatchOperation>,
  concurrentSteps: ReadonlyArray<ConcurrentStep>,
): TransformOperationsResult {
  const transformed: JSONPatchOperation[] = [];
  const diagnostics: RebaseDiagnostic[] = [];

  for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
    const operation = operations[operationIndex]!;
    if (
      concurrentSteps.length > 0
      && (operation.op !== "replace" && operation.op !== "test" || operation.path === "")
    ) {
      const reason = `cannot conservatively rebase local ${operation.op} operation`;
      return {
        ok: false,
        reason,
        conflict: {
          code: "unsupported_operation",
          reason,
          pointer: operation.path,
          operationIndex,
        },
      };
    }

    let path = operation.path;
    for (const step of concurrentSteps) {
      const overlap = overlappingConcurrentChange(path, step);
      if (overlap !== null) {
        const reason = `local target overlaps a concurrent change: ${path}`;
        return {
          ok: false,
          reason,
          conflict: {
            code: overlap,
            reason,
            pointer: path,
            operationIndex,
            concurrentBatchIndex: step.batchIndex,
            concurrentOperationIndex: step.operationIndex,
          },
        };
      }

      const next = trackPointerForConcurrentStep(path, step);
      if (next === null) {
        const reason = `local target was removed by a concurrent change: ${path}`;
        return {
          ok: false,
          reason,
          conflict: {
            code: "target_removed",
            reason,
            pointer: path,
            operationIndex,
            concurrentBatchIndex: step.batchIndex,
            concurrentOperationIndex: step.operationIndex,
          },
        };
      }
      path = next;
    }

    if (path !== operation.path) {
      diagnostics.push({
        code: "pointer_shifted",
        reason: "local pointer shifted by concurrent array edits",
        pointer: operation.path,
        rebasedPointer: path,
        operationIndex,
      });
    }
    transformed.push({ ...operation, path });
  }

  return { ok: true, operations: transformed, diagnostics };
}

export function unsupportedConcurrentChange(
  concurrentSteps: ReadonlyArray<ConcurrentStep>,
): Extract<TransformOperationsResult, { ok: false }> | null {
  for (const step of concurrentSteps) {
    if (
      step.operation.op !== "move"
      && step.operation.op !== "copy"
      && (step.operation.op === "test" || step.operation.path !== "")
    ) {
      continue;
    }
    const reason = `cannot conservatively rebase across concurrent ${step.operation.op} operation`;
    return {
      ok: false,
      reason,
      conflict: {
        code: "unsupported_operation",
        reason,
        pointer: step.operation.path,
        concurrentBatchIndex: step.batchIndex,
        concurrentOperationIndex: step.operationIndex,
      },
    };
  }
  return null;
}

export function transformSelection(
  selectionAfter: SelectionPoint,
  concurrentSteps: ReadonlyArray<ConcurrentStep>,
): {
  selectionAfter: SelectionPoint | undefined;
  diagnostics: RebaseDiagnostic[];
} {
  const originalPath = selectionPointPath(selectionAfter);
  let pointer: Pointer | null = originalPath;
  for (const step of concurrentSteps) {
    if (pointer === null) break;
    pointer = trackPointerForConcurrentStep(pointer, step);
  }
  return pointer === null
    ? {
        selectionAfter: undefined,
        diagnostics: [{
          code: "selection_dropped",
          reason: "selection target was removed by concurrent edits",
          pointer: originalPath,
        }],
      }
    : {
        selectionAfter: withSelectionPointPath(selectionAfter, pointer),
        diagnostics: [],
      };
}

function overlappingConcurrentChange(
  localPointer: Pointer,
  step: ConcurrentStep,
): "target_changed" | "target_removed" | "ancestor_replaced" | null {
  const operation = step.operation;
  if (operation.op === "test") return null;

  const relation = pointerRelation(localPointer, operation.path);
  if (relation === "disjoint") return null;

  if (operation.op === "replace") {
    return relation === "descendant" ? "ancestor_replaced" : "target_changed";
  }

  if (operation.op === "add" || operation.op === "remove") {
    const parent = parentPointer(operation.path);
    const arrayEdit = parent !== null && isArrayAtEither(step.before, step.after, parent);
    if (arrayEdit) {
      return relation === "ancestor" ? "target_changed" : null;
    }
    if (operation.op === "remove" && (relation === "same" || relation === "descendant")) {
      return "target_removed";
    }
    return "target_changed";
  }

  return "target_changed";
}

function trackPointerForConcurrentStep(
  pointer: Pointer,
  step: ConcurrentStep,
): Pointer | null {
  const operation = step.operation;
  if (operation.op === "test") return pointer;
  if (operation.op === "add" || operation.op === "remove") {
    const parent = parentPointer(operation.path);
    if (parent === null || !isArrayAtEither(step.before, step.after, parent)) {
      if (operation.op === "add") return pointer;
      const relation = pointerRelation(pointer, operation.path);
      return relation === "same" || relation === "descendant" ? null : pointer;
    }
  }
  return trackPointer(pointer, [operation]);
}
