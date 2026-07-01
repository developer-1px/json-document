import type { JSONPatchOperation, JSONResult } from "../../../foundation/patch/contract.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import type { SelectionSource } from "../../selection/read.js";
import type { DuplicateError as DomainDuplicateError, DuplicateOpts } from "../../editing/duplicate.js";
import type { CapabilityResult } from "../capabilities/result.js";
import type { SelectionState } from "../selection/create.js";
import type {
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  JSONDocumentMoveTarget,
} from "./target.js";
import {
  planDocumentDelete,
  planDocumentMove,
  planDocumentReplace,
} from "./plan.js";

export type JSONDocumentEditError = Extract<CapabilityResult, { ok: false }>;
export type JSONDocumentEditResult = JSONResult | JSONDocumentEditError;

export type JSONDocumentDuplicateOptions = DuplicateOpts;
export type JSONDocumentDuplicateError = DomainDuplicateError;
export type JSONDocumentDuplicateResult<T> =
  | {
      ok: true;
      value: T;
      applied: ReadonlyArray<JSONPatchOperation>;
      duplicatedTo: Pointer;
    }
  | JSONDocumentDuplicateError
  | Extract<JSONResult, { ok: false }>;

interface DocumentEditMutation<T> {
  patch(operations: ReadonlyArray<JSONPatchOperation>): JSONResult;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
}

interface DocumentInsertRuntime<T> {
  insertPayload(
    payload: unknown,
    target: JSONDocumentInsertTarget | undefined,
    options: JSONDocumentInsertOptions | undefined,
  ): JSONDocumentEditResult;
}

interface CreateDocumentEditActionsInput<T> {
  getState(): T;
  selection?: SelectionState | undefined;
  mutation: DocumentEditMutation<T>;
  insertRuntime: DocumentInsertRuntime<T>;
}

export interface DocumentEditActions<T> {
  insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONDocumentEditResult;
  insert(value: unknown): JSONDocumentEditResult;
  replace(path: Pointer, value: unknown): JSONDocumentEditResult;
  replace(value: unknown): JSONDocumentEditResult;
  delete(source?: SelectionSource): JSONDocumentEditResult;
  move(source: Pointer, target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  move(target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  duplicate(options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
}

export function createDocumentEditActions<T>(
  input: CreateDocumentEditActionsInput<T>,
): DocumentEditActions<T> {
  const { getState, insertRuntime, mutation, selection } = input;

  function insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONDocumentEditResult;
  function insert(value: unknown): JSONDocumentEditResult;
  function insert(
    targetOrValue: JSONDocumentInsertTarget | unknown,
    maybeValue?: unknown,
    maybeOptions?: JSONDocumentInsertOptions,
  ): JSONDocumentEditResult {
    return arguments.length >= 2
      ? insertRuntime.insertPayload(maybeValue, targetOrValue as JSONDocumentInsertTarget, maybeOptions)
      : insertRuntime.insertPayload(targetOrValue, undefined, undefined);
  }

  function replace(path: Pointer, value: unknown): JSONDocumentEditResult;
  function replace(value: unknown): JSONDocumentEditResult;
  function replace(pathOrValue: Pointer | unknown, maybeValue?: unknown): JSONDocumentEditResult {
    const plan = planDocumentReplace({
      state: getState(),
      selection,
      pathOrValue,
      value: maybeValue,
      hasValueArg: arguments.length >= 2,
    });
    return plan.ok ? mutation.patch(plan.operations) : plan;
  }

  const deleteSelection = (source?: SelectionSource): JSONDocumentEditResult => {
    const plan = planDocumentDelete({ selection, source });
    return plan.ok ? mutation.patch(plan.operations) : plan;
  };

  function move(source: Pointer, target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  function move(target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  function move(sourceOrTarget: Pointer | JSONDocumentMoveTarget, maybeTarget?: JSONDocumentMoveTarget): JSONDocumentEditResult {
    const plan = planDocumentMove({
      state: getState(),
      selection,
      sourceOrTarget,
      target: maybeTarget,
      hasSourceArg: maybeTarget !== undefined,
    });
    return plan.ok ? mutation.patch(plan.operations) : plan;
  }

  function duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  function duplicate(options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  function duplicate(
    sourceOrOptions?: Pointer | JSONDocumentDuplicateOptions,
    maybeOptions?: JSONDocumentDuplicateOptions,
  ): JSONDocumentDuplicateResult<T> {
    const source = typeof sourceOrOptions === "string"
      ? sourceOrOptions
      : selection?.primaryPointer ?? null;
    const duplicateOptions = typeof sourceOrOptions === "string" ? maybeOptions : sourceOrOptions;
    if (source === null) {
      return {
        ok: false,
        code: "empty_selection",
        reason: "duplicate source selection is empty",
      };
    }
    return mutation.duplicate(source, duplicateOptions);
  }

  return {
    insert,
    replace,
    delete: deleteSelection,
    move,
    duplicate,
  };
}
