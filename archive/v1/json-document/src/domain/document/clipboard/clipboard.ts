import type * as z from "zod";

import { cloneTrustedPlainJson } from "../../../foundation/json/index.js";
import type { ApplyResult, JSONPatchOperation } from "../../../foundation/patch/index.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import type { SelectionSource } from "../../selection/read.js";
import {
  copy,
} from "../../clipboard/copy.js";
import { cut } from "../../clipboard/cut.js";
import {
  OK,
  type CapabilityResult,
} from "../capabilities/result.js";
import type {
  ClipboardBuffer,
  ClipboardCutResult,
  ClipboardEmpty,
  ClipboardPasteResult,
  ClipboardState,
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
} from "./contract.js";
import type { JSONStateOps } from "../state/ops.js";
import type { PreviewedDocumentPatchResult } from "../state/patch.js";
import {
  trustedSourceBuffer,
  writeClipboardBuffer,
} from "./buffer.js";
import { createClipboardPasteRuntime } from "./paste.js";

const EMPTY_CLIPBOARD: ClipboardEmpty = {
  ok: false,
  code: "empty_clipboard",
  reason: "clipboard is empty",
};

export const INTERNAL_CLIPBOARD_CAN_PASTE: unique symbol = Symbol("json-document.internal.clipboard.canPaste");

interface InternalClipboardState<T> extends ClipboardState<T> {
  [INTERNAL_CLIPBOARD_CAN_PASTE](
    target?: JSONDocumentPasteTarget,
    options?: JSONDocumentPasteOptions,
  ): CapabilityResult;
}

interface CreateClipboardOptions<S extends z.ZodType> {
  schema: S;
  getState(): z.output<S>;
  getRevision?: () => number;
  ops: JSONStateOps<z.output<S>>;
  previewPatch?: (operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>;
  previewTrustedValuesPatch?: (operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>;
  applyPreviewedPatch?: (
    prepared: ApplyResult<z.ZodTypeAny>,
    operations: ReadonlyArray<JSONPatchOperation>,
  ) => PreviewedDocumentPatchResult;
  getSelectionSource?: () => SelectionSource | null;
  getSelectionTarget?: () => Pointer | null;
  getStateJsonTrusted?: () => boolean;
  onChange?: () => void;
}

export function createClipboard<S extends z.ZodType>(
  args: CreateClipboardOptions<S>,
): InternalClipboardState<z.output<S>> {
  const {
    schema,
    getState,
    getRevision,
    ops,
    previewPatch,
    previewTrustedValuesPatch,
    applyPreviewedPatch,
    getSelectionSource,
    getSelectionTarget,
    getStateJsonTrusted,
    onChange,
  } = args;
  let buffer: ClipboardBuffer | null = null;
  const pasteRuntime = createClipboardPasteRuntime({
    schema,
    getState,
    getRevision,
    ops,
    previewPatch,
    previewTrustedValuesPatch,
    applyPreviewedPatch,
    getSelectionTarget,
  });

  const setBuffer = (next: ClipboardBuffer | null): void => {
    buffer = next;
    onChange?.();
  };

  return {
    get hasData() { return buffer !== null; },
    get source() { return buffer?.source ?? null; },
    get sources() { return buffer?.sources ? [...buffer.sources] : null; },

    read(options = {}) {
      if (!buffer) return EMPTY_CLIPBOARD;
      return {
        ok: true,
        payload: options.clonePayload === false
          ? buffer.payload
          : cloneTrustedPlainJson(buffer.payload),
        source: buffer.source,
        sources: buffer.sources ? [...buffer.sources] : null,
      };
    },

    write(payload, options = {}) {
      const plan = writeClipboardBuffer(getState(), getStateJsonTrusted?.() === true, payload, options);
      if (!plan.ok) return plan.result;
      setBuffer(plan.buffer);
      return { ok: true };
    },

    clear() {
      setBuffer(null);
    },

    copy(source, options = {}) {
      const resolvedSource = source ?? getSelectionSource?.() ?? null;
      if (resolvedSource === null) {
        return {
          ok: false,
          code: "empty_selection",
          reason: "copy source selection is empty",
        };
      }
      const copyOptions: { trusted: boolean; clonePayload?: boolean } = {
        trusted: getStateJsonTrusted?.() === true,
      };
      if (options.clonePayload !== undefined) copyOptions.clonePayload = options.clonePayload;
      const result = copy(getState(), resolvedSource, copyOptions);
      if (result.ok) {
        setBuffer(trustedSourceBuffer(result.payload, result.source, result.sources));
      }
      return result;
    },

    cut(source, options = {}) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const baseRevision = getRevision?.();
        const resolvedSource = source ?? getSelectionSource?.() ?? null;
        if (resolvedSource === null) {
          return {
            ok: false,
            code: "empty_selection",
            reason: "cut source selection is empty",
          };
        }
        const cutOptions: {
          trusted: boolean;
          clonePayload?: boolean;
          previewPatch?: (operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>;
        } = {
          trusted: getStateJsonTrusted?.() === true,
        };
        if (options.clonePayload !== undefined) cutOptions.clonePayload = options.clonePayload;
        if (previewPatch !== undefined) cutOptions.previewPatch = previewPatch;
        const result = cut(schema, getState(), resolvedSource, cutOptions);
        if (baseRevision !== undefined && getRevision?.() !== baseRevision) continue;
        if (!result.ok) return result;
        const publication: PreviewedDocumentPatchResult = applyPreviewedPatch
          ? applyPreviewedPatch(result.prepared, result.patch)
          : { status: "applied", result: ops.patch(result.patch), applied: result.patch };
        if (publication.status === "stale") continue;
        const patchResult = publication.result;
        const applyResult: ClipboardCutResult<z.output<S>> = patchResult.ok
          ? {
              ok: true,
              value: getState(),
              applied: publication.applied,
              target: null,
              payload: result.payload,
              source: result.source,
              sources: result.sources,
            }
          : {
              ok: false,
              code: patchResult.code,
              reason: patchResult.reason ?? patchResult.code,
              violations: [],
            };
        if (applyResult.ok) {
          setBuffer(trustedSourceBuffer(applyResult.payload, applyResult.source, applyResult.sources));
        }
        return applyResult;
      }
      throw new Error("state changed repeatedly while preparing cut");
    },

    paste(target, options) {
      if (!buffer) return EMPTY_CLIPBOARD;
      return pasteRuntime.pastePayload(buffer.payload, target, options, (buffer.sources?.length ?? 0) > 1, true);
    },

    [INTERNAL_CLIPBOARD_CAN_PASTE](target, options) {
      if (!buffer) return EMPTY_CLIPBOARD;
      if (pasteRuntime.canReplaceBufferedSource(buffer, target, options)) return OK;
      return pasteRuntime.canPastePayload(buffer.payload, target, options, (buffer.sources?.length ?? 0) > 1, true);
    },
  };
}
