import type * as z from "zod";
import { readAt, tryParsePointer, type Pointer } from "../../../foundation/pointer/index.js";
import type { ApplyResult, JSONPatchOperation } from "../../../foundation/patch/index.js";
import { isPlainStructuralSchema } from "../../schema/model/schema.js";
import {
  paste,
  rekeyProducesTrustedPayload,
  resolvePasteArgs,
  type PasteOptions,
  type PasteTarget,
} from "../../clipboard/paste.js";
import {
  capabilityResult,
  type CapabilityResult,
} from "../capabilities/result.js";
import type { JSONStateOps } from "../state/ops.js";
import type { PreviewedDocumentPatchResult } from "../state/patch.js";
import type {
  ClipboardBuffer,
  ClipboardPasteResult,
  JSONDocumentPasteTarget,
} from "./contract.js";

interface CreateClipboardPasteRuntimeOptions<S extends z.ZodType> {
  schema: S;
  getState(): z.output<S>;
  getRevision?: (() => number) | undefined;
  ops: JSONStateOps<z.output<S>>;
  previewPatch?: ((operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>) | undefined;
  previewTrustedValuesPatch?: ((operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>) | undefined;
  applyPreviewedPatch?: ((
    prepared: ApplyResult<z.ZodTypeAny>,
    operations: ReadonlyArray<JSONPatchOperation>,
  ) => PreviewedDocumentPatchResult) | undefined;
  getSelectionTarget?: (() => Pointer | null) | undefined;
  getAppliedPatch?: (() => ReadonlyArray<JSONPatchOperation>) | undefined;
}

export interface ClipboardPasteRuntime<T> {
  pastePayload(
    payload: unknown,
    target: PasteTarget | undefined,
    options: PasteOptions | undefined,
    spreadByDefault: boolean,
    trustedPayload: boolean,
  ): ClipboardPasteResult<T>;
  canPastePayload(
    payload: unknown,
    target: PasteTarget | undefined,
    options: PasteOptions | undefined,
    spreadByDefault: boolean,
    trustedPayload: boolean,
  ): CapabilityResult;
  canReplaceBufferedSource(
    buffer: ClipboardBuffer | null,
    target: JSONDocumentPasteTarget | undefined,
    options: PasteOptions | undefined,
  ): boolean;
}

export function createClipboardPasteRuntime<S extends z.ZodType>(
  options: CreateClipboardPasteRuntimeOptions<S>,
): ClipboardPasteRuntime<z.output<S>> {
  const {
    schema,
    getState,
    getRevision,
    ops,
    previewPatch,
    previewTrustedValuesPatch,
    applyPreviewedPatch,
    getSelectionTarget,
    getAppliedPatch,
  } = options;

  function pasteExecutionOptions(
    pasteOptions: PasteOptions,
    spreadByDefault: boolean,
    trustedPayload: boolean,
  ): PasteOptions & {
    previewPatch?: (operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>;
  } {
    const nextTrustedPayload = trustedPayload || pasteOptions.trustedPayload === true;
    const patchValuesTrusted = nextTrustedPayload || rekeyProducesTrustedPayload(pasteOptions);
    const executionOptions: PasteOptions & {
      previewPatch?: (operations: ReadonlyArray<JSONPatchOperation>) => ApplyResult<S>;
    } = {
      ...pasteOptions,
      spread: pasteOptions.spread ?? spreadByDefault,
      trustedPayload: nextTrustedPayload,
    };
    const pastePreview = patchValuesTrusted && previewTrustedValuesPatch
      ? previewTrustedValuesPatch
      : previewPatch;
    if (pastePreview !== undefined) executionOptions.previewPatch = pastePreview;
    return executionOptions;
  }

  function resolvePasteTarget(
    targetOrSelectionTarget: PasteTarget | undefined,
    pasteOptions: PasteOptions | undefined,
  ) {
    const args = resolvePasteArgs(targetOrSelectionTarget, pasteOptions);
    const target = args.target ?? getSelectionTarget?.() ?? null;
    return target === null
      ? {
          ok: false as const,
          result: {
            ok: false as const,
            code: "empty_selection" as const,
            reason: "paste target selection is empty",
          },
        }
      : { ok: true as const, args, target };
  }

  return {
    pastePayload(payload, targetOrSelectionTarget, options, spreadByDefault, trustedPayload) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const baseRevision = getRevision?.();
        const resolved = resolvePasteTarget(targetOrSelectionTarget, options);
        if (!resolved.ok) return resolved.result;
        const result = paste(
          schema,
          getState(),
          payload,
          resolved.target,
          resolved.args.mode,
          pasteExecutionOptions(resolved.args.options, spreadByDefault, trustedPayload),
        );
        if (baseRevision !== undefined && getRevision?.() !== baseRevision) continue;
        if (!result.ok) return result;
        const publication: PreviewedDocumentPatchResult = applyPreviewedPatch
          ? applyPreviewedPatch(result.prepared, result.patch)
          : { status: "applied", result: ops.patch(result.patch) };
        if (publication.status === "stale") continue;
        const patchResult = publication.result;
        if (!patchResult.ok) {
          return {
            ok: false,
            code: patchResult.code,
            reason: patchResult.reason ?? patchResult.code,
          };
        }
        const applied = getAppliedPatch?.() ?? result.patch;
        // target: 첫 착지 slot (applied 는 정규화된 concrete op — `/-` 없음).
        const first = applied[0];
        return {
          ok: true,
          value: getState(),
          applied,
          target: first !== undefined && first.op !== "remove" && first.op !== "test" ? first.path : null,
        };
      }
      throw new Error("state changed repeatedly while preparing paste");
    },

    canPastePayload(payload, targetOrSelectionTarget, options, spreadByDefault, trustedPayload) {
      const resolved = resolvePasteTarget(targetOrSelectionTarget, options);
      if (!resolved.ok) return resolved.result;
      return capabilityResult(paste(
        schema,
        getState(),
        payload,
        resolved.target,
        resolved.args.mode,
        pasteExecutionOptions(resolved.args.options, spreadByDefault, trustedPayload),
      ));
    },

    canReplaceBufferedSource(buffer, target, options) {
      if (!buffer) return false;
      const replaceTarget = typeof target === "object" && target !== null && "replace" in target ? target.replace : null;
      const replaceSegments = replaceTarget === null ? null : tryParsePointer(replaceTarget);
      return buffer.schemaTrusted
        && buffer.source !== null
        && (buffer.sources?.length ?? 1) === 1
        && options?.rekey === undefined
        && options?.spread !== true
        && isPlainStructuralSchema(schema)
        && replaceTarget === buffer.source
        && replaceSegments !== null
        && readAt(getState(), replaceSegments).ok;
    },
  };
}
