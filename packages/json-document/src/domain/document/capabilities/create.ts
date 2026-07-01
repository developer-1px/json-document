import type * as z from "zod";
import { parse as parseJSONPath } from "../../../foundation/jsonpath/index.js";
import { JSONPathSyntaxError } from "../../../foundation/jsonpath/index.js";
import type { ApplyResult, JSONPatchOperation } from "../../../foundation/patch/index.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import { copy } from "../../clipboard/copy.js";
import { cut } from "../../clipboard/cut.js";
import { duplicate, resolveDuplicateArgs, type DuplicateOpts } from "../../editing/duplicate.js";
import { patchPreflight, patchPreflightFromApplyResult } from "../../schema/mutation/patch.js";
import {
  primaryPointer,
  selectedSource,
} from "../../selection/read.js";
import { deleteSelectionText, type SelectionTextDeleteOptions } from "../../selection/textDelete.js";
import { replaceSelectionText, type SelectionTextEditOptions } from "../../selection/textEdit.js";
import { EMPTY_SELECTION, type SelectionSnap } from "../../selection/snap.js";
import type { SelectionSource } from "../../selection/read.js";
import type {
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  JSONDocumentMoveTarget,
} from "../editing/target.js";
import {
  planDocumentDelete,
  planDocumentMove,
  planDocumentReplace,
} from "../editing/plan.js";
import type { JSONDocumentCommitOptions } from "../history/metadata.js";
import type { JSONStateOps } from "../state/ops.js";
import {
  OK,
  capabilityResult,
  type CapabilityResult,
} from "./result.js";

interface InsertCapabilityRuntime {
  canInsertPayload(
    payload: unknown,
    target: JSONDocumentInsertTarget | undefined,
    options: JSONDocumentInsertOptions | undefined,
  ): CapabilityResult;
}

export interface DocumentCapabilities {
  find(jsonpath: string): CapabilityResult;
  insert(targetOrValue: JSONDocumentInsertTarget | unknown, value?: unknown, options?: JSONDocumentInsertOptions): CapabilityResult;
  replace(pathOrValue: Pointer | unknown, value?: unknown): CapabilityResult;
  move(fromOrTo: Pointer | JSONDocumentMoveTarget, to?: JSONDocumentMoveTarget): CapabilityResult;
  duplicate(sourceOrOpts?: Pointer | DuplicateOpts, opts?: DuplicateOpts): CapabilityResult;
  delete(source?: SelectionSource): CapabilityResult;
  replaceText(replacement: string, options?: SelectionTextEditOptions & JSONDocumentCommitOptions): CapabilityResult;
  deleteText(options?: SelectionTextDeleteOptions & JSONDocumentCommitOptions): CapabilityResult;
  cut(source?: SelectionSource): CapabilityResult;
  copy(source?: SelectionSource): CapabilityResult;
  patch(ops: ReadonlyArray<JSONPatchOperation>): CapabilityResult;
  readonly undo: CapabilityResult;
  readonly redo: CapabilityResult;
}

interface CreateDocumentCapabilitiesArgs<S extends z.ZodType> {
  schema: S;
  ops: JSONStateOps<z.output<S>>;
  history: { canUndo(): boolean; canRedo(): boolean };
  previewPatch?: (operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>;
  getStateJsonTrusted?: () => boolean;
  selectionRef?: { current: SelectionSnap };
  insertRuntime: InsertCapabilityRuntime;
}

export function createDocumentCapabilities<S extends z.ZodType>(
  args: CreateDocumentCapabilitiesArgs<S>,
): DocumentCapabilities {
  const { schema, ops, previewPatch, getStateJsonTrusted, history, selectionRef, insertRuntime } = args;
  const state = () => ops.state;
  const selection = () => selectionRef?.current ?? EMPTY_SELECTION;
  const stateJsonTrusted = () => getStateJsonTrusted?.() === true;
  const patch = (operations: ReadonlyArray<JSONPatchOperation>) => capabilityResult(
    previewPatch
      ? patchPreflightFromApplyResult(previewPatch(operations))
      : patchPreflight(schema, state(), operations),
  );

  return {
    find(jsonpath) {
      try {
        parseJSONPath(jsonpath);
        return OK;
      } catch (error) {
        if (error instanceof JSONPathSyntaxError) {
          return { ok: false, code: "syntax_error", reason: error.message };
        }
        throw error;
      }
    },
    insert(targetOrValue, maybeValue, maybeOptions) {
      return arguments.length >= 2
        ? insertRuntime.canInsertPayload(maybeValue, targetOrValue as JSONDocumentInsertTarget, maybeOptions)
        : insertRuntime.canInsertPayload(targetOrValue, undefined, undefined);
    },
    move(fromOrTo, maybeTo) {
      const plan = planDocumentMove({
        state: state(),
        selection: selection(),
        sourceOrTarget: fromOrTo,
        target: maybeTo,
        hasSourceArg: arguments.length >= 2,
      });
      return plan.ok ? patch(plan.operations) : plan;
    },
    duplicate(sourceOrOpts, opts) {
      const input = resolveDuplicateArgs(sourceOrOpts, opts);
      const source = input.source ?? primaryPointer(selection()) ?? null;
      return source === null
        ? emptySelectionCapability("duplicate source selection is empty")
        : capabilityResult(duplicate(schema, state(), source, input.opts, {
            previewPatch,
            trustedPayload: stateJsonTrusted(),
          }));
    },
    delete(source) {
      const plan = planDocumentDelete({ selection: selection(), source });
      return plan.ok ? patch(plan.operations) : plan;
    },
    replace(pathOrValue, maybeValue) {
      const plan = planDocumentReplace({
        state: state(),
        selection: selection(),
        pathOrValue,
        value: maybeValue,
        hasValueArg: arguments.length >= 2,
      });
      return plan.ok ? patch(plan.operations) : plan;
    },
    replaceText(replacement, textOptions) {
      const planned = replaceSelectionText(selection(), state(), replacement, textOptions);
      return planned.ok ? patch(planned.patch) : capabilityResult(planned);
    },
    deleteText(textOptions) {
      const planned = deleteSelectionText(selection(), state(), textOptions);
      return planned.ok ? patch(planned.patch) : capabilityResult(planned);
    },
    cut(source) {
      const resolved = source ?? selectedSource(selection()) ?? null;
      return resolved === null
        ? emptySelectionCapability("cut source selection is empty")
        : capabilityResult(cut(schema, state(), resolved, {
            trusted: stateJsonTrusted(),
            clonePayload: false,
            previewPatch,
          }));
    },
    copy(source) {
      const resolved = source ?? selectedSource(selection()) ?? null;
      return resolved === null
        ? emptySelectionCapability("copy source selection is empty")
        : capabilityResult(copy(state(), resolved, {
            trusted: stateJsonTrusted(),
            clonePayload: false,
          }));
    },
    patch: (operations) => patch(operations),

    get undo() {
      return history.canUndo() ? OK : emptyStack("undo");
    },
    get redo() {
      return history.canRedo() ? OK : emptyStack("redo");
    },
  };
}

function emptySelectionCapability(reason: string): CapabilityResult {
  return { ok: false, code: "empty_selection", reason };
}

function emptyStack(kind: "undo" | "redo"): CapabilityResult {
  return {
    ok: false,
    code: "empty_stack",
    reason: `${kind} stack is empty`,
  };
}
