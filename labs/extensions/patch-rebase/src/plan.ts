import {
  applyPatch,
  applyPatchToTrustedState,
  type JSONPatchOperation,
  type Pointer,
  type SelectionPoint,
  type SelectionPointObject,
} from "@interactive-os/json-document/session";

import {
  cloneJson,
  copyOperations,
} from "./copy.js";
import {
  createGuards,
} from "./guards.js";
import {
  canonicalPointer,
  readPointerValue,
} from "./pointer.js";
import {
  prepareSelectionPoint,
  selectionPointPath,
} from "./selection.js";
import {
  transformLocalOperations,
  transformSelection,
  type ConcurrentStep,
  unsupportedConcurrentChange,
} from "./transform.js";
import type {
  RebaseChangeInput,
  RebaseChangeResult,
  RebaseSchema,
} from "./types.js";

const PERMISSIVE_JSON_SCHEMA: RebaseSchema<unknown> = {
  safeParse: (input) => ({ success: true, data: input }),
};

export function rebaseChange<TDocument>(
  schema: RebaseSchema<TDocument>,
  input: RebaseChangeInput<TDocument, Pointer>,
): RebaseChangeResult<Pointer>;
export function rebaseChange<TDocument>(
  schema: RebaseSchema<TDocument>,
  input: RebaseChangeInput<TDocument, SelectionPointObject>,
): RebaseChangeResult<SelectionPointObject>;
export function rebaseChange<TDocument>(
  schema: RebaseSchema<TDocument>,
  input: RebaseChangeInput<TDocument, SelectionPoint>,
): RebaseChangeResult<SelectionPoint>;
// Keep the legacy Pointer signature last for Parameters/ReturnType consumers.
export function rebaseChange<TDocument>(
  schema: RebaseSchema<TDocument>,
  input: RebaseChangeInput<TDocument, Pointer>,
): RebaseChangeResult<Pointer>;
export function rebaseChange<TDocument>(
  schema: RebaseSchema<TDocument>,
  input: RebaseChangeInput<TDocument, SelectionPoint>,
): RebaseChangeResult<SelectionPoint> {
  let selectionAfter: SelectionPoint | undefined;
  if (input.selectionAfter !== undefined) {
    const preparedSelection = prepareSelectionPoint(input.selectionAfter);
    if (!preparedSelection.ok) {
      const reason = preparedSelection.reason;
      return {
        ok: false,
        code: "conflict",
        reason,
        conflicts: [{
          code: "invalid_selection",
          reason,
          ...(preparedSelection.pointer === undefined
            ? {}
            : { pointer: preparedSelection.pointer }),
        }],
      };
    }
    selectionAfter = preparedSelection.point;
  }

  const local = applyPatchWithSchema(
    schema,
    input.base,
    canonicalizeOperations(input.operations),
  );
  if (!local.result.ok) {
    return {
      ok: false,
      code: "change_patch_failed",
      reason: local.result.reason ?? "local change patch failed",
      result: cloneJson(local.result),
    };
  }

  const concurrent = replayConcurrentChanges(schema, input);
  if (!concurrent.ok) return concurrent.error;

  const unsupportedConcurrent = unsupportedConcurrentChange(concurrent.steps);
  if (unsupportedConcurrent !== null) {
    return {
      ok: false,
      code: "conflict",
      reason: unsupportedConcurrent.reason,
      conflicts: [unsupportedConcurrent.conflict],
    };
  }

  const transformed = transformLocalOperations(local.applied, concurrent.steps);
  if (!transformed.ok) {
    return {
      ok: false,
      code: "conflict",
      reason: transformed.reason,
      conflicts: [transformed.conflict],
    };
  }

  const selection = selectionAfter === undefined
    ? { selectionAfter: undefined, diagnostics: [] }
    : transformSelection(selectionAfter, concurrent.steps);
  const guards = createGuards(
    concurrent.state,
    transformed.operations,
    selection.selectionAfter === undefined
      ? undefined
      : selectionPointPath(selection.selectionAfter),
  );
  if (!guards.ok) {
    return {
      ok: false,
      code: "conflict",
      reason: "local change target no longer exists",
      conflicts: [{
        code: "target_removed",
        reason: `local change target no longer exists: ${guards.pointer}`,
        pointer: guards.pointer,
      }],
    };
  }

  const operations = [
    ...guards.operations,
    ...copyOperations(transformed.operations),
  ];
  const validated = applyTrustedPatchWithSchema(
    schema,
    concurrent.state,
    operations,
  );
  if (!validated.result.ok) {
    return {
      ok: false,
      code: "conflict",
      reason: "rebased change is not valid on the concurrent state",
      conflicts: [{
        code: "schema_conflict",
        reason: validated.result.reason ?? "rebased change failed",
        ...(validated.result.pointer === undefined ? {} : { pointer: validated.result.pointer }),
      }],
    };
  }

  const finalSelection = selection.selectionAfter !== undefined
    && !readPointerValue(
      validated.state,
      selectionPointPath(selection.selectionAfter),
    ).ok
    ? {
        selectionAfter: undefined,
        diagnostics: [
          ...selection.diagnostics,
          {
            code: "selection_dropped" as const,
            reason: "selection target does not exist after the rebased change",
            pointer: selectionPointPath(selection.selectionAfter),
          },
        ],
      }
    : selection;

  return {
    ok: true,
    operations,
    ...(finalSelection.selectionAfter === undefined
      ? {}
      : { selectionAfter: finalSelection.selectionAfter }),
    diagnostics: [
      ...transformed.diagnostics,
      ...finalSelection.diagnostics,
    ],
  };
}

function replayConcurrentChanges<TDocument>(
  schema: RebaseSchema<TDocument>,
  input: RebaseChangeInput<TDocument, SelectionPoint>,
):
  | { ok: true; state: unknown; steps: ConcurrentStep[] }
  | {
      ok: false;
      error: Extract<RebaseChangeResult, { code: "concurrent_patch_failed" }>;
    } {
  let state: unknown = input.base;
  const steps: ConcurrentStep[] = [];
  for (let batchIndex = 0; batchIndex < input.concurrentBatches.length; batchIndex += 1) {
    const before = state;
    const replayed = applyTrustedPatchWithSchema(
      schema,
      state,
      canonicalizeOperations(input.concurrentBatches[batchIndex]!),
    );
    if (!replayed.result.ok) {
      return {
        ok: false,
        error: {
          ok: false,
          code: "concurrent_patch_failed",
          reason: replayed.result.reason ?? `concurrent patch failed at batch ${batchIndex}`,
          batchIndex,
          result: cloneJson(replayed.result),
        },
      };
    }
    let operationState = before;
    for (let operationIndex = 0; operationIndex < replayed.applied.length; operationIndex += 1) {
      const operation = replayed.applied[operationIndex]!;
      const appliedStep = applyTrustedPatchWithSchema(
        PERMISSIVE_JSON_SCHEMA,
        operationState,
        [operation],
      );
      if (!appliedStep.result.ok) {
        return {
          ok: false,
          error: {
            ok: false,
            code: "concurrent_patch_failed",
            reason: appliedStep.result.reason ?? `concurrent operation failed at batch ${batchIndex}`,
            batchIndex,
            result: cloneJson(appliedStep.result),
          },
        };
      }
      steps.push({
        operation,
        batchIndex,
        operationIndex,
        before: operationState,
        after: appliedStep.state,
      });
      operationState = appliedStep.state;
    }
    state = replayed.state;
  }
  return { ok: true, state, steps };
}

function applyPatchWithSchema<TDocument>(
  schema: RebaseSchema<TDocument>,
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
) {
  return applyPatch(
    schema as Parameters<typeof applyPatch>[0],
    state,
    operations,
  );
}

function applyTrustedPatchWithSchema<TDocument>(
  schema: RebaseSchema<TDocument>,
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
) {
  return applyPatchToTrustedState(
    schema as Parameters<typeof applyPatchToTrustedState>[0],
    state,
    operations,
  );
}

function canonicalizeOperations(
  operations: ReadonlyArray<JSONPatchOperation>,
): ReadonlyArray<JSONPatchOperation> {
  if (!Array.isArray(operations)) return operations;
  return operations.map((operation) => {
    if (
      operation === null
      || typeof operation !== "object"
      || typeof (operation as { path?: unknown }).path !== "string"
    ) {
      return operation;
    }
    const path = canonicalPointer(operation.path) ?? operation.path;
    if (operation.op === "move" || operation.op === "copy") {
      if (typeof operation.from !== "string") return { ...operation, path };
      return {
        ...operation,
        path,
        from: canonicalPointer(operation.from) ?? operation.from,
      };
    }
    return { ...operation, path };
  });
}
