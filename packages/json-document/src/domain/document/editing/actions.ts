import type { JSONPatchOperation, JSONResult } from "../../../foundation/patch/index.js";
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

/**
 * 모든 mutation verb 의 통일 성공 shape (#219).
 * "duplicate 는 새 객체(위치)를 반환한다"는 42년 정본을 전 verb 로 일반화 —
 * value = 적용 후 document, applied = 실제 적용된 정규화 patch,
 * target = 연산이 착지한 pointer (단일 착지점이 없으면 null).
 */
export interface JSONDocumentEditOk<T> {
  ok: true;
  value: T;
  applied: ReadonlyArray<JSONPatchOperation>;
  target: Pointer | null;
}
export type JSONDocumentEditResult<T = unknown> = JSONDocumentEditOk<T> | JSONDocumentEditError;

export type JSONDocumentDuplicateOptions = DuplicateOpts;
export type JSONDocumentDuplicateError = DomainDuplicateError;
export type JSONDocumentDuplicateResult<T> =
  | (JSONDocumentEditOk<T> & {
      target: Pointer;
      /** @deprecated `target` 으로 대체 (#219). 1.x 병행 유지. */
      duplicatedTo: Pointer;
    })
  | JSONDocumentDuplicateError
  | Extract<JSONResult, { ok: false }>;

interface DocumentEditMutation<T> {
  patch(operations: ReadonlyArray<JSONPatchOperation>): JSONResult;
  lastApplied(): ReadonlyArray<JSONPatchOperation>;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
}

interface DocumentInsertRuntime<T> {
  insertPayload(
    payload: unknown,
    target: JSONDocumentInsertTarget | undefined,
    options: JSONDocumentInsertOptions | undefined,
  ): JSONDocumentEditResult<T>;
}

interface CreateDocumentEditActionsInput<T> {
  getState(): T;
  selection?: SelectionState | undefined;
  mutation: DocumentEditMutation<T>;
  insertRuntime: DocumentInsertRuntime<T>;
}

export interface DocumentEditActions<T> {
  insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONDocumentEditResult<T>;
  insert(value: unknown): JSONDocumentEditResult<T>;
  replace(path: Pointer, value: unknown): JSONDocumentEditResult<T>;
  replace(value: unknown): JSONDocumentEditResult<T>;
  delete(source?: SelectionSource): JSONDocumentEditResult<T>;
  move(source: Pointer, target: JSONDocumentMoveTarget): JSONDocumentEditResult<T>;
  move(target: JSONDocumentMoveTarget): JSONDocumentEditResult<T>;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  duplicate(options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
}

export function createDocumentEditActions<T>(
  input: CreateDocumentEditActionsInput<T>,
): DocumentEditActions<T> {
  const { getState, insertRuntime, mutation, selection } = input;

  // 계획 실행 + 통일 성공 shape 구성 (#219 EditOk).
  const applyPlan = (plan: ReturnType<typeof planDocumentReplace>): JSONDocumentEditResult<T> => {
    if (!plan.ok) return plan;
    const r = mutation.patch(plan.operations);
    if (!r.ok) return r;
    return { ok: true, value: getState(), applied: mutation.lastApplied(), target: plan.target };
  };

  function insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONDocumentEditResult<T>;
  function insert(value: unknown): JSONDocumentEditResult<T>;
  function insert(
    targetOrValue: JSONDocumentInsertTarget | unknown,
    maybeValue?: unknown,
    maybeOptions?: JSONDocumentInsertOptions,
  ): JSONDocumentEditResult<T> {
    return arguments.length >= 2
      ? insertRuntime.insertPayload(maybeValue, targetOrValue as JSONDocumentInsertTarget, maybeOptions)
      : insertRuntime.insertPayload(targetOrValue, undefined, undefined);
  }

  function replace(path: Pointer, value: unknown): JSONDocumentEditResult<T>;
  function replace(value: unknown): JSONDocumentEditResult<T>;
  function replace(pathOrValue: Pointer | unknown, maybeValue?: unknown): JSONDocumentEditResult<T> {
    return applyPlan(planDocumentReplace({
      state: getState(),
      selection,
      pathOrValue,
      value: maybeValue,
      hasValueArg: arguments.length >= 2,
    }));
  }

  const deleteSelection = (source?: SelectionSource): JSONDocumentEditResult<T> =>
    applyPlan(planDocumentDelete({ selection, source }));

  function move(source: Pointer, target: JSONDocumentMoveTarget): JSONDocumentEditResult<T>;
  function move(target: JSONDocumentMoveTarget): JSONDocumentEditResult<T>;
  function move(sourceOrTarget: Pointer | JSONDocumentMoveTarget, maybeTarget?: JSONDocumentMoveTarget): JSONDocumentEditResult<T> {
    return applyPlan(planDocumentMove({
      state: getState(),
      selection,
      sourceOrTarget,
      target: maybeTarget,
      hasSourceArg: maybeTarget !== undefined,
    }));
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
